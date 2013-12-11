/// <reference path='../../dts/Q.d.ts'/>

import opt = require('../lib/immutable/Option');
import Api = require('../ws/api');
import IStorage = require('./IStorage');

var DB_IN_MEMORY: opt.IOption<IStorage> = new opt.None<IStorage>();
var DB_IN_BROWSER: opt.IOption<any> = new opt.None<any>();

var DB_NAME = 'cheminot';
var TABLE_NAME = 'graphs';
var INDEX_NAME = 'by_name';
var KEY = 'current';

function indexedDB(): Q.Promise<any> {
    return DB_IN_BROWSER.getOrElse(() => {
        var d = Q.defer<IStorage>();
        var request = window.indexedDB.open(DB_NAME);
        request.onupgradeneeded = () => {
            var cheminotDB = request.result;
            DB_IN_BROWSER = new opt.Some(cheminotDB);
            var graphCache = cheminotDB.createObjectStore(TABLE_NAME, {keyPath: "name"});
            graphCache.createIndex(INDEX_NAME, "name", {unique: true});
        }
        request.onsuccess = () => {
            var indexedDB = request.result;
            d.resolve(request.result);
        }
        return d.promise;
    });
}

function loadFromBrowser(): Q.Promise<opt.IOption<IStorage>> {
    return indexedDB().then<opt.IOption<IStorage>>((cheminotDB) => {
        var d = Q.defer<opt.IOption<IStorage>>();
        var tx = cheminotDB.transaction(TABLE_NAME, "readonly");
        var graphCache = tx.objectStore(TABLE_NAME);
        var index = graphCache.index(INDEX_NAME);
        var request = index.get(KEY);
        request.onsuccess = () => {
            var maybeData = request.result ? request.result.data : null;
            d.resolve(opt.Option<IStorage>(maybeData));
        }
        request.onerror = () => {
            console.log('error while getting ' + KEY + ' from indexed DB');
            d.reject('Error while DB from indexedDB !');
        };
        return d.promise;
    });
}

function persistDB(db: IStorage): Q.Promise<void> {
    console.log(db);
    return indexedDB().then((cheminotDB) => {
        var d = Q.defer<void>();
        var tx = cheminotDB.transaction(TABLE_NAME, "readwrite");
        var graphs = tx.objectStore(TABLE_NAME);
        graphs.put({ name: KEY, data: db});
        tx.oncomplete = () => {
            d.resolve(null);
        }
        return d.promise;
    });
}

export function loadDB(): Q.Promise<IStorage> {
    var d = Q.defer<IStorage>();
    if(DB_IN_MEMORY.isEmpty()) {
        loadFromBrowser().then((maybeCheminotDB) => {
            maybeCheminotDB.map((db) => {
                DB_IN_MEMORY = new opt.Some(db);
                d.resolve(db);
            }).getOrElse(() => {
                Api.db().then((db) => {
                    DB_IN_MEMORY = new opt.Some(db);
                    persistDB(db).then(() => {
                        d.resolve(db);
                    });
                }).fail((reason) => {
                    d.reject(reason);
                });
            });
        });
    } else {
        d.resolve(DB_IN_MEMORY);
    }
    return d.promise;
}

export function maybeDB(): opt.IOption<IStorage> {
    return DB_IN_MEMORY;
}

export function db(): IStorage {
    return maybeDB().getOrElse(() => {
        console.error('DB not initialized !');
        return null;
    });
}