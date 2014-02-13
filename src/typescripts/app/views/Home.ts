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

    bindEvents(): void {
        super.bindEvent('keyup', 'input[name=start], input[name=end]', this.onStationKeyUp);
        super.bindEvent('focus', 'input[name=start], input[name=end]', this.onStationFocus);
        super.bindEvent('tap', '.search .reset', this.onInputReset);
        super.bindEvent('tap', '.suggestions > li', this.onSuggestionSelected);
        super.bindEvent('tap', '.when .btn:not(.go)', this.onWhenTapped);
        super.bindEvent('change', '.when input[type=date]', this.onDaySelected);
        super.bindEvent('tap', '.when .btn.go', this.onTripAndScheduleSelected);
        super.bindEvent('touchstart', '.suggestions', this.onScrollingStops);
    }

    adaptWrapperTop(): void {
        var $wrapper = this.$scope().find('#wrapper');
        var offset = $('.stations > h2').offset();
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
        var $scope = this.$scope();
        var $button = $(e.currentTarget);
        var $input = $button.siblings('input');
        var start = opt.Option<string>($scope.find('.suggestions').attr('data-start'));
        var end = opt.Option<string>($scope.find('.suggestions').attr('data-end'));

        if($input.is('[name=start]')) {
            this.reset();
            App.navigateToHome(new opt.None<string>(), end);
        } else if($input.is('[name=end]')) {
            this.reset();
            App.navigateToHome(start, new opt.None<string>());
        } else {
            this.reset();
            App.navigateToHome();
        }
        return true;
    }

    onStationKeyUp(e: Event): boolean {
        var stopsTree = Storage.stops();
        var $scope = super.$scope();
        var $input = $(e.currentTarget);
        var term = $input.val();
        var $when = this.$scope().find('.when');
        var whenIsDeplayed = $when.is('.displayed')

        var eventuallyTransition =  whenIsDeplayed ? this.hideWhen() : Q<void>(null);
        eventuallyTransition.then(() => {
            var timeout = whenIsDeplayed ? 600 : 0;
            setTimeout(() => {
                if(term.trim() === '') {
                    $input.siblings('.reset').removeClass('filled');
                    this.clearSuggestions();
                } else {
                    var founds = TernaryTree.search(term.toLowerCase(), stopsTree, 20);
                    this.$resetFromInput($input).addClass('filled');
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
        var maybeStart = this.maybeSelectedStart();
        var maybeEnd = this.maybeSelectedEnd();
        var sameDeparture = maybeStart.exists((s) => {
            return s === name;
        });
        var sameArrival = maybeEnd.exists((e) => {
            return e === name;
        });

        if($suggestions.is('.start')) {
            maybeStart = new opt.Some(name);
        } else if($suggestions.is('.end')) {
            maybeEnd = new opt.Some(name);
        }
        if(maybeStart.isDefined() && maybeEnd.isEmpty()) {
            App.navigateToHome(opt.Option<string>(name), new opt.None<string>());
        } else if(maybeEnd.isDefined() && maybeStart.isEmpty()) {
            App.navigateToHome(new opt.None<string>(), opt.Option<string>(name));
        } else {
            maybeStart.foreach((start) => {
                maybeEnd.foreach((end) => {
                    if(sameDeparture || sameArrival) {
                        this.clearSuggestions()
                        this.displayWhen(start, end);
                    } else {
                    App.navigateToHomeWhen(start, end);
                    }
                });
            });
        }
    }

    when(): number {
        var $btn = this.$scope().find('.when .active')
        var timestamp = Date.now();
        if($btn.is('.tomorrow')) {
            timestamp = moment().add('days', 1).hours(12).toDate().getTime();
        } else if($btn.is('.other')) {
            timestamp = parseInt($btn.attr('data-date'), 10);
        }
        return timestamp;
    }

    $resetFromInput($input: ZeptoCollection): ZeptoCollection {
        return $input.siblings('.reset');
    }

    fillSelectedStart(start: string): void {
        this.$scope().find('.suggestions').attr('data-start', start);
        var $input = this.$scope().find('input[name=start]');
        $input.val(start);
        this.$resetFromInput($input).addClass('filled');
    }

    fillSelectedEnd(end: string): void {
        this.$scope().find('.suggestions').attr('data-end', end);
        var $input = this.$scope().find('input[name=end]');
        $input.val(end);
        this.$resetFromInput($input).addClass('filled');
    }

    resetSelectedStart(): void {
        this.$scope().find('.suggestions').removeAttr('data-start');
        var $input = this.$scope().find('input[name=start]');
        $input.val('');
        this.$resetFromInput($input).removeClass('filled');
    }

    resetSelectedEnd(): void {
        this.$scope().find('.suggestions').removeAttr('data-end');
        var $input = this.$scope().find('input[name=end]');
        $input.val('');
        this.$resetFromInput($input).removeClass('filled');
    }

    reset(): void {
        this.clearSuggestions();
        this.resetSelectedStart();
        this.resetSelectedEnd();
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
                setTimeout(() => {
                    $when.addClass('displayed');
                }, 600);
            });
        }, 120);
    }

    hideWhen(): Q.Promise<void> {
        var $when = this.$scope().find('.when');
        $when.removeClass('displayed');
        return Q.delay(Q(null), 400).then(() => {
            return Zanimo.transform($when.get(0), 'translate3d(0,0,0)', true).then(() => {
                return null;
            });
        });
    }

    onWhenTapped(e: Event): boolean {
        var $btn = $(e.currentTarget);
        $btn.siblings('.btn.active').removeClass('active');
        $btn.addClass('active');
        return true;
    }

    onDaySelected(e: Event): boolean {
        var $input = $(e.currentTarget);
        var $btn = $input.parent();
        var date = $input.val();
        if(date != '') {
            $btn.find('.label').text(date);
            $input.val('');
            $btn.attr('data-date', moment(date).toDate().getTime());
        }
        return true;
    }
}
