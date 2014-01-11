/// <reference path='../../dts/Q.d.ts'/>
/// <reference path='../../dts/moment.d.ts'/>
/// <reference path='../../dts/underscore.d.ts'/>

import opt = require('lib/immutable/Option');
import seq = require('lib/immutable/List');
import Storage = require('../db/storage');
import TernaryTree = require('../utils/ternaryTree');
import utils = require('../utils/utils');

export function schedulesFor(startName: string, endName: string): Q.Promise<opt.IOption<Schedules>> {

    var stopsTree = Storage.stops();
    var maybeStart: opt.IOption<any> = TernaryTree.search(startName.toLowerCase(), stopsTree, 1).headOption();
    var maybeEnd: opt.IOption<any> = TernaryTree.search(endName.toLowerCase(), stopsTree, 1).headOption();

    return utils.flattenOptionPromise<Schedules>(
        maybeStart.flatMap<Q.Promise<Schedules>>((start) => {
            return maybeEnd.map((end) => {
                var tripIds: Array<any> = _.intersection(start.tripIds, end.tripIds);
                var oneTripId = tripIds[0];
                return Storage.getTripDirection(start.id, end.id, oneTripId).then((direction) => {
                    return Storage.tripsByIds(seq.List.apply(null, tripIds), new opt.Some(direction)).then((trips) => {
                        var stopTimes = trips.flatMap<any>((trip) => {
                            return seq.List.apply(null, trip.stopTimes).find((stopTime) => {
                                return stopTime.stop.id === start.id;
                            });
                        });
                        return new Schedules(start, stopTimes)
                    });
                });
            });
        })
    );
}

export class Schedules {
    station: any;
    stopTimes: seq.IList<any>;

    constructor(station: any, stopTimes: seq.IList<any>) {
        this.station = station;
        this.stopTimes = stopTimes;
    }
}

export class Trip {
    private static isInPeriod(startDate: Date, endDate: Date, when: Date): boolean {
        var start = moment(startDate);
        var end = moment(endDate);
        return !start.isBefore(when) && !end.isAfter(when);
    }

    private static workToday(calendar: any, when: Date): boolean {
        var dict = {
            1: 'monday',
            2: 'tuesday',
            3: 'wednesday',
            4: 'thursday',
            5: 'friday',
            6: 'saturday',
            7: 'sunday'
        };
        return dict[when.getDay()] === '1';
    }

    private static isException(calendarDates: any, when: Date): boolean {
        var exception = new Date(calendarDates.date);
        var mwhen = moment(when);
        if(mwhen.isSame(when, 'year') && mwhen.isSame(when, 'month') && mwhen.isSame(when, 'day')) {
            return calendarDates.exceptionType === '2';
        } else {
            return false;
        }
    }

    public static isValidOn(trip: any, when: Date): boolean {
        var startDate = new Date(trip.service.calendar.startDate);
        var endDate = new Date(trip.service.calendar.endDate);
        var calendar = trip.service.calendar;
        var calendarDates = trip.service.calendarDates;
        if(Trip.isInPeriod(startDate, endDate, when)) {
            return !Trip.workToday(calendar, when) && !Trip.isException(calendarDates, when);
        } else {
            return true;
        }
    }
}

export class StopTime {
    public static formatTime(dateAsString: string): string {
        var date = moment(dateAsString);
        return date.format('HH:mm:ss')
    }
}