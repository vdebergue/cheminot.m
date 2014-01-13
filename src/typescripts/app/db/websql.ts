/// <reference path='../../dts/Q.d.ts'/>

import seq = require('../lib/immutable/List');
import opt = require('../lib/immutable/Option');
import range = require('../lib/immutable/Range');
import utils = require('../utils/utils');
import Storage = require('./storage');

declare var openDatabase: any;
declare var LZString: any;

var DB_NAME = 'websql_cheminot';
var DB_MAX_SIZE = 40*1024*1024;

function createCacheStore(t: any): Q.Promise<void> {
    var d = Q.defer<void>();
    t.executeSql('CREATE TABLE cache (key, value)', () => {
        d.resolve(null);
    }, (t, error) => {
        d.resolve(null);
    });
    return d.promise;
}

function createTripsStore(t: any): Q.Promise<void> {
    var d = Q.defer<void>();
    t.executeSql('CREATE TABLE IF NOT EXISTS trips (ids, trips)', () => {
        d.resolve(null);
    }, (t, error) => {
        d.resolve(null);
    });
    return d.promise;
}

function db(): Q.Promise<any> {
    try {
        var db = openDatabase(DB_NAME, '', 'cheminot', DB_MAX_SIZE, (db) => {
            if(db.version === '') {
                db.transaction((t) => {
                    createCacheStore(t);
                    createTripsStore(t);
                });
            }
        });
    } catch(e) {
        return db();
    }
    return Q(db);
}

function dropTable(name: string): Q.Promise<void> {
    var d = Q.defer<void>();
    db().then((DB) => {
        DB.transaction((t) => {
            t.executeSql('DROP TABLE ' + name, [], () => {
                d.resolve(null);
            }, (t, error) => {
                utils.error(error);
                d.reject(error);
            });
        });
    });
    return d.promise;
}

class WebSqlStorage implements Storage.IStorage {

    insertStopsTree(stopsTree): Q.Promise<void> {
        var d = Q.defer<void>();
        db().then((DB) => {
            DB.transaction((t) => {
                t.executeSql('INSERT INTO cache (key, value) VALUES (?, ?)', ['stopsTree', JSON.stringify(stopsTree)], () => {
                    d.resolve(null);
                }, (t, error) => {
                    utils.error(error);
                    d.reject(error);
                });
            });
        });
        return d.promise;
    }

    getStopsTree(): Q.Promise<opt.IOption<any>> {
        var d = Q.defer<any>();
        db().then((DB) => {
            DB.readTransaction((t) => {
                t.executeSql("SELECT value FROM cache WHERE key='stopsTree'", [], (t, data) => {
                    var maybeStopsTree = opt.Option(data.rows.item(0)).map((r:any) => {
                        return JSON.parse(r.value);
                    });
                    d.resolve(maybeStopsTree);
                }, (t, error) => {
                    utils.error(error);
                    d.reject(error);
                });
            });
        });
        return d.promise;
    }

    insertTrips(trips: any): Q.Promise<void> {
        return db().then((DB) => {
            return utils.sequencePromises(trips.data, (group:any) => {
                var d = Q.defer<void>();
                DB.transaction((t) => {
                    var ids = group.ids.join(';')
                    var data = LZString.compress(JSON.stringify(group.trips));
                    t.executeSql('INSERT INTO trips (ids, trips) VALUES (?, ?)', [ids , data], () => {
                        d.resolve(null);
                    }, (t, error) => {
                        utils.error(error);
                        d.reject(error);
                    });
                });
                return d.promise;
            }).then(() => {
                return null;
            });
        });
    }

    tripById(id: string): Q.Promise<opt.IOption<any>> {
        return Storage.TRIPS.flatMap((trips) => {
            return opt.Option(trips[id]);
        }).map((trip) => {
            utils.log("trip from cache");
            return Q(new opt.Some(trip));
        }).getOrElse(() => {
            var d = Q.defer<any>();
            db().then((DB) => {
                DB.readTransaction((t) => {
                    t.executeSql("SELECT * FROM trips WHERE ids LIKE '%" + id + "%'", [], (t, data) => {
                        d.resolve(
                            opt.Option<any>(data.rows.item(0)).map((group) => {
                                var trips = LZString.decompress(group.trips)
                                Storage.addTripsToCache(trips);
                                return trips[id];
                            })
                        );
                    }, (t, error) => {
                        utils.error(error);
                        d.reject(error);
                    });
                });
            });
            return d.promise;
        });
    }

    tripsByIds(ids: seq.IList<string>, direction: opt.IOption<string>): Q.Promise<seq.IList<any>> {
        var d = Q.defer<seq.IList<any>>();
        var tripsFromCache = Storage.TRIPS.map((trips) => {
            return seq.List.apply(null, ids).flatMap((id) => {
                return opt.Option(trips[id]);
            });
        }).getOrElse(() => {
            return new seq.Nil();
        });
        var tripIdsFromCache = tripsFromCache.map((t:any) => {
            return t.id;
        });
        var toQuery = _.difference(ids.asArray(), tripsFromCache.asArray())
        db().then((DB) => {
            DB.readTransaction((t) => {
                var like = toQuery.map((id) => {
                    return "LIKE '%" + id + "%'";
                }).join(' OR ');
                console.log(like);
                var sql = 'SELECT * FROM trips WHERE ids ' + like;
                t.executeSql(sql, [], (t, data) => {
                    var results = new seq.Nil<any>();
                    var trips = new range.Range(0, data.rows.length).toList().map((index) => {
                        var group = data.rows(index);
                        Storage.addTripsToCache(group.trips);
                        var found = seq.List.apply(null, toQuery).flatMap((id) => {
                            return opt.Option(group.trips[id]);
                        });
                        results = results.prepend(found);
                    });
                    results = results.prepend(tripsFromCache);
                    d.resolve(results);
                }, (t, error) => {
                    utils.error(error);
                    d.reject(error);
                });
            });
        });
        return d.promise;
    }

    reset(): Q.Promise<void> {
        return Q.all([dropTable('cache'), dropTable('trips')]).then(() => {
            return db().then((DB) => {
                return DB.transaction((t) => {
                    return Q.all([createTripsStore(t), createCacheStore(t)]);
                });
            });
        });
    }
}

var webSqlStorage: opt.IOption<Storage.IStorage> = new opt.None<Storage.IStorage>();

export function impl(): Storage.IStorage {
    return webSqlStorage.getOrElse(() => {
        var storage = new WebSqlStorage();
        webSqlStorage = new opt.Some(storage);
        return storage;
    });
}
