/// <reference path='../../dts/Q.d.ts'/>
/// <reference path='../../dts/zepto.d.ts'/>

import IView = require('./IView');
import View = require('./View');
import Templating = require('./templating')
import planner = require('../models/Planner');

declare var tmpl:any;

export = Timetable;

class Timetable extends View implements IView {

    name: string;

    constructor(container: string, scope: string) {
        this.name = 'timetable';
        super(container, scope);
    }

    setup(): Q.Promise<void> {
        return super.ensure(Templating.timetable.layout).then(() => {
            this.bindEvents();
        });
    }

    bindEvents(): void {
    }

    show(): Q.Promise<void> {
        return Templating.timetable.header().then((tpl) => {
            this.header.update(tpl);
        });
    }

    hide(): Q.Promise<void> {
        return null;
    }

    private static formatTime(dateAsString: string): string {
        var date = new Date(dateAsString);
        return date.getHours() + ':' + date.getMinutes();
    }

    buildWith(schedules: planner.Schedules): Q.Promise<void> {
        return Templating.timetable.schedules().then((t) => {
            var $scope = this.$scope();
            var data = schedules.stopTimes.map((stopTime) => {
                return {
                    departure: Timetable.formatTime(stopTime.departure),
                    arrival: Timetable.formatTime(stopTime.arrival),
                    tripId: stopTime.tripId,
                };
            });
            var dom = tmpl(t, { schedules: data });
            $scope.append(dom);
        });
    }
}