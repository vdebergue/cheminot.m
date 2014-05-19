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
import PlannerTask = require('../tasks/planner');

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

    initIScroll(): void {
        var $wrapper = this.$scope().find('#wrapper');
        var offset = this.$scope().find('h2').offset();
        var top = offset.top + offset.height;
        $wrapper.css('top', top);
        this.myIScroll = new IScroll('#timetable #wrapper');
    }

    bindEvents(): void {
        super.bindEvent('tap', '.schedules > li', this.onScheduleSelected);
    }

    show(): Q.Promise<void> {
        return Templating.timetable.header().then((tpl) => {
            this.header.update(tpl);
            super.showView();
            this.initIScroll();
        });
    }

    onScheduleSelected(e: Event): boolean {
        var $schedule = $(e.currentTarget);
        var tripId = $schedule.data('trip');
        //App.navigateToTrip(tripId);
        return false;
    }

    private processResults(results: Array<any>): Array<any> {
        return results.map((r) => {
            var startTime = r[0].gi.arrivalTime;
            var endTime = r[results.length - 1].gi.arrivalTime;
            var duration = moment.utc(moment(endTime).diff(moment(startTime))).format('HH:mm');
            var steps = (() => {
                function countChangements(stops: Array<any>, tripId: opt.IOption<string> = new opt.None<string>(), counter: number = 0): number {
                    var h = stops[0];
                    if(h) {
                        var t = stops.slice(1);
                        var isSameTrip = !tripId.isDefined() || tripId.filter((id) => {
                            return id == h.gi.tripId;
                        }).isDefined();
                        if(isSameTrip) {
                            return countChangements(t, new opt.Some(h.gi.tripId), counter);
                        } else {
                            return countChangements(t, new opt.Some(h.gi.tripId), counter + 1);
                        }
                    } else {
                        return counter;
                    }
                }
                return countChangements(r);
            })();

            return {
                startTime: moment(startTime).format('HH:mm'),
                endTime: moment(endTime).format('HH:mm'),
                duration: duration,
                steps: steps
            };
        });
    }

    buildWith(startId: string, endId: string, when: Date): Q.Promise<void> {
        var ftemplate = Templating.timetable.schedules();
        var fschedules = (() => {
            var vs = Storage.tdspGraph()[startId];
            var departureTimes = _.sortBy(vs.stopTimes, (st:any) => {
                return st.departureTime;
            });
            return PlannerTask.lookForBestTrip(startId, endId, departureTimes, 4);
        })();
        return Q.all([ftemplate, fschedules]).spread<void>((t, schedules) => {
            console.log(schedules);
            var dom = tmpl(t, { schedules: this.processResults(schedules) });
            this.$scope().find('.schedules').html(dom);
        });
    }
}