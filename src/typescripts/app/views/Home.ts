/// <reference path='../../dts/Q.d.ts'/>
/// <reference path='../../dts/zepto.d.ts'/>

import seq = require('lib/immutable/List');
import tuple = require('lib/immutable/Tuple');
import IView = require('./IView');
import View = require('./View');
import Templating = require('./templating')
import Storage = require('../db/storage');
import TernaryTree = require('../utils/ternaryTree');

export = Home;

class Home extends View implements IView {

    name: string;

    constructor(container: string, scope: string) {
        this.name = 'home';
        super(container, scope);
    }

    setup(): Q.Promise<void> {
        return super.ensure(Templating.home).then(() => {
            this.bindEvents();
        });
    }

    bindEvents(): void {
        this.header.bindEvent('click', 'button', this.onButtonClick)
        super.bindEvent('keyup', 'input[name=start]', this.onStartStopKeyUp);
    }

    show(): Q.Promise<void> {
        return Templating.header.home().then((tpl) => {
            this.header.update(tpl);
        });
    }

    hide(): Q.Promise<void> {
        return null;
    }

    suggest(suggestions: seq.IList<tuple.Tuple2<string, seq.IList<string>>>): void {
        var $suggestions = super.$scope().find('.suggestions');
        $suggestions.empty();
        suggestions.foreach((s) => {
            $suggestions.prepend('<li>'+ s._1 +'</li>');
        });
    }

    onButtonClick(e: Event): boolean {
        console.log('haaa');
        return true;
    }

    onStartStopKeyUp(e: Event): boolean {
        var db = <any>Storage.db();
        var term = this.$scope().find('input[name=start]').val();
        var stops = TernaryTree.search(term.toLowerCase(), db.treeStops, 20);
        this.suggest(stops);
        return true;
    }
}
