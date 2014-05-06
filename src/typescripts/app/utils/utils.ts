/// <reference path='../../dts/Q.d.ts'/>

import seq = require('lib/immutable/List');
import opt = require('lib/immutable/Option');

declare var cordova;

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

export function parPromises<T>(seq: Array<Q.Promise<T>>): Q.Promise<Array<T>> {
    var d = Q.defer<Array<T>>();
    var fullfilled = [];
    var toFullFill = seq.length;

    seq.forEach((f, i) => {
        f.then((t) => {
            fullfilled[i] = t;
        }).fail((reason) => {
            fullfilled[i] = reason;
        }).fin(() => {
            toFullFill -= 1;
            if(toFullFill <= 0) {
                d.resolve(fullfilled);
            }
        });
    });
    return d.promise;
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

export function oops(message: string): void {
    throw new Error(message);
}

export function error<A>(message: A) {
    if(DEBUG) {
        if(isMobile() && self.alert) {
            alert('ERROR ' + message);
        } else if(self.console) {
            console.error(message);
        }
    }
}

export function log<A>(message: A) {
    if(DEBUG) {
        if(isMobile() && self.alert) {
            alert('INFO : ' + message);
        } else if(self.console) {
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
       navigator.userAgent.match(/BlackBerry/i) ||
       navigator.userAgent.match(/Windows Phone/i) ||
       isAppleMobile()) {
        return true;
    } else {
        return false;
    }
}

export function isAppleMobile() {
    return navigator.userAgent.match(/iPhone/i) ||
        navigator.userAgent.match(/iPad/i) ||
        navigator.userAgent.match(/iPod/i);
}

export function isAndroid() {
    return navigator.userAgent.match(/Android/i);
}

export function cssValue(value: string): number {
    return parseInt(value.replace(/[^-\d\.]/g, ''), 10);
}

export function isIOS7() {
    return isAppleMobile() && navigator.userAgent.match(/OS 7/);
}

export function isEmulator(): boolean {
    return !window['cordova']
}

export function showKeyboard($el: ZeptoCollection) {
    if(isAndroid()) {
        cordova.plugins.SoftKeyboard.show();
    }
    $el.focus();
}

export function hideKeyboard() {
    if(isAndroid()) {
        cordova.plugins.SoftKeyboard.hide();
    }
}

export class Promise {

    static DONE(): Q.Promise<void> {
        return Q<void>(null);
    }

    static pure<T>(t: T): Q.Promise<T> {
        return Q<T>(t);
    }
}

export class Transition {

    static transitionEnd(): string {
        var transitionend = "transitionend"
        if( 'WebkitTransition' in document.body.style
            && !("OTransition" in document.body.style) ) {
            transitionend = 'webkitTransitionEnd';
        }
        return transitionend;
    }

    static spy(el: any): Q.Promise<void> {
        var d = Q.defer<void>();
        $(el).one(Transition.transitionEnd(), () => {
            d.resolve(null);
            return true;
        });
        return d.promise;
    }
}