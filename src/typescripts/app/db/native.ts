/// <reference path='../../dts/Q.d.ts'/>

import seq = require('../lib/immutable/List');
import opt = require('../lib/immutable/Option');
import range = require('../lib/immutable/Range');
import utils = require('../utils/utils');
import Storage = require('./storage');

declare var sqlitePlugin: any;

var DB_NAME = 'cheminot';

var db = _.once(() => {
    var dbName = utils.isAppleMobile() ? "cheminot.db" : "cheminot";
    return sqlitePlugin.openDatabase({name: dbName});
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
            t.executeSql("SELECT value FROM cache WHERE key='tdsp_graph'", [], (t, data) => {
                var maybeTdspGraph = opt.Option(data.rows).filter((rows:any) => {
                    return rows.length > 0;
                }).map((rows:any) => {
                    var r = rows.item(0);
                    return JSON.parse(r.value);
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

    tripById(id: string): Q.Promise<opt.IOption<any>> {
        return Storage.TRIPS.flatMap((trips) => {
            return opt.Option(trips[id]);
        }).map((trip) => {
            return Q(new opt.Some(trip));
        }).getOrElse(() => {
            var d = Q.defer<any>();
            db().transaction((t) => {
                t.executeSql("SELECT * FROM trips WHERE ids LIKE '%" + id + "%'", [], (t, data) => {
                    d.resolve(
                        opt.Option<any>(data.rows).filter((rows) => {
                            return rows.length > 0;
                        }).map((rows) => {
                            var group = rows.item(0);
                            var trips = JSON.parse(group.trips);
                            Storage.addTripsToCache(trips);
                            return trips[id];
                        })
                    );
                }, (t, error) => {
                    utils.error(error);
                    d.reject(error);
                });
            });
            return d.promise;
        });
    }

    tripsByIds(ids: seq.IList<string>): Q.Promise<seq.IList<any>> {
        var d = Q.defer<seq.IList<any>>();

        var tripsFromCache = Storage.TRIPS.map((trips) => {
            return ids.map((id) => {
                return opt.Option(trips[id]);
            }).flatten();
        }).getOrElse(() => {
            return new seq.Nil();
        });

        var tripIdsFromCache = tripsFromCache.map((t:any) => {
            return t.id;
        });

        var toQuery = _.difference(ids.asArray(), tripIdsFromCache.asArray());

        if(toQuery.length > 0) {
            db().transaction((t) => {
                var like = toQuery.map((id) => {
                    return "ids LIKE '%" + id + "%'";
                }).join(' OR ');
                var sql = 'SELECT * FROM trips WHERE ' + like;
                t.executeSql(sql, [], (t, data) => {
                    var results = new seq.Nil<any>();
                    var trips = new range.Range(0, data.rows.length - 1).toList().map((index) => {
                        var group = data.rows.item(index);
                        var trips = JSON.parse(group.trips);
                        Storage.addTripsToCache(trips);
                        var found = seq.fromArray(toQuery).map((id) => {
                            return opt.Option(trips[id]);
                        }).flatten();
                        results = results.prepend(found);
                    });
                    results = results.prepend(tripsFromCache);
                    d.resolve(results);
                }, (t, error) => {
                    utils.error(error);
                    d.reject(error);
                });
            });
        } else {
            d.resolve(tripsFromCache);
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
