/// <reference path='../../dts/Q.d.ts'/>
/// <reference path='../../dts/zepto.d.ts'/>

import App = require('../application');
import Storage = require('../db/storage');
import seq = require('lib/immutable/List');
import opt = require('lib/immutable/Option');
import IView = require('./IView');
import View = require('./View');
import Templating = require('./templating')
import utils = require('../utils/utils')
import TernaryTree = require('../utils/ternaryTree');

declare var tmpl;
declare var IScroll;

export = Home;

class Home extends View implements IView {

    name: string;
    myIScroll: any;

    constructor(container: string, scope: string) {
        this.name = 'home';
        super(container, scope);
    }

    setup(): Q.Promise<void> {
        return super.ensure(Templating.home.layout).then(() => {
            this.bindEvents();
            this.initIScroll();
        });
    }

    initIScroll(): void {
        this.myIScroll = new IScroll('#wrapper');
    }

    adaptSuggestionsHeight(): void {
        var htmlOffset = $('html').offset();
        var headerOffset = $('header').offset();
        var searchOffset = this.$scope().find('.search').offset();
        var height = htmlOffset.height - headerOffset.height - searchOffset.height;
        $('.stations').css('height', height);
    }

    bindEvents(): void {
        super.bindEvent('keyup', 'input[name=start], input[name=end]', this.onStationKeyUp);
        super.bindEvent('blur', 'input[name=start], input[name=end]', this.onStationBlur);
        super.bindEvent('focus', 'input[name=start], input[name=end]', this.onStationFocus);
        super.bindEvent('tap', '.suggestions > li', this.onSuggestionSelected);
        super.bindEvent('tap', 'button', this.onDaySelected);
    }

    reset(): void {
        //Do nothing!
    }

    show(): Q.Promise<void> {
        return Templating.home.header().then((tpl) => {
            this.header.update(tpl);
            super.showView();
            this.adaptSuggestionsHeight();
        });
    }

    hide(): Q.Promise<void> {
        this.$scope().addClass('hidden')
        return Q<void>(null);
    }

    suggest(suggestions: seq.IList<any>): Q.Promise<void> {
        var $scope = super.$scope();
        var $suggestions = $scope.find('.suggestions');
        $suggestions.empty();
        if(!suggestions.isEmpty()) {
            $scope.find('.stations').addClass('searching');
        }
        return Templating.home.suggestions().then((t) => {
            var data = suggestions.map((s) => {
                return {
                    name: s.name
                };
            });
            var dom = tmpl(t, { stations: data });
            $suggestions.html(dom);
            this.myIScroll.refresh();
        });
    }

    onStationKeyUp(e: Event): boolean {
        var stopsTree = Storage.stops();
        var $scope = super.$scope();
        var $input = $(e.currentTarget);
        var term = $input.val();
        if(term.trim() === '') {
            this.clearSuggestions();
        } else {
            var founds = TernaryTree.search(term.toLowerCase(), stopsTree, 20);
            this.suggest(founds);
        }
        return true;
    }

    clearSuggestions(): void {
        var $scope = this.$scope();
        $scope.find('.stations').removeClass('searching');
        $scope.find('.suggestions').empty();
    }

    onceSelected(name: string): void {
        console.log('onceSelected');
        var $suggestions = this.$scope().find('.suggestions');
        if($suggestions.is('.start')) {
            $suggestions.attr('data-start', name);
            var $start = this.$scope().find('[name=start]');
            $start.val(name);
            $start.siblings('[name=end]').get(0).focus();
            this.clearSuggestions();
        } else if($suggestions.is('.end')) {
            $suggestions.attr('data-end', name);
            this.$scope().find('[name=end]').val(name);
            this.clearSuggestions();
        }
        this.lookForTrip();
    }

    onStationFocus(e: Event): boolean {
        var $input = $(e.currentTarget);
        var $suggestions = this.$scope().find('.suggestions');
        if($input.is('[name=start]')) {
            $suggestions.removeClass('end').addClass('start');
        } else {
            $suggestions.removeClass('start').addClass('end');
        }
        return true;
    }

    onStationBlur(e: Event): boolean {
        var $input = $(e.currentTarget);
        var $suggestions = this.$scope().find('.suggestions');
        var justSelected = false;
        if($suggestions.is('.start')) {
            justSelected = !!$suggestions.attr('data-start');
        } else if($suggestions.is('.end')) {
            justSelected = !!$suggestions.attr('data-end');
        }
        if(!justSelected) {
            var name = this.$scope().find('.suggestions li:first-child').text();
            $input.val(name);
            this.onceSelected(name);
        }
        return true;
    }

    onSuggestionSelected(e: Event): boolean {
        var $suggestion = $(e.currentTarget);
        var name = $suggestion.attr('data-name');
        this.onceSelected(name);
        return true;
    }

    lookForTrip(): void {
        var $suggestions = this.$scope().find('.suggestions');
        opt.Option<any>($suggestions.attr('data-start')).foreach((start) => {
            opt.Option<any>($suggestions.attr('data-end')).foreach((end) => {
                //App.navigateToTimetable(start, end);
                console.log('navigateTo', start, end);
            });
        });
    }

    onDaySelected(e: Event): boolean {
        var $btn = $(e.currentTarget);
        $btn.siblings('button.active').removeClass('active');
        $btn.addClass('active');
        return true;
    }
}
