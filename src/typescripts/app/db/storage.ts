/// <reference path='../../dts/Q.d.ts'/>

import seq = require('../lib/immutable/List');
import opt = require('../lib/immutable/Option');
import utils = require('../utils/utils');
import Api = require('../ws/api');
import IndexedDB = require('./indexedDB');

var STOPS: opt.IOption<any> = new opt.None<any>();
var TRIPS: opt.IOption<Array<any>> = new opt.None<Array<any>>();

export function installDB(): Q.Promise<void> {
    utils.log('Installing DB...');
    var d = Q.defer<any>();
    if(STOPS.isEmpty()) {
        clearDatabase().then(() => {
            IndexedDB.get('cache', 'by_key', 'treeStops').then((maybeStops) => {
                IndexedDB.get('cache', 'by_key', 'trips').then((maybeTrips) => {
                    if(maybeStops.isDefined() && maybeTrips.isDefined()) {
                        maybeStops.map((stops) => {
                            maybeTrips.map((trips) => {
                                STOPS = new opt.Some(stops.value);
                                TRIPS = new opt.Some(trips.value.data);
                                d.resolve(null);
                            });
                        });
                    } else {
                        utils.log('Getting it from API !');
                        utils.measureF(() => Api.db(), 'fetchApi').then((db) => {
                            STOPS = new opt.Some(db.treeStops);
                            TRIPS = new opt.Some(db.trips.data);
                            return clearDatabase().then(() => {
                                return utils.measureF(() => persistStops(db.treeStops), 'persistStops');
                            }).then(() => {
                                return utils.measureF(() => persistTrips(db.trips), 'persistTrips')
                            }).then(() => {
                                d.resolve(null);
                            });
                        }).fail((reason) => {
                            utils.error(JSON.stringify(reason));
                            d.reject(reason);
                        });
                    }
                }).fail((reason) => {
                    utils.error(JSON.stringify(reason));
                    d.reject(reason);
                });
            }).fail((reason) => {
                $('body').html(JSON.stringify(reason))
                utils.error(JSON.stringify(reason));
                d.reject(reason);
            });
        });
    } else {
        d.resolve(null);
    }
    return d.promise;
}

function persistTrips(tripsData: any): Q.Promise<void> {
    return IndexedDB.put('cache', { key: 'trips', value: tripsData });
}

function persistStops(treeStops: any): Q.Promise<void> {
    utils.log('Persisting treeStops');
    return IndexedDB.put('cache', { key: 'treeStops', value: treeStops });
}

export function isInitialized(): boolean {
    return maybeTrips().isDefined() && maybeStops().isDefined();
}

export function maybeStops(): opt.IOption<any> {
    return STOPS;
}

export function maybeTrips(): opt.IOption<any> {
    return TRIPS;
}

export function trips(): any {
    return maybeTrips().map((trips) => {
        return trips;
    }).getOrElse(() => {
        utils.error('TRIPS not initialized !');
        return null;
    });
}

export function stops(): any {
    return maybeStops().map((stops) => {
        return stops;
    }).getOrElse(() => {
        utils.error('STOPS not initialized !');
        return null;
    });
}

export function tripById(id: string): Q.Promise<opt.IOption<any>> {
    return Q(opt.Option(trips()[id]));
}

export function tripsByIds(ids: seq.IList<string>, direction: string): Q.Promise<seq.IList<any>> {
    return Q(ids.map((id) => {
        return opt.Option<any>(trips()[id]).filter((trip) => {
            return trip.direction === direction;
        });
    }).flatten());
}

export function getTripDirection(startId: string, stopId: string, tripId: string): Q.Promise<string> {
    console.log(startId, stopId, tripId)
    var direction = (trip: any) => {
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
    }

    return Q(opt.Option<any>(trips()[tripId]).map((trip) => {
        return direction(trip);
    }).getOrElse(() => {
        throw new Error('Error while getting trip direction: can\'t find the trip');
        return null;
    }));
}

function clearDatabase(): Q.Promise<void> {
    utils.log('Clearing database');
    return IndexedDB.clearCacheStore().then(() => {
        return null;
    });
}