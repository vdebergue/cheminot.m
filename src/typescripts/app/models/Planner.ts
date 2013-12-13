/// <reference path='../../dts/Q.d.ts'/>

import opt = require('lib/immutable/Option');
import seq = require('lib/immutable/List');
import Storage = require('../db/storage');
import TernaryTree = require('../utils/ternaryTree');
import utils = require('../utils/utils');

declare var array_intersect;

export function scheduleFor(startName: string, endName: string): Q.Promise<opt.IOption<Schedule>> {

    var stopsTree = Storage.stops();
    var maybeStart: opt.IOption<any> = TernaryTree.search(startName.toLowerCase(), stopsTree, 1).headOption();
    var maybeEnd: opt.IOption<any> = TernaryTree.search(endName.toLowerCase(), stopsTree, 1).headOption();

    return utils.flattenOptionPromise<Schedule>(
        maybeStart.flatMap<Q.Promise<Schedule>>((start) => {
            return maybeEnd.map((end) => {
                var tripIds = array_intersect((id) => { return id; }, start.tripIds, end.tripIds);
                var oneTripId = tripIds[0];
                return Storage.getTripDirection(start.id, end.id, oneTripId).then((direction) => {
                    return Storage.tripsByIds(tripIds || [], direction).then((trips) => {
                        var stopTimes = trips.flatMap<any>((trip) => {
                            return seq.List.apply(null, trip.stopTimes).find((stopTime) => {
                                return stopTime.stop.id === start.id;
                            });
                        });
                        return new Schedule(start, stopTimes)
                    });
                });
            });
        })
    );
}

export class Schedule {

    station: any;
    stopTimes: seq.IList<any>;

    constructor(station: any, stopTimes: seq.IList<any>) {
        this.station = station;
        this.stopTimes = stopTimes;
    }
}
