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
            if(this.y < (this.maxScrollY) && !$pullUp.is('.flip')) {
                $pullUp.addClass('flip');
                $label.html($label.data('label-release'));
                this.maxScrollY = this.maxScrollY;
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
        var schedule = getTripFromCache(startId, endId, ts);
        App.Navigate.trip(startId, endId, ts, ts, schedule);
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

    private processResult(start: Date, current: Date, result: any): any {
        var startTime = new Date(result[0].gi.departureTime);
        var endTime = new Date(result[result.length - 1].gi.arrivalTime);
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

        var isToday = true;
        var textDate = (() => {
            var today = moment(start);
            var tomorrow = moment(start).add(1, 'day');
            var now = moment(current);
            var st = utils.setSameDay(current, startTime);

            if(st.getTime() < current.getTime()) {
                st = moment(st).add(1, 'day').toDate();
            }
            if(today.isSame(st, 'day')) {
                startTime = utils.setSameDay(today.toDate(), st);
                return '';
            } else if(tomorrow.isSame(st, 'day')) {
                startTime = utils.setSameDay(tomorrow.toDate(), st);
                isToday = false;
                return 'Demain';
            } else {
                isToday = false;
                return moment(st).add(1, 'day').format('DD/MM');
            }
        })();

        endTime = utils.setSameDay(startTime, endTime);
        if(endTime.getTime() < startTime.getTime()) {
            endTime = moment(endTime).add(1, 'day').toDate();
        }

        return {
            startTime: startTime.getTime(),
            endTime: endTime.getTime(),
            duration: duration,
            steps: steps,
            textDate: textDate,
            isToday: isToday
        };
    }

    buildWith(startId: string, endId: string, when: Date): Q.Promise<void> {
        var ftemplate = Templating.timetable.schedule();

        var $scope = this.$scope();
        var $schedules = $scope.find('.schedules');

        var getLastTime = () => {
            var x = $schedules.find('li:last-child').data('starttime');
            return opt.Option(x).map((ts:number) => {
                return new Date(ts + 1000);
            }).getOrElse(() => when);
        };

        var lastTime = getLastTime();

        var fschedules = (() => {
            var vs = Storage.tdspGraph()[startId];
            var partitionned = _.chain(vs.stopTimes).sortBy((st: any) => {
                var d1 = utils.setSameDay(lastTime, new Date(st.departureTime));
                return d1.getTime();
            }).partition((st:any) => {
                var d1 = utils.setSameDay(lastTime, new Date(st.departureTime));
                return d1.getTime() < lastTime.getTime();
            }).value();

            var current = lastTime;
            var departureTimes = partitionned[1].concat(partitionned[0]).map((st) => {
                var departureTime = utils.setSameDay(current, new Date(st.departureTime));
                if(departureTime.getTime() < current.getTime()) {
                    departureTime = current = moment(departureTime).add(1, 'day').toDate();
                }
                var arrivalTime = utils.setSameDay(current, new Date(st.arrivalTime));
                if(arrivalTime.getTime() < current.getTime()) {
                    arrivalTime = current = moment(arrivalTime).add(1, 'day').toDate();
                }
                st.departureTime = departureTime.getTime();
                st.arrivalTime = arrivalTime.getTime();
                return st;
            });

            $schedules.data('startId', startId);
            $schedules.data('endId', endId);
            $schedules.data('when', when.getTime());

            current = lastTime;

            return ftemplate.then((t) => {
                var min = 3;
                return PlannerTask.lookForBestTrip(startId, endId, departureTimes, (schedule) => {
                    if(schedule) {
                        min -= 1;
                        current = getLastTime();
                        var processed = this.processResult(when, current, schedule);
                        var $list = $schedules.find('ul');
                        var dom = tmpl(t, { schedule: processed });
                        $list.append(dom);
                        addTripToCache(startId, endId, processed.startTime, schedule);
                        this.myIScroll.refresh();
                        this.myIScroll.scrollToElement('li:last-child', 200);
                        if(this.toggleShowPullup() || min > 0) {
                            return true;
                        } else if(min <= 0) {
                            return false;
                        }
                    } else return true;
                }).then(() => {
                    utils.log('DONE');
                    this.myIScroll.refresh();
                    this.myIScroll.scrollToElement('li:last-child', 200);
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
        var viewportSize = utils.viewportSize();
        var height = Math.max(viewportSize._1, viewportSize._2);

        if((scrollerOffset.top + scrollerOffset.height) > height) {
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
        var when = new Date($schedules.data('when'));
        var startId = $schedules.data('startId');
        var endId = $schedules.data('endId');
        var $pullUp = $scope.find('.pull-up');
        if(!$pullUp.is('.locked')) {
            $pullUp.addClass('locked');
            this.buildWith(startId, endId, when).then(() => {
                $pullUp.removeClass('locked');
                this.myIScroll.refresh();
            });
        }
    }
}
