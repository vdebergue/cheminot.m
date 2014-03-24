/// <reference path='../../dts/Q.d.ts'/>
/// <reference path='../../dts/moment.d.ts'/>
/// <reference path='../../dts/underscore.d.ts'/>

import opt = require('lib/immutable/Option');
import seq = require('lib/immutable/List');
import Storage = require('../db/storage');
import TernaryTree = require('../utils/ternaryTree');
import utils = require('../utils/utils');

export function schedulesFor(startName: string, endName: string, startTime: number): Q.Promise<opt.IOption<Schedules>> {

    var stopsTree = Storage.stops();
    var maybeStart: opt.IOption<any> = TernaryTree.search(startName.toLowerCase(), stopsTree, 1).headOption();
    var maybeEnd: opt.IOption<any> = TernaryTree.search(endName.toLowerCase(), stopsTree, 1).headOption();

    return utils.flattenOptionPromise<Schedules>(
        maybeStart.flatMap<Q.Promise<Schedules>>((start) => {
            return maybeEnd.map((end) => {
                var tripIds: Array<any> = _.intersection(start.tripIds, end.tripIds);
                var oneTripId = tripIds[0];
                return Storage.getTripDirection(start.id, end.id, oneTripId).then<Schedules>((direction) => {
                    return Storage.impl().tripsByIds(seq.List.apply(null, tripIds)).then((trips) => {
                        var stopTimes = trips.filter((trip) => {
                            return trip.direction === direction;
                        }).flatMap<any>((trip) => {
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
        return (start.isBefore(when) || start.isSame(when, 'day')) && (end.isAfter(when) || end.isSame(when, 'day'));
    }

    private static weekAvailability(service: any, when: Date): boolean {
        var dict = {
            1: 'monday',
            2: 'tuesday',
            3: 'wednesday',
            4: 'thursday',
            5: 'friday',
            6: 'saturday',
            0: 'sunday'
        };
        var day = dict[when.getDay()];
        return service[day] === "1";
    }

    private static tripException(when: Date, serviceId: string, exceptions: any, isRemoved: boolean): boolean {
        var mwhen = moment(when);
        return opt.Option(exceptions[serviceId]).exists((exception:any) => {
            if(mwhen.isSame(when, 'day')) {
                return _.find(exception, (ex: any) => {
                    return mwhen.isSame(ex.date, 'day') && ex.exceptionType === (isRemoved ? 2 : 1);
                }) != null;
            } else {
                return false;
            }
        });
    }

    private static hasRemoved(when: Date, serviceId: string, exceptions: any): boolean {
        return Trip.tripException(when, serviceId, exceptions, true);
    }

    private static hasAdded(when: Date, serviceId: string, exceptions: any): boolean {
        return Trip.tripException(when, serviceId, exceptions, false);
    }

    public static isValidOn(trip: any, when: Date, exceptions: any): boolean {
        if(trip.service) {
            var startDate = new Date(trip.service.startDate);
            var endDate = new Date(trip.service.endDate);
            var serviceId = trip.service.serviceId;

            if(!Trip.hasRemoved(when, serviceId, exceptions) &&
               ((Trip.isInPeriod(startDate, endDate, when) && Trip.weekAvailability(trip.service, when))
                || Trip.hasAdded(when, serviceId, exceptions))) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }
}

export class StopTime {
    public static formatTime(dateAsString: string): string {
        var date = moment(dateAsString);
        return date.format('HH:mm:ss')
    }
}