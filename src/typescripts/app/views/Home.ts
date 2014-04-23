/// <reference path='../../dts/Q.d.ts'/>
/// <reference path='../../dts/zepto.d.ts'/>

import App = require('../application');
import Storage = require('../db/storage');
import seq = require('lib/immutable/List');
import opt = require('lib/immutable/Option');
import IView = require('./IView');
import View = require('./View');
import Templating = require('./templating');
import utils = require('../utils/utils');
import TernaryTree = require('../utils/ternaryTree');

declare var tmpl;
declare var IScroll;
declare var Zanimo;
declare var Keyboard;

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

    bindEvents(): void {
        super.bindEvent('keyup', 'input[name=start], input[name=end]', this.onStationKeyUp);
        super.bindEvent('focus', 'input[name=start], input[name=end]', this.onStationFocus);
        super.bindEvent('tap', '.search .reset', this.onInputReset);
        super.bindEvent('tap', '.suggestions > li', this.onSuggestionSelected);
        super.bindEvent('tap', '.date-selection > li', this.onDateSelected);
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

        this.clearSuggestions();

        var $input = $(e.currentTarget).siblings('input');

        if(this.isStartInput($input)) {
            this.resetStart();
        } else if(this.isEndInput($input)) {
            this.resetEnd();
        }

        var finput = () => {
            if(this.isStartInput($input)) {
                return this.showEnd();
            } else if(this.isEndInput($input)) {
                return this.showStart();
            }
        };

        var $start = this.$getStart();
        var $end = this.$getEnd();

        $start.attr('disabled', 'true');
        $end.attr('disabled', 'true');
        $start.blur();
        $end.blur();

        App.Navigate.home(this.getStart(), this.getEnd()).then(() => {
            var g = finput();
            var h = this.unfoldHeader();
            return Q.all([this.showDatesPanel(), h, g]).then(() => {
                $start.removeAttr('disabled');
                $end.removeAttr('disabled');
            });
        }).then(() => {
            return this.showRequestPanel();
        });

        return true;
    }

    onStationKeyUp(e: Event): boolean {
        var $input = $(e.currentTarget);
        var $reset = this.getResetBtnFromInput($input);
        var term = $input.val().trim();

        $reset.removeClass('filled');

        if(term === '') {
            this.clearSuggestions();
        } else {
            $reset.addClass('filled');
            var founds = TernaryTree.search(term.toLowerCase(), Storage.stops(), 20);
            this.suggest(term, founds);
        }

        return true;
    }

    clearSuggestions(): void {
        var $scope = this.$scope();
        $scope.find('.stations').removeClass('searching');
        this.$getSuggestions().empty();
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

    foldHeader(): Q.Promise<void> {
        var $header = $('header');
        var f = utils.Transition.spy($header.get(0));
        $header.addClass('fold');
        return f;
    }

    unfoldHeader(): Q.Promise<void> {
        var $header = $('header');
        if($header.is('.fold')) {
            var f = utils.Transition.spy($header.get(0));
            $('header').removeClass('fold');
            return f;
        } else {
            return utils.Promise.DONE();
        }
    }

    showRequestPanel(): Q.Promise<void> {
        this.$scope().find('.request').show();
        return utils.Promise.DONE();
    }

    hideRequestPanel(): Q.Promise<void> {
        this.$scope().find('.request').hide();
        return utils.Promise.DONE();
    }

    showDatesPanel(): Q.Promise<void> {
        this.$scope().find('.date-selection').show();
        return utils.Promise.DONE();
    }

    hideDatesPanel(): Q.Promise<void> {
        this.$scope().find('.date-selection').hide();
        return utils.Promise.DONE();
    }

    onStationFocus(e: Event): boolean {
        Keyboard.hideFormAccessoryBar(true);
        var $input = $(e.currentTarget);
        var $suggestions = this.$getSuggestions();

        this.hideRequestPanel();
        this.getResetBtnFromInput($input).addClass('filled');

        var fpannel = (() => {
            if(this.isStartInput($input)) {
                if(this.isResetDisplayed($input)) {
                    $suggestions.removeClass('end').addClass('start');
                    return App.Navigate.home(new opt.None<string>(), this.getEnd());
                } else {
                    return utils.Promise.DONE();
                }
            } else if(this.isEndInput($input)) {
                $suggestions.removeClass('start').addClass('end');
                if(this.isResetDisplayed($input)) {
                    return App.Navigate.home(this.getStart());
                } else {
                    return utils.Promise.DONE();
                }
            }
        })();

        var finput = () => {
            if(this.isStartInput($input)) {
                return this.hideEnd();
            } else if(this.isEndInput($input)) {
                return this.hideStart();
            }
        };

        fpannel.then(() => {
            return Q.all([this.hideDatesPanel(), this.foldHeader(), finput()]);
        });

        return true;
    }

    onScrollingStops(e: Event): boolean {
        this.$getStart().blur();
        this.$getEnd().blur();
        return true;
    }

    onDateSelected(e: Event): boolean {
        var $date = $(e.currentTarget);
        var $inputDate = this.$scope().find('.request .date');

        $date.siblings('li').removeClass('selected');
        $date.addClass('selected');

        if($date.is('.other')) {
            $inputDate.addClass('other');
        } else {
            $inputDate.removeClass('other');
        }

        return true;
    }

    onSuggestionSelected(e: Event): boolean {
        var $suggestion = $(e.currentTarget);
        var name = $suggestion.attr('data-name');
        this.onceSelected(name);
        return true;
    }

    onceSelected(name: string): Q.Promise<void> {
        var $suggestions = this.$getSuggestions();
        var maybeStart = this.getStart();
        var maybeEnd = this.getEnd();

        this.clearSuggestions();
        this.showDatesPanel();
        this.unfoldHeader();

        if($suggestions.is('.start')) {
            this.showEnd();
            maybeStart = new opt.Some(name);
        } else if($suggestions.is('.end')) {
            this.showStart();
            maybeEnd = new opt.Some(name);
        }
        return App.Navigate.home(maybeStart, maybeEnd).then(() => {
            return this.showRequestPanel();
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
        return Zanimo.transform($end.get(0), 'translate3d(0,'+ translate + 'px,0)', true).then(() => {
            this.adaptWrapperTop();
        });
    }

    hideStart(): Q.Promise<void> {
        this.$getStart().parent().hide();
        this.adaptWrapperTop();
        return utils.Promise.DONE();
    }

    showStart(): Q.Promise<void> {
        this.$getStart().parent().show();
        this.adaptWrapperTop();
        return utils.Promise.DONE();
    }

    showEnd(): Q.Promise<void> {
        var $end = this.$scope().find('.input.end');
        return Zanimo.transform($end.get(0), 'translate3d(0,0,0)', true).then(() => {
            $end.removeClass('animating').removeClass('above');
        });
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
