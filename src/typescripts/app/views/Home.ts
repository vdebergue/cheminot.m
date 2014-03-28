/// <reference path='../../dts/Q.d.ts'/>
/// <reference path='../../dts/zepto.d.ts'/>

import App = require('../application');
import Storage = require('../db/storage');
import seq = require('lib/immutable/List');
import opt = require('lib/immutable/Option');
import IView = require('./IView');
import View = require('./View');
import Schedule = require('./Schedule');
import Templating = require('./templating');
import utils = require('../utils/utils');
import TernaryTree = require('../utils/ternaryTree');
import Interactions = require('./Interactions');

declare var tmpl;
declare var IScroll;
declare var Zanimo;

export = Home;

class Home extends View implements IView {

    name: string;
    myIScroll: any;
    scheduleView: Schedule;
    interactions: Interactions;

    constructor(container: string, scope: string, name: string) {
        this.name = name;
        this.interactions = new Interactions();
        this.scheduleView = new Schedule('#home', '#schedule', 'schedule', this.interactions);
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
        super.bindEvent('blur', 'input[name=start], input[name=end]', this.onStationBlur);
        super.bindEvent('tap', '.search .reset', this.onInputReset);
        super.bindEvent('tap', '.suggestions > li', this.onSuggestionSelected);
        super.bindEvent('touchstart', '.suggestions', this.onScrollingStops);
    }

    adaptWrapperTop(): void {
        var $wrapper = this.$scope().find('#wrapper');
        var offset = $('.search .end').offset();
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
        var $suggestions = this.$getSuggestions();
        $suggestions.empty();
        if(!suggestions.isEmpty()) {
            this.$scope().find('.stations').addClass('searching');
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

        var $input = $(e.currentTarget).siblings('input');

        if(this.isStartInput($input)) {
            this.resetStart();
        } else if(this.isEndInput($input)) {
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
            return Q.delay(timeout).then(() => {
                var $reset = this.getResetBtnFromInput($input);
                $reset.removeClass('filled');
                if(term.trim() === '') {
                    this.clearSuggestions();
                } else {
                    var founds = TernaryTree.search(term.toLowerCase(), stopsTree, 20);
                    this.suggest(term, founds);
                }
            });
        });

        return true;
    }

    clearSuggestions(): void {
        var $scope = this.$scope();
        $scope.find('.stations').removeClass('searching');
        this.$getSuggestions().empty();
    }

    onStationBlur(e: Event): boolean {
        var $input = $(e.currentTarget);
        if($input.is('[name=start]')) {
            this.showEnd();
        } else if($input.is('[name=end]')) {
            this.showStart();
        }
        return true;
    }

    isResetDisplayed($input: ZeptoCollection): boolean {
        return this.getResetBtnFromInput($input).is('.filled');
    }

    isStartInput($input: ZeptoCollection): boolean {
        return $input.is('[name=start]');
    }

    isEndInput($input: ZeptoCollection): boolean {
        return $input.is('[name=end]');
    }

    onStationFocus(e: Event): boolean {
        var $input = $(e.currentTarget);
        var $suggestions = this.$getSuggestions();

        if(this.isStartInput($input)) {
            $suggestions.removeClass('end').addClass('start');
            this.hideEnd();
            if(this.isResetDisplayed($input)) {
                App.Navigate.home(new opt.None<string>(), this.getEnd());
            }
        } else if(this.isEndInput($input)) {
            $suggestions.removeClass('start').addClass('end');
            this.hideStart();
            if(this.isResetDisplayed($input)) {
                App.Navigate.home(this.getStart());
            }
        }
        return true;
    }

    onScrollingStops(e: Event): boolean {
        this.$getStart().blur();
        this.$getEnd().blur();
        return true;
    }

    onSuggestionSelected(e: Event): boolean {
        var $suggestion = $(e.currentTarget);
        var name = $suggestion.attr('data-name');
        this.onceSelected(name);
        return true;
    }

    onceSelected(name: string): void {
        var $suggestions = this.$getSuggestions();
        var maybeStart = this.getStart();
        var maybeEnd = this.getEnd();

        if($suggestions.is('.start')) {
            maybeStart = new opt.Some(name);
        } else if($suggestions.is('.end')) {
            maybeEnd = new opt.Some(name);
        }

        this.interactions.await().then(() => {
            App.Navigate.home(maybeStart, maybeEnd);
        });
    }

    getResetBtnFromInput($input: ZeptoCollection): ZeptoCollection {
        return $input.siblings('.reset');
    }

    fillStart(start: string): void {
        this.$getSuggestions().attr('data-start', start);
        var $input = this.$getStart();
        $input.val(start);
        this.getResetBtnFromInput($input).addClass('filled');
        this.clearSuggestions();
    }

    fillEnd(end: string): void {
        this.$getSuggestions().attr('data-end', end);
        var $input = this.$getEnd();
        $input.val(end);
        this.getResetBtnFromInput($input).addClass('filled');
    }

    resetStart(): void {
        this.$getSuggestions().removeAttr('data-start');
        var $input = this.$getStart();
        $input.val('');
        this.getResetBtnFromInput($input).removeClass('filled');
    }

    resetEnd(): void {
        this.$getSuggestions().removeAttr('data-end');
        var $input = this.$getEnd();
        $input.val('');
        this.getResetBtnFromInput($input).removeClass('filled');
    }

    getStart(): opt.IOption<string> {
        var $suggestions = this.$getSuggestions();
        return opt.Option<string>($suggestions.attr('data-start'));
    }

    getEnd(): opt.IOption<string> {
        var $suggestions = this.$getSuggestions();
        return opt.Option<string>($suggestions.attr('data-end'));
    }

    reset(): void {
        this.clearSuggestions();
        this.resetStart();
        this.resetEnd();
    }

    hideEnd(): Q.Promise<void> {
        var $end = this.$scope().find('.input.end');
        var $start = this.$scope().find('.input.start');
        $start.removeClass('animating');
        $end.addClass('animating');
        var translate = $start.offset().top - $end.offset().top;
        var f = Zanimo.transform($end.get(0), 'translate3d(0,'+ translate + 'px,0)', true)
        this.interactions.register(f);
        return f.then(() => {
            this.adaptWrapperTop();
        });
    }

    hideStart(): Q.Promise<void> {
        var $end = this.$scope().find('.input.end');
        var translate = this.$scope().find('.input.start').height();
        $end.addClass('animating above');
        var f = Zanimo.transform($end.get(0), 'translate3d(0,-'+ translate + 'px,0)', true);
        this.interactions.register(f);
        return f.then(() => {
            this.adaptWrapperTop();
        });
    }

    showStart(): Q.Promise<void> {
        return this.showEnd();
    }

    showEnd(): Q.Promise<void> {
        var $end = this.$scope().find('.input.end');
        var f = Zanimo.transform($end.get(0), 'translate3d(0,0,0)', true).then(() => {
            return Q.delay(250).then(() => {
                $end.removeClass('animating').removeClass('above');
            });
        });
        this.interactions.register(f);
        return f;
    }

    $getStart(): ZeptoCollection {
        return this.$scope().find('input[name=start]');
    }

    $getEnd(): ZeptoCollection {
        return this.$scope().find('input[name=end]');
    }

    $getSuggestions(): ZeptoCollection {
        return this.$scope().find('.suggestions');
    }
}
