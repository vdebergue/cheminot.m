/// <reference path='../dts/Q.d.ts'/>

declare var openDatabase;
declare var require;

var ready = Q.defer<boolean>();
var readyPromise = ready.promise;
var stash = [];

var CONFIG = null;

require([], function() {
    ready.resolve(true);
    stash.forEach((msg) => {
        console.log(msg);
    });
    stash = [];
    ready.resolve(true);
    self.addEventListener('message', function(e) {
        console.log('hip');
    });
});

self.addEventListener('message', function(e) {
    stash.push(e.data);
    if(readyPromise.isFulfilled()) {
        self.removeEventListener('message', this, false);
    }
}, false);
