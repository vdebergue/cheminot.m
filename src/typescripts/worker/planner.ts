/// <reference path='../dts/Q.d.ts'/>

declare var openDatabase;
declare var require;

var ready = Q.defer<boolean>();
var readyPromise = ready.promise;
var stash = [];

var EVENTS = {
    search: "search",
    end: "end"
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

function receive(msg: any, deps: any) {
    switch(msg.event) {
    case EVENTS.search: {
        console.log("Let's starting !");
        run(msg.vsId, msg.veId, msg.stopTimes, msg.config, deps);
        break;
    }
    default: break;
    }
}

function run(vsId: string, veId: string, stopTimes, config: any, deps): Q.Promise<any> {
    return deps.Storage.installDB(config, () => {}).then(() => {

        var tdspGraph = deps.Storage.tdspGraph();
        var exceptions = deps.Storage.exceptions();

        return deps.utils.sequencePromises(stopTimes, (st) => {
            return deps.tdsp.lookForBestTrip(tdspGraph, vsId, veId, st.tripId, st.departureTime, exceptions).fail(() => {});
        }).then((results) => {
            reply({
                event: EVENTS.end,
                data: results
            });
        }).fail((reason) => {
            reply({
                event: EVENTS.end,
                data: null
            });
        });
    });
}