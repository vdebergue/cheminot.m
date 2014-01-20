/// <reference path='../../dts/Q.d.ts'/>
/// <reference path='../../dts/zepto.d.ts'/>

import App = require('../application');
import Storage = require('../db/storage');
import seq = require('lib/immutable/List');
import opt = require('lib/immutable/Option');
import IView = require('./IView');
import View = require('./View');
import Templating = require('./templating')
import utils = require('../utils/utils');
import TernaryTree = require('../utils/ternaryTree');

declare var tmpl;
declare var IScroll;
declare var Zanimo;

export = Home;

class Home extends View implements IView {

    name: string;
    myIScroll: any;

    constructor(container: string, scope: string, name: string) {
        this.name = name;
        super(container, scope);
    }

    setup(): Q.Promise<IView> {
        return super.ensure(Templating.home.layout).then(() => {
            this.bindEvents();
            return this;
        });
    }

    initIScroll(): void {
        this.myIScroll = new IScroll('#home #wrapper');
    }

    adaptSuggestionsHeight(): void {
        var $scope = this.$scope();
        var htmlOffset = $('html').offset();
        var headerOffset = $('header').offset();
        var viewOffset = $scope.offset();
        var titleHeight = 44;
        var ios7Offset = utils.isIOS7() ? 20 : 0;
        var height = htmlOffset.height - headerOffset.height - viewOffset.height - titleHeight - ios7Offset;
        $scope.find('#wrapper').css('height', height);
    }

    bindEvents(): void {
        super.bindEvent('keyup', 'input[name=start], input[name=end]', this.onStationKeyUp);
        super.bindEvent('focus', 'input[name=start], input[name=end]', this.onStationFocus);
        super.bindEvent('tap', '.suggestions > li', this.onSuggestionSelected);
        super.bindEvent('tap', '.when .btn:not(.go)', this.onDaySelected);
        super.bindEvent('tap', '.when .btn.go', this.onTripAndScheduleSelected);
        super.bindEvent('touchstart', '.suggestions', this.onScrollingStops);
    }

    show(): Q.Promise<void> {
        return Templating.home.header().then((tpl) => {
            this.header.update(tpl);
            super.showView();
            this.adaptSuggestionsHeight();
            this.initIScroll();
        });
    }

    suggest(term: string, suggestions: seq.IList<any>): Q.Promise<void> {
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
            var dom = tmpl(t, { term: term, stations: data });
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
            this.suggest(term, founds);
        }
        return true;
    }

    clearSuggestions(): void {
        var $scope = this.$scope();
        $scope.find('.stations').removeClass('searching');
        $scope.find('.suggestions').empty();
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

    onScrollingStops(e: Event): boolean {
        this.$scope().find('input[name=start], input[name=end]').blur();
        return true;
    }

    onSuggestionSelected(e: Event): boolean {
        var $suggestion = $(e.currentTarget);
        var name = $suggestion.attr('data-name');
        this.onceSelected(name);
        return true;
    }

    onceSelected(name: string): void {
        var $suggestions = this.$scope().find('.suggestions');
        if($suggestions.is('.start')) {
            this.fillSelectedStart(name);
            this.$scope().find('input[name=start]').blur();
            this.clearSuggestions();
        } else if($suggestions.is('.end')) {
            this.fillSelectedEnd(name);
            this.clearSuggestions();
        }

        this.maybeSelectedStart().foreach((start) => {
            this.maybeSelectedEnd().foreach((end) => {
                App.navigateToHomeWhen(start, end);
            });
        });
    }

    when(): number {
        var timestamp = this.$scope().find('.when .active').attr('data-date');
        return parseInt(timestamp, 10);
    }

    fillSelectedStart(start: string): void {
        this.$scope().find('.suggestions').attr('data-start', start);
        this.$scope().find('input[name=start]').val(start);
    }

    fillSelectedEnd(end: string): void {
        this.$scope().find('.suggestions').attr('data-end', end);
        this.$scope().find('input[name=end]').val(end);
    }

    maybeSelectedStart(): opt.IOption<string> {
        var $suggestions = this.$scope().find('.suggestions');
        return opt.Option<any>($suggestions.attr('data-start'));
    }

    maybeSelectedEnd(): opt.IOption<string> {
        var $suggestions = this.$scope().find('.suggestions');
        return opt.Option<any>($suggestions.attr('data-end'));
    }

    onTripAndScheduleSelected(e: Event): boolean {
        this.maybeSelectedStart().flatMap((start) => {
            return this.maybeSelectedEnd().map((end) => {
                App.navigateToTimetable(start, end, this.when());
            });
        }).getOrElse(() => {
            utils.oops('Unable to find start & end in order to go to timetable.');
        });
        return true;
    }

    displayWhen(start: string, end: string) {
        this.fillSelectedStart(start);
        this.fillSelectedEnd(end);
        var $when = this.$scope().find('.when');
        setTimeout(() => {
            var viewOffset = this.$scope().offset();
            var ios7Offset = utils.isIOS7() ? 20 : 0;
            var translate = viewOffset.top + viewOffset.height - ios7Offset;
            Zanimo.transform($when.get(0), 'translate3d(0,'+ translate + 'px,0)').then(() => {
                window.setTimeout(() => {
                    $when.addClass('done');
                }, 120);
            });
        }, 120);
    }

    onDaySelected(e: Event): boolean {
        var $btn = $(e.currentTarget);
        $btn.siblings('.btn.active').removeClass('active');
        $btn.addClass('active');
        return true;
    }
}
