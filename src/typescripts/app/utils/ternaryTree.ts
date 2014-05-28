/// <reference path='../../dts/Q.d.ts'/>

import seq = require('lib/immutable/List');
import opt = require('lib/immutable/Option');

function suggestions(maybeNode: opt.IOption<any>, limit: number): seq.IList<any> {
    return maybeNode.map((node) => {
        var onLeft = suggestions(opt.Option(node.left), limit);
        var onRight = suggestions(opt.Option(node.right), limit);
        var onEq = suggestions(opt.Option(node.eq), limit);
        var results = seq.List<any>();
        if(node.isEnd) {
            results = results.appendOne(node.data);
        }
        return results.append(onLeft).append(onRight).append(onEq);
    }).getOrElse(() => {
        return new seq.Nil<any>();
    });
}

export function search(term: string, tree: any, limit: number): seq.IList<any> {
    function step(term: string, maybeNode: opt.IOption<any>, results: seq.IList<any>): seq.IList<any> {
        return maybeNode.map((node) => {
            var word = seq.fromArray(term.split(''));
            if(!word.isEmpty()) {
                var h = word.head();
                var isLast = word.tail().isEmpty();
                if(h < node.c) {
                    return step(term, opt.Option(node.left), results);
                } else if(h > node.c) {
                    return step(term, opt.Option(node.right), results);
                } else {
                    if(isLast) {
                        if(node.isEnd) {
                            results = results.appendOne(node.data);
                        }
                        return results.append(suggestions(opt.Option(node.eq), limit));
                    } else {
                        return step(word.tail().mkString(''), opt.Option(node.eq), results);
                    }
                }
            } else {
                return results;
            }
        }).getOrElse(() => {
            return results;
        });
    }
    return step(term, opt.Option(tree), new seq.Nil<any>());
}
