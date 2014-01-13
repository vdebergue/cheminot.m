/// <reference path='../../dts/Q.d.ts'/>
/// <reference path='../../dts/underscore.d.ts'/>

import seq = require('../lib/immutable/List');
import opt = require('../lib/immutable/Option');
import utils = require('../utils/utils');
import Api = require('../ws/api');
import IndexedDB = require('./indexedDB');

var STOPS: opt.IOption<any> = new opt.None<any>();
var TRIPS: opt.IOption<any> = new opt.None<any>();

export function stops(): any {
    return STOPS.map((stops) => {
        return stops;
    }).getOrElse(() => {
        utils.error('STOPS not initialized !');
        return null;
    });
}

export function isInitialized(): boolean {
    return TRIPS.isDefined() && STOPS.isDefined();
}

function addTripsToCache(tripsToAdd: any): void {
    TRIPS.map((trips) => {
        TRIPS = new opt.Some($.extend(trips, tripsToAdd));
    }).getOrElse(() => {
        TRIPS = new opt.Some(tripsToAdd);
    });
}

export function installDB(): Q.Promise<void> {
    utils.log('Installing DB...');
    var d = Q.defer<any>();
    if(STOPS.isEmpty()) {
        IndexedDB.get('cache', 'by_key', 'treeStops').then((maybeStops) => {
            if(maybeStops.isDefined()) {
                maybeStops.map((stops) => {
                    STOPS = new opt.Some(stops.value);
                    d.resolve(null);
                    return Q<void>(null);
                });
            } else {
                utils.log('Getting it from API !');
                return IndexedDB.reset().then(() => {
                    utils.measureF(() => Api.db(), 'fetchApi').then((db) => {
                        STOPS = new opt.Some(db.treeStops);
                        return utils.measureF(() => persistStops(db.treeStops), 'persistStops').then(() => {
                            return utils.measureF(() => persistTrips(db.trips), 'persistTrips');
                        }).then(() => {
                            d.resolve(null);
                        });
                    });
                });
            }
        }).fail((reason) => {
            utils.error(JSON.stringify(reason));
            d.reject(reason);
        });
    } else {
        d.resolve(null);
    }
    return d.promise;
}

function persistTrips(rangeTrips: any): Q.Promise<void> {
    return utils.sequencePromises<void>(rangeTrips.data, (rangeTrip) => {
        return IndexedDB.put('trips', rangeTrip);
    }).then(() => {
        return null;
    });
}

function persistStops(treeStops: any): Q.Promise<void> {
    return IndexedDB.put('cache', { key: 'treeStops', value: treeStops });
}

export function tripById(id: string): Q.Promise<opt.IOption<any>> {
    return TRIPS.flatMap((trips) => {
        return opt.Option(trips[id]);
    }).map((trip) => {
        utils.log("trip from cache");
        return Q(new opt.Some(trip));
    }).getOrElse(() => {
        return IndexedDB.get('trips', 'ids', id).then((maybeGroup) => {
            return maybeGroup.map((group) => {
                addTripsToCache(group.trips);
                return group.trips[id];
            });
        });
    });
}

export function tripsByIds(ids: seq.IList<string>, direction: opt.IOption<string> = new opt.None<string>()): Q.Promise<seq.IList<any>> {
    var fromCache = TRIPS.map((trips) => {
        return ids.map((id) => {
            return opt.Option<any>(trips[id]).filter((trip) => {
                return direction.isEmpty() || direction.exists((d) => {
                    return trip.direction === d;
                });
            });
        }).flatten();
    }).getOrElse(() => {
        return new seq.Nil<any>();
    });

    var fromCacheIds = fromCache.map((trip:any) => {
        return trip.id;
    });

    var toQuery = _.difference(ids.asArray(), fromCacheIds.asArray());
    var step = (ids: seq.IList<string>, acc: seq.IList<any>) => {
        return ids.headOption().map((id) => {
            return tripById(id).then((maybeTrip) => {
                return maybeTrip.map((trip) => {
                    return step(ids.tail(), acc.prependOne(trip));
                }).getOrElse(() => {
                    utils.oops('Error while getting trip ' + id);
                    return null;
                });
            });
        }).getOrElse(() => {
            return Q(acc);
        });
    }
    var fromDatabase = step(seq.List.apply(null, toQuery), new seq.Nil<any>());
    return fromDatabase.then((fromDatabase) => {
        return fromDatabase.append(fromCache);
    });
}

export function getTripDirection(startId: string, stopId: string, tripId: string): Q.Promise<string> {
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
            utils.oops('Error while getting trip direction: startId or stopId unknown');
            return null;
        });
    }

    return tripById(tripId).then((maybeTrip) => {
        return maybeTrip.map((trip) => {
            return direction(trip);
        }).getOrElse(() => {
            utils.oops('Error while getting trip direction: can\'t find the trip');
            return null;
        });
    });
}
