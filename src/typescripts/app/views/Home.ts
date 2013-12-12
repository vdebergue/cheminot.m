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

    suggest(suggestions: seq.IList<any>): void {
        var $suggestions = super.$scope().find('.suggestions');
        $suggestions.empty();
        suggestions.foreach((s) => {
            $suggestions.prepend('<li id="'+ s.id +'">'+ s.name +'</li>');
        });
    }

    onButtonClick(e: Event): boolean {
        console.log('haaa');
        return true;
    }

    onStartStopKeyUp(e: Event): boolean {
        var stopsTree = Storage.stops();
        var term = this.$scope().find('input[name=start]').val();
        var founds = TernaryTree.search(term.toLowerCase(), stopsTree, 20);
        founds.headOption().foreach((h) => {
            Storage.tripsByIds(h.tripIds || []).then((trips) => {
                console.log(trips);
            }).fail((e) => {
                console.error(e);
            });
        });
        this.suggest(founds);
        return true;
    }
}
