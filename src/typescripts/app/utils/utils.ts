/// <reference path='../../dts/Q.d.ts'/>

import seq = require('lib/immutable/List');
import opt = require('lib/immutable/Option');

var DEBUG: boolean = true;

export function flattenOptionPromise<T>(maybePromise: opt.IOption<Q.Promise<T>>): Q.Promise<opt.IOption<T>> {
    return maybePromise.map((p) => {
        return p.then((t) => {
            return new opt.Some<T>(t);
        });
    }).getOrElse(() => {
        return Q(new opt.None<T>());
    });
}

export function sequencePromises<T>(seq: Array<T>, f: (t: T) => Q.Promise<T>): Q.Promise<Array<T>> {
    if(seq.length === 0) {
        return Q([]);
    } else {
        var h = seq[0];
        var t = seq.slice(1);
        return f(h).then<Array<T>>((t1) => {
            return sequencePromises(t, f).then((t2) => {
                return [t1].concat(t2)
            });
        });
    }
}

export function error<A>(message: A) {
    if(DEBUG) {
        if(isMobile()) {
            alert('ERROR ' + message);
        } else {
            console.log(message);
        }
    }
}

export function log<A>(message: A) {
    if(DEBUG) {
        if(isMobile()) {
            alert('INFO : ' + message);
        } else {
            console.log(message);
        }
    }
}

export function measureF<T>(f: () => Q.Promise<T>, id: string = ''): Q.Promise<T> {
    var start = Date.now();
    var promise = f();
    return promise.then((t) => {
        var end = Date.now();
        var result = (end - start) / 1000;
        log('[' + id + '] ' + result + 's');
        return t;
    });
}

export function isMobile() { 
    if(navigator.userAgent.match(/Android/i) ||
       navigator.userAgent.match(/webOS/i) ||
       navigator.userAgent.match(/iPhone/i) ||
       navigator.userAgent.match(/iPad/i) ||
       navigator.userAgent.match(/iPod/i) ||
       navigator.userAgent.match(/BlackBerry/i) ||
       navigator.userAgent.match(/Windows Phone/i)){
        return true;
    } else {
        return false;
    }
}