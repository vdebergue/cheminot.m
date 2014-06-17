/// <reference path='../dts/Q.d.ts'/>

declare var openDatabase;
declare var require;

var ready = Q.defer<boolean>();
var readyPromise = ready.promise;
var stash = [];

var EVENTS = {
    search: "search",
    end: "end",
    debug: "debug"
};

var CONFIG = null;

require(["db/storage", "utils/tdsp/tdsp", "utils/utils"], function(Storage, tdsp, utils) {
    ready.resolve(true);
    stash.forEach((msg) => {
        receive(msg, {
            Storage: Storage,
            tdsp: tdsp,
            utils: utils
        });
    });
    stash = [];
    ready.resolve(true);
    self.addEventListener('message', function(e) {
        receive(JSON.parse(e.data), {
            Storage: Storage,
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

function reply(data: any) {
    (<any>self).postMessage(JSON.stringify(data));
}

function debug(message: string) {
    (<any>self).postMessage(JSON.stringify({
        event: EVENTS.debug,
        data: message
    }));
}

function receive(msg: any, deps: any) {
    switch(msg.event) {
    case EVENTS.search: {
        debug("Let's starting !");
        run(msg.vsId, msg.veId, msg.stopTimes, msg.max, msg.config, deps);
        break;
    }
    default: break;
    }
}

function run(vsId: string, veId: string, stopTimes, max: number, config: any, deps): Q.Promise<any> {
    return deps.Storage.installDB(config, () => {}).then(() => {
        var tdspGraph = deps.Storage.tdspGraph();
        var exceptions = deps.Storage.exceptions();
        var limit = max;
        return deps.utils.sequencePromises(stopTimes, (st) => {
            if(limit > 0) {
                return deps.tdsp.lookForBestTrip(tdspGraph, vsId, veId, st.tripId, st.departureTime, exceptions, debug).then((result) => {
                    --limit;
                    return result;
                }).catch((reason) => {
                    debug(reason);
                });
            } else {
                return deps.utils.Promise.DONE();
            }
        }).then((results) => {
            reply({
                event: EVENTS.end,
                data: results.filter((x) => {
                    return x != null;
                })
            });
        }).catch((reason) => {
            reply({
                event: EVENTS.end,
                error: reason,
                data: null
            });
        });
    });
}