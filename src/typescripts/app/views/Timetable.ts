/// <reference path='../../dts/Q.d.ts'/>
/// <reference path='../../dts/zepto.d.ts'/>

import App = require('../application');
import IView = require('./IView');
import View = require('./View');
import Templating = require('./templating')
import planner = require('../models/Planner');

declare var tmpl:any;
declare var IScroll:any;

export = Timetable;

class Timetable extends View implements IView {

    name: string;
    myIScroll: any;

    constructor(container: string, scope: string) {
        this.name = 'timetable';
        super(container, scope);
    }

    setup(): Q.Promise<void> {
        return super.ensure(Templating.timetable.layout).then(() => {
            this.bindEvents();
        });
    }

    initIScroll(): void {
        this.myIScroll = new IScroll('#timetable #wrapper');
    }

    adaptSuggestionsHeight(): void {
        var $scope = this.$scope();
        var htmlOffset = $('html').offset();
        var headerOffset = $('header').offset();
        var viewOffset = $scope.offset();
        var height = htmlOffset.height - headerOffset.height - viewOffset.height;
        $scope.find('.schedules').css('height', height);
    }

    bindEvents(): void {
        super.bindEvent('tap', '.schedules > li', this.onScheduleSelected);
    }

    show(): Q.Promise<void> {
        return Templating.timetable.header().then((tpl) => {
            this.header.update(tpl);
            super.showView();
            this.adaptSuggestionsHeight();
            this.initIScroll();
        });
    }

    hide(): Q.Promise<void> {
        this.$scope().addClass('hidden')
        return Q<void>(null);
    }

   onScheduleSelected(e: Event): boolean {
        var $schedule = $(e.currentTarget);
        var tripId = $schedule.data('trip');
        App.navigateToTrip(tripId);
        return false;
    }

    buildWith(schedules: planner.Schedules): Q.Promise<void> {
        return Templating.timetable.schedules().then((t) => {
            var $scope = this.$scope();
            var data = schedules.stopTimes.asArray().sort((a, b) => {
                return a.departure - b.departure;
            }).map((stopTime) => {
                return {
                    departure: planner.StopTime.formatTime(stopTime.departure),
                    arrival: planner.StopTime.formatTime(stopTime.arrival),
                    tripId: stopTime.tripId,
                };
            });
            var dom = tmpl(t, { schedules: data });
            $scope.find('.schedules ul').html(dom);
        });
    }
}