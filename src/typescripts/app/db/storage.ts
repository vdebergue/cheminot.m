/// <reference path='../../dts/Q.d.ts'/>

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
                STOPS = new opt.Some(stops);
                d.resolve(null);
            }).getOrElse(() => {
                Api.db().then((db) => {
                    console.log('All from API');
                    STOPS = new opt.Some(db.stops);
                    Q.all([
                        persistRoutes(db.routes),
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

function persistRoutes(routes: any): Q.Promise<void> {
    var promises = routes.map((route) => {
        return IndexedDB.put('routes', route);
    });
    return Q.all(promises).then(() => {
        return null;
    });
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
        return stops.value;
    }).getOrElse(() => {
        console.error('DB not initialized !');
        return null;
    });
}

export function tripsByIds(ids: Array<string>): Q.Promise<Array<any>> {
    var promises = ids.map((id) => {
        return IndexedDB.get('trips', 'by_id', id);
    });
    return Q.all(promises);
}