import seq = require('../lib/immutable/List');
import opt = require('../lib/immutable/Option');
import range = require('../lib/immutable/Range');
import utils = require('../utils/utils');
import Storage = require('./storage');

declare var sqlitePlugin: any;

var DB_NAME = 'cheminot';

var db = _.once(() => {
    var dbName = utils.isAppleMobile() ? "cheminot.db" : "cheminot";
    return sqlitePlugin.openDatabase({name: dbName, bgType: 1});
});

class NativeStorage implements Storage.IStorage {

    insertStopsTree(stopsTree): Q.Promise<void> {
        return utils.Promise.DONE();
    }

    insertDateExceptions(exceptions: any): Q.Promise<void> {
        return utils.Promise.DONE();
    }

    insertTdspGraph(tdspGraph: any): Q.Promise<void> {
        return utils.Promise.DONE();
    }

    getStopsTree(): Q.Promise<opt.IOption<any>> {
        var d = Q.defer<any>();
        db().transaction((t) => {
            t.executeSql("SELECT value FROM cache WHERE key='stopsTree'", [], (t, data) => {
                var maybeStopsTree = opt.Option(data.rows).filter((rows:any) => {
                    return rows.length > 0;
                }).map((rows:any) => {
                    var r = rows.item(0);
                    return JSON.parse(r.value);
                });
                d.resolve(maybeStopsTree);
            }, (t, error) => {
                utils.error(error);
                d.reject(error);
            });
        });
        return d.promise;
    }

    getDateExeptions(): Q.Promise<opt.IOption<any>> {
        var d = Q.defer<any>();
        db().transaction((t) => {
            t.executeSql("SELECT value FROM cache WHERE key='exceptions'", [], (t, data) => {
                var maybeExceptions = opt.Option(data.rows).filter((rows:any) => {
                    return rows.length > 0;
                }).map((rows:any) => {
                    var r = rows.item(0);
                    return JSON.parse(r.value);
                });
                d.resolve(maybeExceptions);
            }, (t, error) => {
                utils.error(error);
                d.reject(error);
            });
        });
        return d.promise;
    }

    getTdspGraph(): Q.Promise<opt.IOption<any>> {
        var d = Q.defer<any>();
        db().transaction((t) => {
            t.executeSql("SELECT * FROM tdsp", [], (t, data) => {
                var maybeTdspGraph = opt.Option(data.rows).filter((rows:any) => {
                    return rows.length > 0;
                }).map((rows:any) => {
                    var result = {};
                    for(var i=0; i<rows.length; i++) {
                        var r = rows.item(i);
                        result[r.id] = {
                            id: r.id,
                            name: r.name,
                            edges: JSON.parse(r.edges),
                            stopTimes: JSON.parse(r.stopTimes)
                        };
                    }
                    return result;
                });
                d.resolve(maybeTdspGraph);
            }, (t, error) => {
                utils.error(error);
                d.reject(error);
            });
        });
        return d.promise;
    }

    insertTrips(trips: any, progress: (string, any?) => void): Q.Promise<void> {
        return utils.Promise.DONE();
    }

    putProgress(groupIndex: number): Q.Promise<void> {
        return utils.Promise.DONE();
    }

    clearProgress(): Q.Promise<void> {
        return utils.Promise.DONE();
    }

    putVersion(version: string): Q.Promise<void> {
        return utils.Promise.DONE();
    }

    progress(): Q.Promise<opt.IOption<any>> {
        return utils.Promise.pure(new opt.None<any>());
    }

    version(): Q.Promise<opt.IOption<string>> {
        var d = Q.defer<any>();
        db().transaction((t) => {
            t.executeSql("SELECT value FROM cache WHERE key='version'", [], (t, data) => {
                var maybeVersion = opt.Option(data.rows).filter((rows:any) => {
                    return rows.length > 0;
                }).map((rows:any) => {
                    var r = rows.item(0);
                    return r.value;
                });
                d.resolve(maybeVersion);
            }, (t, error) => {
                utils.error(error);
                d.reject(error);
            });
        });
        return d.promise;
    }

    tripsByIds(ids: string[]): Q.Promise<any[]> {
        var d = Q.defer<any[]>();

        var fromCache = Storage.TRIPS.map((trips) => {
            return ids.map((id) => {
                return opt.Option(trips[id]);
            }).filter((maybeTrip) => {
                return maybeTrip.isDefined();
            }).map((trip) => {
                return trip.get();
            });
        }).getOrElse(() => {
            return [];
        });

        var fromCacheIds = fromCache.map((t:any) => {
            return t.id;
        });

        var toQuery = _.difference(ids, fromCacheIds);

        if(toQuery.length > 0) {
            db().transaction((t) => {
                var byIds = toQuery.map((id) => {
                    return 'id = "?"'.replace('?', id);
                }).join(' OR ');
                var sql = 'SELECT * FROM trips WHERE ' + byIds;
                t.executeSql(sql, [], (t, data) => {
                    var trips = new Array<any>();
                    for(var i=0; i<data.rows.length; i++) {
                        trips.push(data.rows.item(i));
                    }
                    var tripsToCache = trips.reduce((acc, trip) => {
                        trip.service = JSON.parse(trip.service);
                        trip.stopTimes = JSON.parse(trip.stopTimes);
                        acc[trip.id] = trip;
                        return acc;
                    }, {});
                    Storage.addTripsToCache(tripsToCache);
                    d.resolve(fromCache.concat(trips));
                }, (t, error) => {
                    utils.error(error);
                    d.reject(error);
                });
            });
        } else {
            d.resolve(fromCache);
        }
        return d.promise;
    }

    reset(): Q.Promise<void> {
        return utils.Promise.DONE();
    }
}

var nativeStorage: opt.IOption<Storage.IStorage> = new opt.None<Storage.IStorage>();

export function impl(): Storage.IStorage {
    return nativeStorage.getOrElse(() => {
        var storage = new NativeStorage();
        nativeStorage = new opt.Some(storage);
        return storage;
    });
}
