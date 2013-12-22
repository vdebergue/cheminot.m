/// <reference path='../../dts/Q.d.ts'/>
/// <reference path='../../dts/zepto.d.ts'/>

import IView = require('./IView');
import View = require('./View');
import Templating = require('./templating')
import planner = require('../models/Planner');
import seq = require('lib/immutable/List');

declare var tmpl:any;

export = Trip;

class Trip extends View implements IView {

    name: string;

    constructor(container: string, scope: string) {
        this.name = 'trip';
        super(container, scope);
    }

    setup(): Q.Promise<void> {
        return super.ensure(Templating.trip.layout).then(() => {
            this.bindEvents();
        });
    }

    bindEvents(): void {
    }

    show(): Q.Promise<void> {
        return Templating.trip.header().then((tpl) => {
            this.header.update(tpl);
            super.showView();
        });
    }

    hide(): Q.Promise<void> {
        return null;
    }

     buildWith(trip: any): Q.Promise<void> {
        return Templating.trip.details().then((t) => {
            var $scope = this.$scope();
            var stops = seq.List.apply(null, trip.stopTimes).map((stopTime) => {
                return {
                    name: stopTime.stop.name,
                    arrival: planner.StopTime.formatTime(stopTime.arrival),
                    departure: planner.StopTime.formatTime(stopTime.departure)
                };
            });
            var dom = tmpl(t, {
                trip: {
                    id: trip.id,
                    stops: stops
                }
            });
            $scope.append(dom);
        });
    }
}