/// <reference path='../../dts/Q.d.ts'/>

import seq = require('lib/immutable/List');
import opt = require('lib/immutable/Option');

export function flattenOptionPromise<T>(maybePromise: opt.IOption<Q.Promise<T>>): Q.Promise<opt.IOption<T>> {
    return maybePromise.map((p) => {
        return p.then((t) => {
            return new opt.Some<T>(t);
        });
    }).getOrElse(() => {
        return Q(new opt.None<T>());
    });
}

export function sequencePromises<T>(promises: seq.IList<Q.Promise<T>>): Q.Promise<seq.IList<T>> {
    function step(promises: seq.IList<Q.Promise<T>>, acc: Q.Promise<seq.IList<T>>): Q.Promise<seq.IList<T>> {
        if(promises.isEmpty()) {
            return acc;
        } else {
            return promises.head().then<seq.IList<T>>((h) => {
                return acc.then<seq.IList<T>>((xxx) => {
                    var accumulated: Q.Promise<seq.IList<T>> = Q<seq.IList<T>>(xxx.prependOne(h));
                    var t: seq.IList<Q.Promise<T>> = promises.tail();
                    return step(t, accumulated);
                });
            });
        }
    }
    return step(promises, Q(new seq.Nil<T>()))
}

export function error(message: string) {
    console.error(message);
}

export function measureF<T>(f: () => Q.Promise<T>): Q.Promise<T> {
    var start = Date.now();
    var promise = f();
    return promise.then((t) => {
        var end = Date.now();
        console.log(end - start);
        return t;
    });
}