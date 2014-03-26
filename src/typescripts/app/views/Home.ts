/// <reference path='../../dts/Q.d.ts'/>
/// <reference path='../../dts/zepto.d.ts'/>

import App = require('../application');
import Storage = require('../db/storage');
import seq = require('lib/immutable/List');
import opt = require('lib/immutable/Option');
import IView = require('./IView');
import View = require('./View');
import Schedule = require('./Schedule');
import Templating = require('./templating')
import utils = require('../utils/utils');
import TernaryTree = require('../utils/ternaryTree');

declare var tmpl;
declare var IScroll;

export = Home;

class Home extends View implements IView {

    name: string;
    myIScroll: any;
    scheduleView: Schedule;

    constructor(container: string, scope: string, name: string) {
        this.name = name;
        this.scheduleView = new Schedule('#home', '#schedule', 'schedule');
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

    bindEvents(): void {
        super.bindEvent('keyup', 'input[name=start], input[name=end]', this.onStationKeyUp);
        super.bindEvent('focus', 'input[name=start], input[name=end]', this.onStationFocus);
        super.bindEvent('tap', '.search .reset', this.onInputReset);
        super.bindEvent('tap', '.suggestions > li', this.onSuggestionSelected);
        super.bindEvent('touchstart', '.suggestions', this.onScrollingStops);
    }

    adaptWrapperTop(): void {
        var $wrapper = this.$scope().find('#wrapper');
        var offset = $('.stations').offset();
        var top = offset.top + offset.height;
        $wrapper.css('top', top);
    }

    show(): Q.Promise<void> {
        return Templating.home.header().then((tpl) => {
            this.header.update(tpl);
            super.showView();
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
            this.adaptWrapperTop();
            this.myIScroll.refresh();
        });
    }

    onInputReset(e: Event): boolean {
        e.preventDefault();

        var $input = (() => {
            var $scope = this.$scope();
            var $button = $(e.currentTarget);
            return $button.siblings('input');
        })();

        if($input.is('[name=start]')) {
            this.resetStart();
        } else if($input.is('[name=end]')) {
            this.resetEnd();
        }

        App.Navigate.home(this.getStart(), this.getEnd());
        return true;
    }

    onStationKeyUp(e: Event): boolean {
        var stopsTree = Storage.stops();
        var $input = $(e.currentTarget);
        var term = $input.val();

        var eventuallyTransition =  this.scheduleView.isDisplayed() ? this.scheduleView.hide() : utils.Promise.DONE();

        eventuallyTransition.then(() => {
            var timeout = this.scheduleView.isDisplayed() ? 600 : 0;
            setTimeout(() => {
                if(term.trim() === '') {
                    this.getResetBtnFromInput($input).removeClass('filled');
                    this.clearSuggestions();
                } else {
                    var founds = TernaryTree.search(term.toLowerCase(), stopsTree, 20);
                    this.getResetBtnFromInput($input).addClass('filled');
                    this.suggest(term, founds);
                }
            }, timeout);
        });

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
        var maybeStart = this.getStart();
        var maybeEnd = this.getEnd();

        if($suggestions.is('.start')) {
            maybeStart = new opt.Some(name);
        } else if($suggestions.is('.end')) {
            maybeEnd = new opt.Some(name);
        }

        App.Navigate.home(maybeStart, maybeEnd);
    }

    getResetBtnFromInput($input: ZeptoCollection): ZeptoCollection {
        return $input.siblings('.reset');
    }

    fillStart(start: string): void {
        this.$scope().find('.suggestions').attr('data-start', start);
        var $input = this.$scope().find('input[name=start]');
        $input.val(start);
        this.getResetBtnFromInput($input).addClass('filled');
        this.clearSuggestions();
    }

    fillEnd(end: string): void {
        this.$scope().find('.suggestions').attr('data-end', end);
        var $input = this.$scope().find('input[name=end]');
        $input.val(end);
        this.getResetBtnFromInput($input).addClass('filled');
    }

    resetStart(): void {
        this.$scope().find('.suggestions').removeAttr('data-start');
        var $input = this.$scope().find('input[name=start]');
        $input.val('');
        this.getResetBtnFromInput($input).removeClass('filled');
    }

    resetEnd(): void {
        this.$scope().find('.suggestions').removeAttr('data-end');
        var $input = this.$scope().find('input[name=end]');
        $input.val('');
        this.getResetBtnFromInput($input).removeClass('filled');
    }

    getStart(): opt.IOption<string> {
        var $suggestions = this.$scope().find('.suggestions');
        return opt.Option<any>($suggestions.attr('data-start'));
    }

    getEnd(): opt.IOption<string> {
        var $suggestions = this.$scope().find('.suggestions');
        return opt.Option<any>($suggestions.attr('data-end'));
    }

    reset(): void {
        this.clearSuggestions();
        this.resetStart();
        this.resetEnd();
    }
}
