/// <reference path='../../dts/Q.d.ts'/>

import seq = require('../lib/immutable/List');
import opt = require('../lib/immutable/Option');
import Api = require('../ws/api');
import IndexedDB = require('./indexedDB');

var STOPS: opt.IOption<any> = new opt.None<any>();

export function installDB(): Q.Promise<void> {
    console.log('Installing DB...');
    var d = Q.defer<any>();
    if(STOPS.isEmpty()) {
        IndexedDB.get('cache', 'by_key', 'treeStops').then((maybeStops) => {
            maybeStops.map((stops) => {
                console.log('Stops from cache');
                STOPS = new opt.Some(stops.value);
                d.resolve(null);
            }).getOrElse(() => {
                Api.db().then((db) => {
                    console.log('All from API');
                    STOPS = new opt.Some(db.stops);
                    Q.all([
                        persistTrips(db.trips),
                        persistStops(db.treeStops)
                    ]).then(() => {
                        console.log('PERSIST DONE');
                        d.resolve(null);
                    }).fail((reason) => {
                        console.error(reason);
                    });
                }).fail((reason) => {
                    console.error(reason);
                    d.reject(reason);
                });
            });
        }).fail((e) => {
            console.error(e);
        });
    } else {
        d.resolve(null);
    }
    return d.promise;
}

function persistTrips(trips: any): Q.Promise<void> {
    var promises = trips.map((trip) => {
        return IndexedDB.put('trips', trip);
    });
    return Q.all(promises).then(() => {
        return null;
    });
}

function persistStops(treeStops: any): Q.Promise<void> {
    return IndexedDB.put('cache', { key: 'treeStops', value: treeStops });
}

export function maybeStops(): opt.IOption<any> {
    return STOPS;
}

export function stops(): any {
    return maybeStops().map((stops) => {
        return stops;
    }).getOrElse(() => {
        console.error('DB not initialized !');
        return null;
    });
}

export function tripsByIds(ids: Array<string>, direction: string): Q.Promise<seq.IList<any>> {
    var promises = ids.map((id) => {
        var keyRange = (<any>IDBKeyRange).bound(
            [id, direction],
            [id, direction]
        );
        return IndexedDB.get('trips', 'by_id_direction', keyRange);
    });
    return Q.all<seq.IList<any>>(promises).then((trips) => {
        return seq.List.apply(null, trips).flatten();
    });
}

export function getTripDirection(startId: string, stopId: string, tripId: string): Q.Promise<string> {
    return IndexedDB.get('trips', 'by_id', tripId).then((maybeTrip) => {
        return maybeTrip.map((trip) => {
            var stationIds = seq.List.apply(null, trip.stopTimes).collect((stopTime) => {
                if(stopTime.stop.id == startId || stopTime.stop.id == stopId) {
                    return opt.Option<string>(stopTime.stop.id);
                } else {
                    return new opt.None<string>();
                }
            });
            return stationIds.headOption().map((stationId) => {
                if(stationId == startId) {
                    return "1";
                } else {
                    return "0";
                }
            }).getOrElse(() => {
                throw new Error('Error while getting trip direction: startId or stopId unknown');
                return null;
            });
        }).getOrElse(() => {
            throw new Error('Error while getting trip direction: can\'t find the trip');
            return null;
        });
    });
}