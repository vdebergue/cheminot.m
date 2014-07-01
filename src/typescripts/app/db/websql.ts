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
    t.executeSql('CREATE TABLE IF NOT EXISTS cache (key unique, value)', () => {
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

var db = _.once(() => {
    try {
        var db = openDatabase(DB_NAME, '1.0', 'cheminot', DB_MAX_SIZE);
        db.transaction((t) => {
            createCacheStore(t);
            createTripsStore(t);
        });
        return Q(db);
    } catch(e) {
        return db();
    }
});

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

    insertDateExceptions(exceptions: any): Q.Promise<void> {
        var d = Q.defer<void>();
        db().then((DB) => {
            DB.transaction((t) => {
                t.executeSql('INSERT INTO cache (key, value) VALUES (?, ?)', ['exceptions', JSON.stringify(exceptions)], () => {
                    d.resolve(null);
                }, (t, error) => {
                    utils.error(error);
                    d.reject(error);
                });
            });
        });
        return d.promise;
    }

    insertTdspGraph(tdspGraph: any): Q.Promise<void> {
        var d = Q.defer<void>();
        db().then((DB) => {
            DB.transaction((t) => {
                t.executeSql('INSERT INTO cache (key, value) VALUES (?, ?)', ['tdsp_graph', JSON.stringify(tdspGraph)], () => {
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
        });
        return d.promise;
    }

    getDateExeptions(): Q.Promise<opt.IOption<any>> {
        var d = Q.defer<any>();
        db().then((DB) => {
            DB.readTransaction((t) => {
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
        });
        return d.promise;
    }

    getTdspGraph(): Q.Promise<opt.IOption<any>> {
        var d = Q.defer<any>();
        db().then((DB) => {
            DB.readTransaction((t) => {
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
        });
        return d.promise;
    }

    insertTrips(trips: any, progress: (string, any?) => void): Q.Promise<void> {
        return db().then((DB) => {
            var cursor = 0;
            return utils.sequencePromises(trips.data, (group:any) => {
                var d = Q.defer<void>();
                cursor += 1;
                DB.transaction((t) => {
                    var ids = group.ids.join(';')
                    var data = LZString.compressToUTF16(JSON.stringify(group.trips));
                    t.executeSql('INSERT INTO trips (ids, trips) VALUES (?,?)', [ids, data], () => {
                        d.resolve(null);
                    }, (t, error) => {
                        utils.error(error);
                        d.reject(error);
                    });
                });
                return d.promise.then(() => {
                    progress('setup:trip', {
                        total: trips.data.length,
                        value: cursor
                    });
                });
            }).then(() => {
                return utils.Promise.DONE();
            });
        });
    }

    putVersion(version: string): Q.Promise<void> {
        var d = Q.defer<void>();
        db().then((DB) => {
            DB.transaction((t) => {
                t.executeSql('REPLACE INTO cache (key, value) VALUES (?, ?)', ['version', version], () => {
                    d.resolve(null);
                }, (t, error) => {
                    utils.error(error);
                    d.reject(error);
                });
            });
        });
        return d.promise;
    }

    version(): Q.Promise<opt.IOption<string>> {
        var d = Q.defer<any>();
        db().then((DB) => {
            DB.readTransaction((t) => {
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
            db().then((DB) => {
                DB.readTransaction((t) => {
                    var like = toQuery.map((id) => {
                        return "ids LIKE '%" + id + "%'";
                    }).join(' OR ');
                    var sql = 'SELECT * FROM trips WHERE ' + like;
                    t.executeSql(sql, [], (t, data) => {
                        var results = new Array<any>();
                        var trips = new range.Range(0, data.rows.length - 1).toList().map((index) => {
                            var group = data.rows.item(index);
                            var trips = JSON.parse(LZString.decompressFromUTF16(group.trips));
                            Storage.addTripsToCache(trips);
                            var found = seq.fromArray(toQuery).map((id) => {
                                return opt.Option(trips[id]);
                            }).flatten();
                            results = results.concat(found.asArray());
                        });
                        results = results.concat(fromCache);
                        d.resolve(results);
                    }, (t, error) => {
                        utils.error(error);
                        d.reject(error);
                    });
                });
            });
        } else {
            d.resolve(fromCache);
        }
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
