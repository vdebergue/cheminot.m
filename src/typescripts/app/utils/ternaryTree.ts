/// <reference path='../../dts/Q.d.ts'/>

import seq = require('lib/immutable/List');
import opt = require('lib/immutable/Option');
import tuple = require('lib/immutable/Tuple');

function suggestions(maybeNode: opt.IOption<any>): seq.IList<tuple.Tuple2<string, seq.IList<string>>> {
    return maybeNode.map((node) => {
        var onLeft = suggestions(opt.Option(node.left));
        var onRight = suggestions(opt.Option(node.right));
        var onEq = suggestions(opt.Option(node.eq));
        var results = seq.List<tuple.Tuple2<string, seq.IList<string>>>();
        if(node.isEnd) {
            console.log('end');
            results = results.appendOne(new tuple.Tuple2(node.data.stopName, seq.List.apply(node.data.tripIds)));
        }
        return results.append(onLeft).append(onRight).append(onEq);
    }).getOrElse(() => {
        return new seq.Nil<tuple.Tuple2<string, seq.IList<string>>>();
    });
}

export function search(term: string, tree: any): seq.IList<tuple.Tuple2<string, seq.IList<string>>> {
    function step(term: string, maybeNode: opt.IOption<any>, results: seq.IList<tuple.Tuple2<string, seq.IList<string>>>): seq.IList<tuple.Tuple2<string, seq.IList<string>>> {
        return maybeNode.map((node) => {
            var word = seq.List.apply(null, term.split(''));
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
                            results = results.appendOne(new tuple.Tuple2(node.data.stopName, seq.List(node.data.tripIds)));
                        }
                        return results.append(suggestions(opt.Option(node.eq)));
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
    return step(term, opt.Option(tree), new seq.Nil<tuple.Tuple2<string, seq.IList<string>>>());
}
