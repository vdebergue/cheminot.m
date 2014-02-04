/// <reference path='../dts/Q.d.ts'/>

declare var openDatabase;
declare var require;

var ready = Q.defer<boolean>();
var readyPromise = ready.promise;
var stash = [];

var messages = {
    install: "install",
    config: 'config'
};

var CONFIG = null;

require(["db/storage", "ws/api"], function(Storage, Api) {
    stash.forEach((msg) => {
        receive(msg, Storage);
    });
    stash = [];
    ready.resolve(true);
    self.addEventListener('message', function(e) {
        receive(JSON.parse(e.data), Storage);
    });
});

self.addEventListener('message', function(e) {
    stash.push(JSON.parse(e.data));
    if(readyPromise.isFulfilled()) {
        self.removeEventListener('message', this, false);
    }
}, false);

function receive(msg: any, Storage) {
    switch(msg.event) {
    case messages.config: {
        CONFIG = msg.data
        break;
    }
    case messages.install: {
        Storage.forceInstallDB(CONFIG, Storage.impl(), (event, data) => {
            (<any>self).postMessage(JSON.stringify({
                event: event,
                data: data
            }));
        }).fail((reason) => {
            console.log(reason);
        });
        break;
    }
    }
}