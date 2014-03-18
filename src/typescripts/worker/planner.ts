/// <reference path='../dts/Q.d.ts'/>

declare var openDatabase;
declare var require;

var ready = Q.defer<boolean>();
var readyPromise = ready.promise;
var stash = [];

var EVENTS = {
    search: "search"
};

var CONFIG = null;

require(["db/storage", "utils/tdsp/tdsp"], function(Storage, tdsp) {
    ready.resolve(true);
    stash.forEach((msg) => {
        receive(msg, {
            Storage: Storage,
            tdsp: tdsp
        });
    });
    stash = [];
    ready.resolve(true);
    self.addEventListener('message', function(e) {
        receive(JSON.parse(e.data), {
            Storage: Storage,
            tdsp: tdsp
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
        console.log("Let's starting !");
        search(msg.vsId, msg.veId, msg.vsTripId, msg.ts, deps).then((results:any) => {
            (<any>self).postMessage(JSON.stringify({
                event: msg.event,
                data: results
            }));
        }).fail((reason) => {
            console.log(reason);
        });
        break;
    }
    default: break;
    }
}

function search(vsId: string, veId: string, vsTripId: string, ts: number, deps:any): Q.Promise<any> {
    var tdspGraph = deps.Storage.tdspGraph();
    var exceptions = deps.Storage.exceptions();
    return deps.tdsp.lookForBestTrip(tdspGraph, vsId, veId, vsTripId, ts, exceptions);
}