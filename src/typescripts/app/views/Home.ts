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
declare var StatusBar;

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
        super.bindEvent('tap', 'input[name=start], input[name=end]', this.onStationClick);
        super.bindEvent('change', 'input[type=date], input[type=time]', this.onRequestChange);
        super.bindEvent('tap', '.search .reset', this.onInputReset);
        super.bindEvent('tap', '.suggestions > li', this.onSuggestionSelected);
        super.bindEvent('tap', '.date-selection > li', this.onDateSelected);
        super.bindEvent('tap', '.request .submit.enabled', this.onSubmit);
        super.bindEvent('touchstart', '.suggestions', this.onScrollingStops);
    }

    adaptWrapperTop(): void {
        var $wrapper = this.$scope().find('#wrapper');
        var offset = $('.search .end').offset();
        var $body = $('.body');
        var top = offset.top + offset.height + Math.abs($body.offset().top);
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
                    name: s.name,
                    id: s.id
                };
            });
            var dom = tmpl(t, { term: term, stations: data });
            $suggestions.html(dom);
            this.adaptWrapperTop();
            this.myIScroll.refresh();
        });
    }

    enableSubmit(): boolean {
        this.$scope().find('.request .submit').removeClass('disabled').addClass('enabled');
        return true;
    }

    disableSubmit(): boolean {
        this.$scope().find('.request .submit').removeClass('enabled').addClass('disabled');
        return true;
    }

    dateValue(): opt.IOption<string> {
        var $date = this.$scope().find('.request .date .value');
        return opt.Option<string>($date.text().trim()).filter((d) => {
            return !!d;
        });
    }

    timeValue(): opt.IOption<string> {
        var $time = this.$scope().find('.request .time .value');
        return opt.Option<string>($time.text().trim()).filter((t) => {
            return !!t;
        });
    }

    checkRequest(): boolean {
        var $selectedDate = this.$scope().find('.date-selection .selected');
        if(this.getStart().isDefined() && this.getEnd().isDefined()) {
            if($selectedDate.is('.other')) {
                if(this.dateValue().isDefined() && this.timeValue().isDefined()) {
                    return this.enableSubmit();
                }
            } else {
                if(this.timeValue().isDefined()) {
                    return this.enableSubmit();
                }
            }
        }
        return this.disableSubmit();
    }

    getDateAndTime(): opt.IOption<Date> {
        var $scope = this.$scope();
        var $dateSelected = $scope.find('.date-selection .selected');

        var maybeDate = (() => {
            var date = $scope.find('.request .date .value').text();
            return opt.Option<string>(date).filter((d) => {
                return !!d.trim();
            });
        })();

        var maybeTime = (() => {
            var time = $scope.find('.request .time .value').text();
            return opt.Option<string>(time).filter((t) => {
                return !!t.trim();
            });
        })();

        var date = maybeDate.orElse(() => {
            if($dateSelected.is('.today')) {
                return new opt.Some(moment().format('YYYY-MM-DD'));
            } else if($dateSelected.is('.tomorrow')) {
                return new opt.Some(moment().add('days', 1).format('YYYY-MM-DD'));
            } else {
                return new opt.None();
            }
        });

        var time = maybeTime.orElse(() => {
            if($dateSelected.is('.today')) {
                return new opt.Some(moment().format('hh:mm'));
            } else {
                return new opt.None();
            }
        });

        return date.flatMap((d) => {
            return time.map((t) => {
                return moment(d + ' ' + t).toDate();
            })
        });
    }

    onSubmit(e: Event): boolean {
        this.getStart().map((startId) => {
            this.getEnd().map((endId) => {
                this.getDateAndTime().map((dateAndTime) => {
                    App.Navigate.timetable(startId, endId, dateAndTime.getTime());
                });
            })
        });
        return true;
    }

    onRequestChange(e: Event): boolean {
        var $input = $(e.currentTarget);

        $input.siblings('.value').text($input.val());
        $input.val('');

        return this.checkRequest();
    }

    onInputReset(e: Event): boolean {
        e.preventDefault();

        this.clearSuggestions();
        utils.hideKeyboard();

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

        this.disableInputsStation();

        App.Navigate.home(this.getStart(), this.getEnd()).then(() => {
            return Q.all([finput(), this.moveDown()]).then(() => {
                return Q.delay(200).then(() => {
                    StatusBar.show();
                    this.disableInputsStation();
                });
            });
        }).then(() => {
            return this.showRequestPanel();
        });

        return true;
    }

    disableInputsStation() {
        var $start = this.$getStart();
        var $end = this.$getEnd();
        $start.blur();
        $end.blur();
        $start.attr('readonly', 'true');
        $end.attr('readonly', 'true');
    }

    enableInputsStation() {
        this.$getStart().removeAttr('readonly');
        this.$getEnd().removeAttr('readonly');
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

    showRequestPanel(): Q.Promise<void> {
        this.$scope().find('.request').show();
        return utils.Promise.DONE();
    }

    hideRequestPanel(): Q.Promise<void> {
        this.$scope().find('.request').hide();
        return utils.Promise.DONE();
    }

    onStationClick(e: Event): boolean {
        e.preventDefault();
        e.stopPropagation();

        var $input = $(e.currentTarget);
        var $suggestions = this.$getSuggestions();

        this.hideRequestPanel();
        this.getResetBtnFromInput($input).addClass('filled');

        var fpannel = () => {
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
        };

        var finput = () => {
            if(this.isStartInput($input)) {
                return this.hideEnd();
            } else if(this.isEndInput($input)) {
                return this.hideStart();
            }
        };

        Q.all([fpannel(), this.moveUp(), finput()]).then(() => {
            return Q.delay(400).then(() => {
                StatusBar.hide();
                utils.showKeyboard($input);
                this.enableInputsStation();
            });
        });

        return true;
    }

    onScrollingStops(e: Event): boolean {
        this.$getStart().blur();
        this.$getEnd().blur();
        return true;
    }

    onDateSelected(e: Event): boolean {
        var $scope = this.$scope();
        var $date = $(e.currentTarget);
        var $inputDate = $scope.find('.request .date');

        $date.siblings('li').removeClass('selected');
        $date.addClass('selected');

        if($date.is('.other')) {
            $inputDate.addClass('other');
        } else {
            $inputDate.removeClass('other');
        }

        this.checkRequest();

        return true;
    }

    onSuggestionSelected(e: Event): boolean {
        var $suggestion = $(e.currentTarget);
        var id = $suggestion.attr('data-id');
        utils.hideKeyboard();
        this.disableInputsStation();
        this.onceSelected(id).then(() => {
            this.checkRequest();
        });
        return true;
    }

    moveUp(): Q.Promise<void> {
        var $body = $('.body');
        var searchHeight = this.$scope().find('.date-selection').offset().height;
        var $header = $('header');
        var headerHeight = $header.offset().height;
        var translate = searchHeight + headerHeight;
        return Zanimo.transform($body.get(0), 'translate3d(0,-'+ translate + 'px,0)', true).then(() => {
            $body.css('bottom', '-' + translate + 'px');
        });
    }

    moveDown(): Q.Promise<void> {
        var $body = $('.body');
        return Zanimo.transform($body.get(0), 'translate3d(0,0,0)', true).then(() => {
            $body.css('bottom', 0);
        });
    }

    onceSelected(id: string): Q.Promise<void> {
        var $suggestions = this.$getSuggestions();
        var maybeStart = this.getStart();
        var maybeEnd = this.getEnd();

        this.clearSuggestions();
        this.moveDown();

        if($suggestions.is('.start')) {
            this.showEnd();
            maybeStart = new opt.Some(id);
        } else if($suggestions.is('.end')) {
            this.showStart();
            maybeEnd = new opt.Some(id);
        }

        return App.Navigate.home(maybeStart, maybeEnd).then(() => {
            return this.showRequestPanel();
        });
    }

    getResetBtnFromInput($input: ZeptoCollection): ZeptoCollection {
        return $input.siblings('.reset');
    }

    fillStart(startId: string): void {
        var name = Storage.tdspGraph()[startId].name;
        this.$getSuggestions().attr('data-start', startId);
        var $input = this.$getStart();
        $input.val(name);
        this.getResetBtnFromInput($input).addClass('filled');
        this.checkRequest();
    }

    fillEnd(endId: string): void {
        var name = Storage.tdspGraph()[endId].name;
        this.$getSuggestions().attr('data-end', endId);
        var $input = this.$getEnd();
        $input.val(name);
        this.getResetBtnFromInput($input).addClass('filled');
        this.checkRequest();
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
