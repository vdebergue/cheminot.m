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
import seq = require('../lib/immutable/List');
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
                $label.html($label.data('label-pullup'));
            }
        });

        this.myIScroll.on('scroll', function() {
            if(this.y < (this.maxScrollY - 5) && !$pullUp.is('.flip')) {
                $pullUp.addClass('flip');
                $label.html($label.data('label-release'));
                this.maxScrollY = this.maxScrollY;
            } else if (this.y > (this.maxScrollY + 5) && $pullUp.is('.flip')) {
                $pullUp.removeClass('flip loading');
                $label.html($label.data('label-pullup'));
                this.maxScrollY = $pullUp.height();
            }
        });

        this.myIScroll.on('scrollEnd', () => {
            if($pullUp.is('.flip')) {
                $pullUp.addClass('loading');
                $label.html($label.data('loading'));
                this.onPullUp();
            }
        });
    }

    bindEvents(): void {
        super.bindEvent('tap', '.schedules li', this.onScheduleSelected);
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
        var schedule = {};
        var ts = $schedule.data('starttime');

        var $schedules = this.$scope().find('.schedules');
        var startId = $schedules.data('start-id');
        var endId = $schedules.data('end-id');
        var when = $schedules.data('when');

        App.Navigate.trip(startId, endId, when, ts, schedule);
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
        var maxResults = 1;
        var ftemplate = Templating.timetable.schedules();
        var fschedules = (() => {
            var vs = Storage.tdspGraph()[startId];
            var sortedStopTimes = _.sortBy(vs.stopTimes, (st:any) => {
                return st.departureTime;
            });
            var beforeAndAfter = seq.fromArray(sortedStopTimes).partition((st:any) => {
                var d1 = utils.timeFromTo(new Date(st.departureTime), when);
                return d1.getTime() < when.getTime();
            });
            var before = beforeAndAfter._1;
            var after = beforeAndAfter._2;
            var departureTimes = after.append(before).asArray();
            return PlannerTask.lookForBestTrip(startId, endId, departureTimes, maxResults);
        })();

        return Q.all([ftemplate, fschedules]).spread<void>((t, schedules) => {
            var dom = tmpl(t, { schedules: this.processResults(schedules) });
            var $scope = this.$scope();
            var $schedules = $scope.find('.schedules');
            $schedules.data('startId', startId);
            $schedules.data('endId', endId);
            $schedules.data('when', when.getTime());
            if(append) {
                var list = $(dom).find('li').toArray();
                $schedules.find('ul').append(list);
            } else {
                $schedules.html(dom);
            }
            this.toggleShowPullup();
            this.myIScroll.refresh();
        }).catch((reason) => {
            console.log(reason);
        });
    }

    toggleShowPullup() {
        var $scope = this.$scope();
        var $scroller = $scope.find('#scroller');
        var scrollerOffset = $scroller.offset();
        if((scrollerOffset.top + scrollerOffset.height) > utils.viewportSize()._1) {
            $scope.find('.pull-up').addClass('visible');
        } else {
            $scope.find('.pull-up').removeClass('visible');
        }
    }

    onPullUp() {
        var $schedules = this.$scope().find('.schedules');
        var lastEndTime =  $schedules.find('li:last-child').data('endtime');
        var startId = $schedules.data('startId');
        var endId = $schedules.data('endId');
        this.buildWith(startId, endId, new Date(lastEndTime), true).then(() => {
            this.myIScroll.refresh();
        });
    }
}
