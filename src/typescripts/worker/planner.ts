/// <reference path='../dts/Q.d.ts'/>

declare var openDatabase;
declare var require;

var ready = Q.defer<boolean>();
var readyPromise = ready.promise;
var stash = [];
var pendings = {};

var cancelled = false;

function resetCancel(tdsp) {
    cancelled = false;
    tdsp.cancelled = false;
}

function setCancel(tdsp) {
    cancelled = true;
    tdsp.cancelled = true;
}

var EVENTS = {
    init: "init",
    search: "search",
    end: "end",
    progress: "progress",
    query: "query",
    debug: "debug",
    cancel: "cancel"
};


var cache = {};
var tdspGraph = null;
var exceptions = null;

var tripCacheKey = (id: string) => {
    return 'trip_' + id;
};

var Protocol = {
    ask: function (id: string, data: any): Q.Promise<any> {
        var d = Q.defer<any>();
        pendings[id] = d;
        (<any>self).postMessage(data);
        return d.promise.finally(() => {
            delete pendings[id];
        });
    },
    tell: function (data: any): void {
        (<any>self).postMessage(data);
    },
    debug: function (message: any): void {
        (<any>self).postMessage({
            event: 'debug',
            data: message
        });
    },
    query: function (name: string, params: any[] = []): Q.Promise<any> {
        return this.ask(name, {
            event: EVENTS.query,
            data: {
                name: name,
                params: params
            }
        });
    },
    progress: function(name: string, result: any): Q.Promise<any> {
        return this.ask(name, {
            event: EVENTS.progress,
            data: result
        });
    },
    end: function(results: any): void {
        this.tell({
            event: EVENTS.end,
            data: results.filter((x) => {
                return x != null;
            })
        });
    }
};

var CONFIG = null;

var STORAGE = {
    tripsByIds: function(ids: string[]): Q.Promise<any[]> {
        var toQuery = ids.filter((id) => {
            return !cache[tripCacheKey(id)];
        });

        return Protocol.query('tripsByIds', [toQuery]).then((trips) => {
            trips.forEach((trip) => {
                cache[tripCacheKey(trip.id)] = trip;
            });
            return ids.map((id) => {
                return cache[tripCacheKey(id)];
            });
        });
    }
};

require(["utils/tdsp/tdsp", "utils/utils"], function(tdsp, utils) {
    var deps = {
        tdsp: tdsp,
        utils: utils
    }

    ready.resolve(true);

    stash.forEach((msg) => {
        receive(msg, deps);
    });

    stash = [];

    self.addEventListener('message', function(e) {
        receive(e.data, deps);
    });
});

self.addEventListener('message', function(e) {
    stash.push(e.data);
    if(readyPromise.isFulfilled()) {
        self.removeEventListener('message', this, false);
    }
}, false);

function receive(msg: any, deps: any) {
    switch(msg.event) {
    case EVENTS.init: {
        tdspGraph = msg.data.tdspGraph;
        exceptions = msg.data.exceptions;
        Protocol.debug('Worker ready!');
        break;
    }
    case EVENTS.cancel: {
        setCancel(deps.tdsp);
        break;
    }
    case EVENTS.search: {
        Protocol.debug("Let's starting !");
        run(msg.vsId, msg.veId, msg.stopTimes, msg.config, deps);
        break;
    }
    case EVENTS.query: {
        if(pendings[msg.name]) {
            pendings[msg.name].resolve(msg.data);
        } else {
            Protocol.debug('No pending promise for ' + msg.name);
        }
    }
    case EVENTS.progress: {
        if(pendings[msg.name]) {
            pendings[msg.name].resolve(msg.data);
        } else {
            Protocol.debug('No pending promise for ' + msg.name);
        }
    }
    default: break;
    }
}

function run(vsId: string, veId: string, stopTimes, config: any, deps): Q.Promise<any> {
    var next = true;
    resetCancel(deps.tdsp);
    return deps.utils.sequencePromises(stopTimes, (st) => {
        if(next) {
            return deps.tdsp.lookForBestTrip(STORAGE, tdspGraph, vsId, veId, st.tripId, st.departureTime, exceptions, Protocol.debug).then((result) => {
                return Protocol.progress('lookForBestTrip', result).then((onContinue) => {
                    next = !cancelled && onContinue;
                    return result;
                });
            }).catch((reason) => {
                Protocol.debug(reason);
                Protocol.progress('lookForBestTrip', null);
            });
        } else {
            return deps.utils.Promise.DONE();
        }
    }).then((results) => {
        Protocol.end(results);
    }).catch((reason) => {
        Protocol.debug(reason);
        Protocol.tell({
            event: EVENTS.end,
            error: reason,
            data: null
        });
    });
}