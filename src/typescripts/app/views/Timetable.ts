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

    buildWith(when: Date, trips: any): Q.Promise<void> {
        return Templating.timetable.schedules().then((t) => {
            // var $scope = this.$scope();
            // var dom = tmpl(t, { schedules: sortedStopTimes });
            // $scope.find('.schedules').html(dom);
            // this.myIScroll.refresh();
            return null;
        });
    }
}