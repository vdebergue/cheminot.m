/// <reference path='../../dts/Q.d.ts'/>

import seq = require('../lib/immutable/List');
import opt = require('../lib/immutable/Option');
import utils = require('../utils/utils');
import Api = require('../ws/api');
import IndexedDB = require('./indexedDB');

var STOPS: opt.IOption<any> = new opt.None<any>();
var TRIPS: opt.IOption<Array<any>> = new opt.None<Array<any>>();

export function installDB(progress: (percent: number) => void): Q.Promise<void> {
    utils.log('Installing DB...');
    var d = Q.defer<any>();
    if(STOPS.isEmpty()) {
        utils.log('Database is empty !');
        clearDatabase().then(() => {
            IndexedDB.get('cache', 'by_key', 'treeStops').then((maybeStops) => {
                maybeStops.map((stops) => {
                    utils.log('Stops from cache');
                    STOPS = new opt.Some(stops.value);
                    d.resolve(null);
                }).getOrElse(() => {
                    utils.log('Getting it from API !');
                    Api.db().then((db) => {
                        utils.log('All from API');
                        STOPS = new opt.Some(db.treeStops);
                        TRIPS = new opt.Some(db.trips.data);
                        Q.all([
                            clearDatabase(),
                            persistStops(db.treeStops),
                            persistTrips(progress, db.trips)
                        ]).then(() => {
                            utils.log('PERSIST DONE');
                            delete TRIPS;
                            TRIPS = new opt.None<Array<any>>();
                            d.resolve(null);
                        }).fail((reason) => {
                            utils.error(reason);
                        });
                    }).fail((reason) => {
                        utils.error(reason);
                        d.reject(reason);
                    });
                });
            }).fail((e) => {
                utils.error(e);
            });
        });
    } else {
        d.resolve(null);
    }
    return d.promise;
}

function persistTrips(progress: (percent: number) => void, trips: any): Q.Promise<void> {
    var PROGRESS = new Progress(progress, trips.size);
    var promises = Object.keys(trips.data).map((tripId) => {
        var trip = trips.data[tripId];
        return IndexedDB.put('trips', trip).then(PROGRESS.onTripAdded(), this);
    });
    return Q.all(promises).then(() => {
        return null;
    });
}

function persistStops(treeStops: any): Q.Promise<void> {
    return Q.delay(
        IndexedDB.put('cache', { key: 'treeStops', value: treeStops }),
        20
    );
}

export function maybeStops(): opt.IOption<any> {
    return STOPS;
}

export function stops(): any {
    return maybeStops().map((stops) => {
        return stops;
    }).getOrElse(() => {
        utils.error('DB not initialized !');
        return null;
    });
}

export function tripById(id: string): Q.Promise<opt.IOption<any>> {
    return IndexedDB.get('trips', 'by_id', id);
}

export function tripsByIds(ids: seq.IList<string>, direction: string): Q.Promise<seq.IList<any>> {
    return TRIPS.map((trips) => {
        utils.log('Get trips from cache');
        return Q(ids.map((id) => {
            return opt.Option<any>(trips[id]).filter((trip) => {
                return trip.direction === direction;
            });
        }).flatten());
    }).getOrElse(() => {
        utils.log('Get trips from DB');
        var promises = ids.map((id) => {
            return IndexedDB.get('trips', 'by_id_direction', [id, direction]);
        }).asArray();
        return Q.all(promises).then((trips) => {
            return seq.List.apply(null, trips).flatten();
        });
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
            throw new Error('Error while getting trip direction: startId or stopId unknown');
            return null;
        });
    }

    return TRIPS.map((trips) => {
        utils.log('getting direction from cache');
        return Q(opt.Option<any>(trips[tripId]).map((trip) => {
            return direction(trip);
        }).getOrElse(() => {
            throw new Error('Error while getting trip direction: can\'t find the trip in the cache');
            return null;
        }));
    }).getOrElse(() => {
        utils.log('getting direction from db');
        return IndexedDB.get('trips', 'by_id', tripId).then((maybeTrip) => {
            return maybeTrip.map((trip) => {
                return direction(trip);
            }).getOrElse(() => {
                throw new Error('Error while getting trip direction: can\'t find the trip in the DB');
                return null;
            });
        });
    });
}

function clearDatabase(): Q.Promise<void> {
    utils.log('Clearing database');
    return Q.all<void>([
        IndexedDB.clearTripsStore(),
        IndexedDB.clearCacheStore()
    ]).then(() => {
        return null;
    });
}

class Progress {

    private progress: (percent: number) => void;
    private tripsSize: number;
    private tripsAdded: number;
    private currentProgress: number;

    constructor(progress: (percent: number) => void, tripsSize: number) {
        this.progress = progress;
        this.tripsSize = tripsSize;
        this.tripsAdded = 0;
    }

    onTripAdded(): () => Q.Promise<void> {
        return () => {
            this.tripsAdded += 1;
            var percent = (this.tripsAdded * 100 / this.tripsSize)
            return Q(this.progress(percent));
        }
    }
}