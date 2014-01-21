/// <reference path='../../dts/Q.d.ts'/>

import seq = require('../lib/immutable/List');
import opt = require('../lib/immutable/Option');
import utils = require('../utils/utils');
import Storage = require('./storage');

var DB_NAME = 'indexeddb_cheminot';

function createCacheStore(db: any): void {
    var store = db.createObjectStore('cache', { keyPath: 'key' });
    store.createIndex('by_key', 'key', { unique: true });
}

function createTripsStore(db: any): void {
    var store = db.createObjectStore('trips', { autoIncrement: true });
    store.createIndex('ids', 'ids', { unique: false, multiEntry: true });
}

export function db(): Q.Promise<any> {
    var d = Q.defer<any>();
    var request = window.indexedDB.open(DB_NAME);
    request.onupgradeneeded = () => {
        var db = request.result;
        createCacheStore(db);
        createTripsStore(db);
    }
    request.onsuccess = () => {
        var indexedDB = request.result;
        d.resolve(request.result);
    }
    request.onerror = (reason) => {
        d.reject('Failed to get indexedDB ' + reason);
    }
    return d.promise;
}

export function get(storeName: string, indexName: string, key: any): Q.Promise<opt.IOption<any>> {
    return db().then((DB) => {
        var d = Q.defer<opt.IOption<any>>();
        var tx = DB.transaction(storeName, "readonly");
        var store = tx.objectStore(storeName);
        var index = store.index(indexName);
        var request = index.get(key);
        request.onsuccess = () => {
            d.resolve(opt.Option<any>(request.result));
        }
        request.onerror = () => {
            var errorMessage = 'An error occured while getting ' + key + ' from store ' + storeName;
            utils.error(errorMessage);
            d.reject(errorMessage);
        };
        return d.promise;
    });
}

export function cursor(storeName: string, f: (r: any) => boolean): Q.Promise<void> {
    var d = Q.defer<void>();
    return db().then((DB) => {
        var tx = DB.transaction(storeName, "readonly");
        var store = tx.objectStore(storeName);
        var c = store.openCursor();

        c.onsuccess = (evt) => {
            var cursor = evt.target.result;
            if(cursor) {
                if(f(cursor.value)) {
                    cursor.continue();
                } else {
                    d.resolve(null);
                }
            } else {
                d.resolve(null);
            }
        }
        c.onerror = (error) => {
            d.reject(error);
        }
    }).then(() => {
        return d.promise;
    }).then(() => {
        return null;
    });
}

export function range(storeName: string, indexName: string, lowerBound: any, upperBound): Q.Promise<seq.IList<any>> {
    return db().then((DB) => {
        var d = Q.defer<seq.IList<any>>();
        var tx = DB.transaction(storeName, "readonly");
        var store = tx.objectStore(storeName);
        var index = store.index(indexName);
        var keyRange = IDBKeyRange.bound(lowerBound, upperBound, true, true);
        var request = index.get(keyRange);

        var results = seq.List<any>();
        index.openCursor(keyRange).onsuccess = function(event) {
            var cursor = event.target.result;
            if(cursor) {
                results = results.appendOne(cursor.value);
                cursor.continue();
            } else {
                d.resolve(results);
            }
        }
        return d.promise;
    });
}

export function put(storeName: string, value: any): Q.Promise<void> {
    return db().then((DB) => {
        var d = Q.defer<void>();
        var tx = DB.transaction(storeName, "readwrite");
        var store = tx.objectStore(storeName);
        store.put(value);
        tx.oncomplete = () => {
            d.resolve(null);
        }
        tx.onerror = () => {
            var errorMessage = 'An error occured while putting data ' + value + ' to store ' + storeName;
            utils.error(errorMessage);
            d.reject(errorMessage);
        }
        return d.promise;
    });
}

export function add(storeName: string, value: any): Q.Promise<void> {
    return db().then((DB) => {
        var d = Q.defer<void>();
        var tx = DB.transaction(storeName, "readwrite");
        var store = tx.objectStore(storeName);
        store.put(value);
        tx.oncomplete = () => {
            d.resolve(null);
        }
        tx.onerror = () => {
            var errorMessage = 'An error occured while putting data ' + value + ' to store ' + storeName;
            utils.error(errorMessage);
            d.reject(errorMessage);
        }
        return d.promise;
    });
}

function clearStore(name: string): Q.Promise<void> {
    return db().then((DB) => {
        var d = Q.defer<void>();
        var tx = DB.transaction(name, "readwrite");
        var store = tx.objectStore(name);
        store.clear();
        tx.oncomplete = () => {
            d.resolve(null);
        }
        tx.onerror = () => {
            var errorMessage = 'An error occured while deleting store ' + name;
            utils.error(errorMessage);
            d.reject(errorMessage);
        }
        return d.promise;
    });
}

class IndexedDBStorage implements Storage.IStorage {

    insertStopsTree(stopsTree: any): Q.Promise<void> {
        return add('cache', { key: 'treeStops', value: stopsTree });
    }

    getStopsTree(): Q.Promise<opt.IOption<any>> {
        return get('cache', 'by_key', 'treeStops').then((maybe) => {
            return maybe.map((d) => {
                return d.value;
            });
        });
    }

    insertTrips(trips: any, $progress: ZeptoCollection): Q.Promise<void> {
        return utils.sequencePromises<void>(trips.data, (trips) => {
            $progress.trigger('setup:trip');
            return add('trips', trips);
        }).then(() => {
            return null;
        });
    }

    putVersion(version: string): Q.Promise<void> {
        return put('cache', { key: 'version', value: version });
    }

    version(): Q.Promise<opt.IOption<string>> {
        return get('cache', 'by_key', 'version').then((maybe) => {
            return maybe.map((d) => {
                return d.value;
            });
        });
    }

    tripById(id: string): Q.Promise<opt.IOption<any>> {
        return Storage.TRIPS.flatMap((trips) => {
            return opt.Option(trips[id]);
        }).map((trip) => {
            return Q(new opt.Some(trip));
        }).getOrElse(() => {
            return get('trips', 'ids', id).then((maybeGroup) => {
                return maybeGroup.map((group) => {
                    Storage.addTripsToCache(group.trips);
                    return group.trips[id];
                });
            });
        });
    }

    tripsByIds(ids: seq.IList<string>, direction: opt.IOption<string>): Q.Promise<seq.IList<any>> {
        var fromCache = Storage.TRIPS.map((trips) => {
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
                return this.tripById(id).then((maybeTrip) => {
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

    reset(): Q.Promise<void> {
        var d = Q.defer<void>();
        var req = indexedDB.deleteDatabase(DB_NAME);
        req.onsuccess = () => {
            d.resolve(null);
        }
        req.onerror = (reason) => {
            d.reject(reason);
        }
        return d.promise;
    }
}

var indexedDBStorage: opt.IOption<Storage.IStorage> = new opt.None<Storage.IStorage>();

export function impl(): Storage.IStorage {
    return indexedDBStorage.getOrElse(() => {
        var storage = new IndexedDBStorage();
        indexedDBStorage = new opt.Some(storage);
        return storage;
    });
}