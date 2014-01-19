/// <reference path='../../dts/Q.d.ts'/>
/// <reference path='../../dts/zepto.d.ts'/>

import App = require('../application');
import IView = require('./IView');
import View = require('./View');
import Templating = require('./templating')
import Storage = require('../db/storage');
import planner = require('../models/Planner');
import utils = require('../utils/utils');
import opt = require('../lib/immutable/Option');

declare var tmpl:any;
declare var IScroll:any;

export = Timetable;

class Timetable extends View implements IView {

    name: string;
    myIScroll: any;

    constructor(container: string, scope: string, name: string) {
        this.name = name;
        super(container, scope);
    }

    setup(): Q.Promise<IView> {
        return super.ensure(Templating.timetable.layout).then(() => {
            this.bindEvents();
            return this;
        });
    }

    adaptTimeTableHeight(): void {
        var $scope = this.$scope();
        var htmlOffset = $('html').offset();
        var headerOffset = $('header').offset();
        var viewOffset = $scope.offset();
        var height = htmlOffset.height - headerOffset.height - viewOffset.height;
        $scope.find('#wrapper').css('height', height);
    }

    initIScroll(): void {
        this.myIScroll = new IScroll('#timetable #wrapper');
    }

    bindEvents(): void {
        super.bindEvent('tap', '.schedules > li', this.onScheduleSelected);
    }

    show(): Q.Promise<void> {
        return Templating.timetable.header().then((tpl) => {
            this.header.update(tpl);
            super.showView();
            this.adaptTimeTableHeight();
            this.initIScroll();
        });
    }

    onScheduleSelected(e: Event): boolean {
        var $schedule = $(e.currentTarget);
        var tripId = $schedule.data('trip');
        App.navigateToTrip(tripId);
        return false;
    }

    buildWith(when: Date, schedules: planner.Schedules): Q.Promise<void> {
        return Templating.timetable.schedules().then((t) => {
            var $scope = this.$scope();
            var tripIds = schedules.stopTimes.map((stopTime) => {
                return stopTime.tripId;
            });
            Storage.impl().tripsByIds(tripIds, new opt.None<string>()).then((trips) => {
                var stopTimes = schedules.stopTimes.collect((stopTime) => {
                    return trips.find((trip) => {
                        return trip.id === stopTime.tripId;
                    }).map((trip) => {
                        return opt.Option(trip.service).filter(() => {
                            return planner.Trip.isValidOn(trip, when)
                        }).map(() => {
                            return {
                                timestamp: stopTime.departure,
                                departure: planner.StopTime.formatTime(stopTime.departure),
                                arrival: planner.StopTime.formatTime(stopTime.arrival),
                                tripId: stopTime.tripId,
                            };
                        });
                    }).getOrElse(() => {
                        utils.oops('Unable to find service data for trip: ' + stopTime.tripId);
                        return null;
                    });
                });
                var sortedStopTimes = stopTimes.asArray().sort((a:any, b:any) => {
                    return a.timestamp - b.timestamp;
                });
                var dom = tmpl(t, { schedules: sortedStopTimes });
                $scope.find('.schedules').html(dom);
                this.myIScroll.refresh();
            });
        });
    }
}