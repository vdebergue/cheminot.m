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
    reply: function (id: string, data: any): Q.Promise<any> {
        var d = Q.defer<any>();
        var value = JSON.stringify(data);
        (<any>self).postMessage(value);
        pendings[id] = value;
        return d.promise.fin(() => {
            delete pendings[id];
        });
    },
    debug: function (message: string): void {
        return this.reply(EVENTS.debug, {
            event: EVENTS.debug,
            data: message
        });
    },
    query: function (name, params: any[] = []): Q.Promise<any> {
        return this.reply(EVENTS.query, {
            event: EVENTS.query,
            data: {
                name: name,
                params: params
            }
        });
    },
    progress: function(result: any): Q.Promise<any> {
        return this.reply(EVENTS.progress, {
            event: EVENTS.progress,
            data: result
        });
    },
    end: function(results: any): Q.Promise<any> {
        return this.reply(EVENTS.end, {
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
        return Protocol.query('tripsByIds');
    },
    tdspGraph: function(): any {
        return Protocol.query('tdspGraph');
    },
    exceptions: function(): any {
        return Protocol.query('exceptions');
    }
};

require(["utils/tdsp/tdsp", "utils/utils"], function(tdsp, utils) {
    ready.resolve(true);
    stash.forEach((msg) => {
        receive(msg, {
            tdsp: tdsp,
            utils: utils
        });
    });
    stash = [];
    ready.resolve(true);
    self.addEventListener('message', function(e) {
        receive(JSON.parse(e.data), {
            tdsp: tdsp,
            utils: utils
        });
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
        run(msg.vsId, msg.veId, msg.stopTimes, msg.max, msg.config, deps);
        break;
    }
    case EVENTS.query: {
        pendings[msg.name].resolve(msg.data);
    }
    default: break;
    }
}

function run(vsId: string, veId: string, stopTimes, max: number, config: any, deps): Q.Promise<any> {
    return STORAGE.installDB(config, () => {}).then(() => {
        var tdspGraph = STORAGE.tdspGraph();
        var exceptions = STORAGE.exceptions();
        var limit = max;
        return deps.utils.sequencePromises(stopTimes, (st) => {
            if(limit > 0) {
                return deps.tdsp.lookForBestTrip(tdspGraph, vsId, veId, st.tripId, st.departureTime, exceptions, Protocol.debug).then((result) => {
                    --limit;
                    Protocol.progress(result);
                    return result;
                }).catch((reason) => {
                    Protocol.debug(reason);
                });
            } else {
                return deps.utils.Promise.DONE();
            }
        }).then((results) => {
            Protocol.end(results);
        }).catch((reason) => {
            Protocol.end({
                event: EVENTS.end,
                error: reason,
                data: null
            });
        });
    });
}