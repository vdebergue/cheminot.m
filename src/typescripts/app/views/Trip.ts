/// <reference path='../../dts/Q.d.ts'/>
/// <reference path='../../dts/zepto.d.ts'/>

import IView = require('./IView');
import View = require('./View');
import Templating = require('./templating')
import planner = require('../models/Planner');
import seq = require('lib/immutable/List');

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

    adaptTripHeight(): void {
        var $scope = this.$scope();
        var htmlOffset = $('html').offset();
        var headerOffset = $('header').offset();
        var viewOffset = $scope.offset();
        var titleOffset = 44;
        var height = htmlOffset.height - headerOffset.height - viewOffset.height - titleOffset;
        $scope.find('#wrapper').css('height', height);
    }

    initIScroll(): void {
        this.myIScroll = new IScroll('#trip #wrapper');
    }

    bindEvents(): void {
    }

    show(): Q.Promise<void> {
        return Templating.trip.header().then((tpl) => {
            this.header.update(tpl);
            super.showView();
            this.adaptTripHeight();
            this.initIScroll();
        });
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
            $scope.find('.stops').html(dom);
            this.myIScroll.refresh();
        });
    }
}