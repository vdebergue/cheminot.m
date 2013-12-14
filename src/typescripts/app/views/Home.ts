/// <reference path='../../dts/Q.d.ts'/>
/// <reference path='../../dts/zepto.d.ts'/>

import App = require('../application');
import Storage = require('../db/storage');
import seq = require('lib/immutable/List');
import opt = require('lib/immutable/Option');
import IView = require('./IView');
import View = require('./View');
import Templating = require('./templating')
import TernaryTree = require('../utils/ternaryTree');

export = Home;

class Home extends View implements IView {

    name: string;

    constructor(container: string, scope: string) {
        this.name = 'home';
        super(container, scope);
    }

    setup(): Q.Promise<void> {
        return super.ensure(Templating.home.layout).then(() => {
            this.bindEvents();
        });
    }

    bindEvents(): void {
        this.header.bindEvent('click', 'button', this.onButtonClick)
        super.bindEvent('keyup', 'input[name=start], input[name=end]', this.onStationKeyUp);
        super.bindEvent('click', '.suggestions > li', this.onSuggestionTouch);
    }

    show(): Q.Promise<void> {
        return Templating.home.header().then((tpl) => {
            this.header.update(tpl);
        });
    }

    hide(): Q.Promise<void> {
        return null;
    }

    suggest(suggestions: seq.IList<any>): void {
        var $scope = super.$scope();
        var $suggestions = $scope.find('.suggestions');
        $suggestions.empty();
        suggestions.foreach((s) => {
            $suggestions.prepend('<li id="'+ s.id +'">'+ s.name +'</li>');
            $suggestions.find('li:first-child').data('station-name', s.name);
        });
    }

    onButtonClick(e: Event): boolean {
        return true;
    }

    onStationKeyUp(e: Event): boolean {
        var stopsTree = Storage.stops();
        var $scope = super.$scope();
        var $input = $(e.currentTarget);
        var term = $input.val();
        if($input.is('[name=start]')) {
            $scope.find('.suggestions').removeClass('end').addClass('start');
        } else {
            $scope.find('.suggestions').removeClass('start').addClass('end');
        }
        var founds = TernaryTree.search(term.toLowerCase(), stopsTree, 20);
        this.suggest(founds);
        return true;
    }

    onSuggestionTouch(e: Event): boolean {
        var $suggestion = $(e.currentTarget);
        var $suggestions = $suggestion.parent();
        if($suggestions.is('.start')) {
            var name = $suggestion.data('station-name');
            $suggestions.data('start', name);
        } else if($suggestions.is('.end')) {
            var name = $suggestion.data('station-name');
            $suggestions.data('end', name);
        }
        opt.Option<any>($suggestions.data('start')).foreach((start) => {
            opt.Option<any>($suggestions.data('end')).foreach((end) => {
                App.navigateToTimetable(start, end);
            });
        });
        return true;
    }
}
