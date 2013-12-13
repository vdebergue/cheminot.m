/// <reference path='../../dts/Q.d.ts'/>

import opt = require('../lib/immutable/Option');

var DB_NAME = 'cheminot';

function createTripsStore(db: any): void {
    var store = db.createObjectStore('trips', { keyPath: 'id' });
    store.createIndex("by_id", "id", { unique: true });
    store.createIndex("by_id_direction", ["id", "direction"]);
}

function createCacheStore(db: any): void {
    var store = db.createObjectStore('cache', { keyPath: 'key' });
    store.createIndex("by_key", "key", { unique: true });
}

export function db(): Q.Promise<any> {
    var d = Q.defer<any>();
    var request = window.indexedDB.open(DB_NAME);
    request.onupgradeneeded = () => {
        var db = request.result;
        createTripsStore(db);
        createCacheStore(db);
    }
    request.onsuccess = () => {
        var indexedDB = request.result;
        d.resolve(request.result);
    }
    request.onerror = () => {
        d.resolve('Failed to get indexedDB');
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
            console.error(errorMessage);
            d.reject(errorMessage);
        };
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
            console.error(errorMessage);
            d.reject(errorMessage);
        }
        return d.promise;
    });
}
