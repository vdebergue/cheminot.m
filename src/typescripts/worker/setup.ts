/// <reference path='../dts/Q.d.ts'/>

declare var openDatabase;
declare var require;

var ready = Q.defer<boolean>();
var readyPromise = ready.promise;
var stash = [];

var EVENTS = {
    install: "install",
    config: 'config',
    end: 'end'
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

function reply(data: any) {
    (<any>self).postMessage(JSON.stringify(data));
}

function receive(msg: any, Storage) {
    switch(msg.event) {
    case EVENTS.config: {
        CONFIG = msg.data
        break;
    }
    case EVENTS.install: {
        console.log(JSON.stringify(CONFIG));
        Storage.forceInstallDB(CONFIG, Storage.impl(), (event, data) => {
            reply({
                event: event,
                data: data
            });
        }).then(() => {
            reply({
                event: EVENTS.end
            });
        });
        break;
    }
    }
}