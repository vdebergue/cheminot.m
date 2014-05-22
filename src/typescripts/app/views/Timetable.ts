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
import rng = require('../lib/immutable/Range');
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
        var $header = $('header');
        var top = $header.offset().top + $header.height();
        $wrapper.css('top', top);
        this.myIScroll = new IScroll('#timetable #wrapper', { probeType: 1});
        this.initPullAndRefresh();
    }

    initPullAndRefresh() {
        var $pullUp = this.$scope().find('.pull-up');
        var $label = $pullUp.find('.label');

        this.myIScroll.on('refresh', () => {
            if ($pullUp.is('.loading')) {
                $pullUp.removeClass('loading flip');
                $label.html('Tirer pour actualiser');
            }
        });

        this.myIScroll.on('scroll', function() {
            if(this.y < (this.maxScrollY - 5) && !$pullUp.is('.flip')) {
                $pullUp.addClass('flip');
                $label.html('Relacher pour actualiser...');
                this.maxScrollY = this.maxScrollY;
            } else if (this.y > (this.maxScrollY + 5) && $pullUp.is('.flip')) {
                $pullUp.removeClass('flip loading');
                $label.html('Tirer pour actualiser');
                this.maxScrollY = $pullUp.height();
            }
        });

        this.myIScroll.on('scrollEnd', () => {
            if($pullUp.is('.flip')) {
                $pullUp.addClass('loading');
                $label.html('Chargement...');
                this.onPullUp();
            }
        });
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
            var startTime = r[0].gi.departureTime;
            var endTime = r[r.length - 1].gi.arrivalTime;
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
                startTime: startTime,
                endTime: endTime,
                duration: duration,
                steps: steps
            };
        });
    }

    buildWith(startId: string, endId: string, when: Date, append: boolean = false): Q.Promise<void> {
        var ftemplate = Templating.timetable.schedules();
        var fschedules = (() => {
            var vs = Storage.tdspGraph()[startId];
            var departureTimes = _.sortBy(vs.stopTimes, (st:any) => {
                return st.departureTime;
            });
            return PlannerTask.lookForBestTrip(startId, endId, departureTimes, 4);
        })();

        return Q.all([ftemplate, fschedules]).spread<void>((t, schedules) => {
            var dom = tmpl(t, { schedules: this.processResults(schedules) });
            var $schedules = this.$scope().find('.schedules');
            $schedules.data('startId', startId);
            $schedules.data('endId', endId);
            if(append) {
                $schedules.append(dom);
            } else {
                $schedules.html(dom);
            }
            this.myIScroll.refresh();
        });
    }

    onPullUp() {
        var $schedules = this.$scope().find('.schedules');
        var lastEndTime =  $schedules.find('li:last-child').data('endtime');
        var startId = $schedules.data('startId');
        var endId = $schedules.data('endId');
        this.buildWith(startId, endId, lastEndTime, true).then(() => {
            this.myIScroll.refresh();
        });
    }
}

// return ftemplate.then((t) => {
//     var data = new rng.Range(1, 5).toList().map(() => {
//         return {
//             steps: [1,2,3],
//             duration: "02:01",
//             start: moment().format('HH:mm'),
//             end: moment().format('HH:mm')
//         };
//     }).asArray();
//     var dom = tmpl(t, { schedules: data });
//     this.$scope().find('.schedules').html(dom);
// });