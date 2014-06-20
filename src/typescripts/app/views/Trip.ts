/// <reference path='../../dts/Q.d.ts'/>
/// <reference path='../../dts/zepto.d.ts'/>

import IView = require('./IView');
import View = require('./View');
import Templating = require('./templating')
import planner = require('../models/Planner');
import seq = require('lib/immutable/List');
import opt = require('../lib/immutable/Option');
import utils = require('../utils/utils');
import PlannerTask = require('../tasks/planner');
import Storage = require('../db/storage');

declare var tmpl:any;
declare var IScroll:any;

export = Trip;

class Trip extends View implements IView {

    name: string;
    myIScroll: any;

    constructor(container: string, scope: string, name: string) {
        this.name = name;
        super(container, scope);
    }

    setup(): Q.Promise<IView> {
        return super.ensure(Templating.trip.layout).then(() => {
            this.bindEvents();
            return this;
        });
    }

    initIScroll(): void {
        var $wrapper = this.$scope().find('#wrapper');
        var offset = this.$scope().find('.title').offset();
        var top = offset.top + offset.height;
        $wrapper.css('top', top);
        this.myIScroll = new IScroll('#trip #wrapper');
    }

    bindEvents(): void {
    }

    show(): Q.Promise<void> {
        return Templating.trip.header().then((tpl) => {
            this.header.update(tpl);
            super.showView();
            this.initIScroll();
        });
    }

    private processResult(result: any[]): any[] {
        return result.map((next) => {
            var waiting = Math.round(((next.gi.departureTime - next.gi.arrivalTime) / 1000) / 60);
            return {
                departureTime: next.gi.departureTime,
                waiting: waiting,
                name: next.gi.stop.name
            }
        });
    }

    buildWith(startId: string, endId: string, when: Date, ts: number, maybeTrip: opt.IOption<any>): Q.Promise<void> {
        var ftemplate = Templating.trip.details();

        return maybeTrip.map((trip) => {
            return ftemplate.then((t) => {
                var dom = tmpl(t, { stops: this.processResult(trip) });
                var $stops = this.$scope().find('.stops');
                $stops.html(dom);
            });
        }).getOrElse(() => {
            var fschedules = (() => {
                var maxResults = 1;
                var vs = Storage.tdspGraph()[startId];
                var sortedStopTimes = _.sortBy(vs.stopTimes, (st:any) => {
                    return st.departureTime;
                });
                var beforeAndAfter = seq.fromArray(sortedStopTimes).partition((st:any) => {
                    var d1 = utils.setSameTime(new Date(st.departureTime), when);
                    return d1.getTime() < when.getTime();
                });
                var before = beforeAndAfter._1;
                var after = beforeAndAfter._2;
                var departureTimes = after.append(before).asArray();

                return ftemplate.then((t) => {
                    return PlannerTask.lookForBestTrip(startId, endId, departureTimes, maxResults, (trip) => {
                        if(trip[0].gi.departureTime == ts) {
                            var dom = tmpl(t, { stops: this.processResult(trip) });
                            var $stops = this.$scope().find('.stops');
                            $stops.html(dom);
                        }
                    });
                });
            })();
            return fschedules.then(() => {
                this.myIScroll.refresh();
                return utils.Promise.DONE();
            });
        });
    }
}
