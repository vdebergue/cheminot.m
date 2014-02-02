/// <reference path='../../dts/Q.d.ts'/>
/// <reference path='../../dts/underscore.d.ts'/>

import seq = require('../lib/immutable/List');
import opt = require('../lib/immutable/Option');
import utils = require('../utils/utils');
import Api = require('../ws/api');
import IndexedDB = require('./indexedDB');
import WebSql = require('./websql');
import Setup = require('../tasks/setup');

export interface IStorage {
    getStopsTree(): Q.Promise<any>;
    reset(): Q.Promise<void>;
    insertStopsTree(stopsTree): Q.Promise<void>;
    insertTrips(trips: Array<any>, progress: (string, any) => void): Q.Promise<void>;
    putVersion(version: string): Q.Promise<void>;
    version(): Q.Promise<opt.IOption<string>>;
    tripById(id: string): Q.Promise<opt.IOption<any>>;
    tripsByIds(ids: seq.IList<string>, direction: opt.IOption<string>): Q.Promise<seq.IList<any>>;
}

export function impl(): IStorage {
    var s:any = self;
    if(s.indexedDB) {
        return IndexedDB.impl();
    } else if(s.openDatabase) {
        return WebSql.impl();
    } else {
        utils.oops('You need a more recent device !');
    }
}

export var STOPS: opt.IOption<any> = new opt.None<any>();
export var TRIPS: opt.IOption<any> = new opt.None<any>();

export function addTripsToCache(tripsToAdd: any): void {
    TRIPS.map((trips) => {
        TRIPS = new opt.Some($.extend(trips, tripsToAdd));
    }).getOrElse(() => {
        TRIPS = new opt.Some(tripsToAdd);
    });
}

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

export function forceInstallDB(config: any, STORAGE: IStorage, progress: (string, any?) => void): Q.Promise<void> {
    utils.log('Installing from scratch DB');
    return utils.measureF(() => Api.db(config, progress), 'fetchApi').then((db) => {
        return STORAGE.reset().then(() => {
            return utils.measureF(() => STORAGE.insertStopsTree(db.treeStops), 'persistStops');
        }).then(() => {
            progress('setup:stops');
            return utils.measureF(() => STORAGE.insertTrips(db.trips, progress), 'persistTrips');
        }).then(() => {
            return STORAGE.putVersion(db.version);
        }).then(() => {
            progress('setup:done');
        });
    });
}

export function cacheDB(progress: (string, any?) => void): Q.Promise<void> {
    var config = window['CONFIG'];
    return Api.db(config, progress).then((db) => {
        STOPS = new opt.Some(db.treeStops);
        db.trips.data.forEach((d) => {
            addTripsToCache(d.trips);
        });
        console.log(db.trips);
    });
}

export function installDB(progress: (string, any?) => void): Q.Promise<void> {
    var STORAGE = impl();
    var config = window['CONFIG'];
    var d = Q.defer<any>();
    if(STOPS.isEmpty()) {
        STORAGE.version().then((maybeVersion) => {
            STORAGE.getStopsTree().then((maybeStops) => {
                if(maybeVersion.isDefined() && maybeStops.isDefined()) {
                    maybeStops.foreach((stops) => {
                        STOPS = new opt.Some(stops);
                    });
                    d.resolve(null);
                } else {
                    Setup.start(progress);
                    cacheDB(progress);
                }
            });
        }).fail((reason) => {
            utils.error(JSON.stringify(reason));
            d.reject(reason);
        });
    } else {
        d.resolve(null);
    }
    return d.promise;
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

    return impl().tripById(tripId).then((maybeTrip) => {
        return maybeTrip.map((trip) => {
            return direction(trip);
        }).getOrElse(() => {
            utils.oops('Error while getting trip direction: can\'t find the trip');
            return null;
        });
    });
}
