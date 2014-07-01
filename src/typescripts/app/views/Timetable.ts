/// <reference path='../../dts/Q.d.ts'/>
/// <reference path='../../dts/zepto.d.ts'/>

import App = require('../application');
import IView = require('./IView');
import View = require('./View');
import Templating = require('./templating')
import Storage = require('../db/storage');
import utils = require('../utils/utils');
import opt = require('../lib/immutable/Option');
import seq = require('../lib/immutable/List');
import PlannerTask = require('../tasks/planner');

declare var tmpl:any;
declare var IScroll:any;

var cache = {}

function getTripFromCache(startId: string, endId: string, when: number): any {
    var id = [startId, endId, when].join('_');
    return cache[id];
}

function addTripToCache(startId: string, endId: string, when: number, data: any): void {
    var id = [startId, endId, when].join('_');
    cache[id] = data;
}

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
            if ($pullUp.is('.loading') && !$pullUp.is('.locked')) {
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
        var ts = $schedule.data('starttime');

        var $schedules = this.$scope().find('.schedules');
        var startId = $schedules.data('start-id');
        var endId = $schedules.data('end-id');
        var when = $schedules.data('when');
        var schedule = getTripFromCache(startId, endId, when);

        App.Navigate.trip(startId, endId, when, ts, schedule);
        return false;
    }

    isAlreadyComputed(start, end, when): boolean {
        var $scope = this.$scope();
        var $schedules = $scope.find('.schedules');
        var currentStart = $schedules.data('startId');
        var currentEnd = $schedules.data('endId');
        var currentWhen = $schedules.data('when');
        return start == currentStart && currentEnd == end && when == currentWhen;
    }

    private processResult(result: any): any {
        var startTime = result[0].gi.departureTime;
        var endTime = result[result.length - 1].gi.arrivalTime;
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
            return countChangements(result);
        })();

        return {
            startTime: startTime,
            endTime: endTime,
            duration: duration,
            steps: steps
        };
    }

    buildWith(startId: string, endId: string, when: Date): Q.Promise<void> {
        var ftemplate = Templating.timetable.schedule();
        var fschedules = (() => {
            var vs = Storage.tdspGraph()[startId];
            var sortedStopTimes = _.sortBy(vs.stopTimes, (st:any) => {
                return st.departureTime;
            });
            var partitionned = _.partition(sortedStopTimes, (st:any) => {
                var d1 = utils.setSameTime(new Date(st.departureTime), when);
                return d1.getTime() < when.getTime();
            });
            var departureTimes = partitionned[1].concat(partitionned[0]);

            return ftemplate.then((t) => {
                var min = 3;
                return PlannerTask.lookForBestTrip(startId, endId, departureTimes, (schedule) => {
                    min -= 1;
                    var dom = tmpl(t, { schedule: this.processResult(schedule) });
                    var $scope = this.$scope();
                    var $schedules = $scope.find('.schedules');
                    $schedules.data('startId', startId);
                    $schedules.data('endId', endId);
                    $schedules.data('when', when.getTime());
                    var $list = $schedules.find('ul');
                    $list.append(dom);
                    addTripToCache(startId, endId, when.getTime(), schedule);
                    this.myIScroll.refresh();
                    if(this.toggleShowPullup() || min > 0) {
                        return true;
                    } else if(min <= 0) {
                        return false;
                    }
                });
            });
        })();

        return fschedules.then(() => {
            return utils.Promise.DONE();
        }).catch((reason) => {
            console.log(reason);
        });
    }

    toggleShowPullup(): boolean {
        var $scope = this.$scope();
        var $scroller = $scope.find('#scroller');
        var scrollerOffset = $scroller.offset();
        var $pullUp = $scope.find('.pull-up');

        if((scrollerOffset.top + scrollerOffset.height) > utils.viewportSize()._1) {
            $scope.find('.pull-up').addClass('visible');
            return false;
        } else {
            $scope.find('.pull-up').removeClass('visible');
            return true;
        }
    }

    onPullUp() {
        var $scope = this.$scope();
        var $schedules = $scope.find('.schedules');
        var lastEndTime =  $schedules.find('li:last-child').data('endtime');
        var startId = $schedules.data('startId');
        var endId = $schedules.data('endId');
        var $pullUp = $scope.find('.pull-up');
        if(!$pullUp.is('.locked')) {
            $pullUp.addClass('locked');
            this.buildWith(startId, endId, new Date(lastEndTime)).then(() => {
                $pullUp.removeClass('locked');
                this.myIScroll.refresh();
            });
        }
    }
}
