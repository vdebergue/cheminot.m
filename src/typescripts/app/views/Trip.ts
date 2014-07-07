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
        this.myIScroll = new IScroll('#trip #wrapper', {'bounce': false});
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

    updateTitle(startId: string, endId: string) {
        var tdsp = Storage.tdspGraph();
        var vs = tdsp[startId];
        var ve = tdsp[endId];
        var $scope = this.$scope();
        $scope.find('.start').text(vs.name);
        $scope.find('.end').text(ve.name);
    }

    buildWith(startId: string, endId: string, when: Date, ts: number, maybeTrip: opt.IOption<any>): Q.Promise<void> {
        var ftemplate = Templating.trip.details();
        this.updateTitle(startId, endId);
        return maybeTrip.map((trip) => {
            return ftemplate.then((t) => {
                var dom = tmpl(t, { stops: this.processResult(trip) });
                var $stops = this.$scope().find('.stops');
                $stops.html(dom);
            });
        }).getOrElse(() => {
            var fschedules = (() => {
                var vs = Storage.tdspGraph()[startId];
                var partitionned = _.chain(vs.stopTimes).sortBy((st: any) => {
                    var d1 = utils.setSameDay(when, new Date(st.departureTime));
                    return d1.getTime();
                }).partition((st:any) => {
                    var d1 = utils.setSameDay(when, new Date(st.departureTime));
                    return d1.getTime() < when.getTime();
                }).value();
                var departureTimes = partitionned[1].concat(partitionned[0]);

                return ftemplate.then((t) => {
                    return PlannerTask.lookForBestTrip(startId, endId, departureTimes, (trip) => {
                        if(trip) {
                            var departureTime = utils.setSameDay(when, new Date(trip[0].gi.departureTime));
                            if(departureTime.getTime() === when.getTime()) {
                                var dom = tmpl(t, { stops: this.processResult(trip) });
                                var $stops = this.$scope().find('.stops');
                                $stops.html(dom);
                                utils.log('DONE');
                                return false;
                            }
                        }
                        return true;
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
