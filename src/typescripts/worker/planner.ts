/// <reference path='../dts/Q.d.ts'/>

declare var openDatabase;
declare var require;

var ready = Q.defer<boolean>();
var readyPromise = ready.promise;
var stash = [];
var pendings = {};

var EVENTS = {
    search: "search",
    end: "end",
    progress: "progress",
    query: "query",
    debug: "debug"
};

var Protocol = {
    ask: function (id: string, data: any): Q.Promise<any> {
        var d = Q.defer<any>();
        var value = JSON.stringify(data);
        pendings[id] = d;
        (<any>self).postMessage(value);
        return Q.timeout(d.promise, 6000).finally(() => {
            delete pendings[id];
        });
    },
    tell: function (data: any): void {
        var d = Q.defer<any>();
        var value = JSON.stringify(data);
        (<any>self).postMessage(value);
    },
    debug: function (message: any): void {
        return this.tell({
            event: EVENTS.debug,
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
    installDB: function(config: any, progress: (string, any?) => void): Q.Promise<void> {
        return Protocol.query('installDB', [config, progress]);
    },
    tripsByIds: function(ids: string[]): Q.Promise<string[]> {
        return Protocol.query('tripsByIds', [ids]);
    },
    tdspGraph: function(): Q.Promise<any> {
        return Protocol.query('tdspGraph');
    },
    exceptions: function(): Q.Promise<any> {
        return Protocol.query('exceptions');
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
        receive(JSON.parse(e.data), deps);
    });
});

self.addEventListener('message', function(e) {
    stash.push(JSON.parse(e.data));
    if(readyPromise.isFulfilled()) {
        self.removeEventListener('message', this, false);
    }
}, false);

function receive(msg: any, deps: any) {
    switch(msg.event) {
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
    return STORAGE.installDB(config, () => {}).then(() => {
        return Q.spread<any>([STORAGE.tdspGraph(), STORAGE.exceptions()], (tdspGraph, exceptions) => {
            var next = true;
            return deps.utils.sequencePromises(stopTimes, (st) => {
                if(next) {
                    return deps.tdsp.lookForBestTrip(STORAGE, tdspGraph, vsId, veId, st.tripId, st.departureTime, exceptions, Protocol.debug).then((result) => {
                        return Protocol.progress('lookForBestTrip', result).then((onContinue) => {
                            next = onContinue;
                            return result;
                        });
                    }).catch((reason) => {
                        Protocol.debug(reason);
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
        }, (reason) => {
            Protocol.debug(reason);
            Protocol.tell({
                event: EVENTS.end,
                error: reason,
                data: null
            });
        });
    });
}