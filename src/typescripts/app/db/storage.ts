/// <reference path='../../dts/Q.d.ts'/>
/// <reference path='../../dts/underscore.d.ts'/>

import seq = require('../lib/immutable/List');
import opt = require('../lib/immutable/Option');
import utils = require('../utils/utils');
import Api = require('../ws/api');
import IndexedDB = require('./indexedDB');
import NativeDB = require('./native');
import WebSql = require('./websql');
import Setup = require('../tasks/setup');
import Cheminot = require('../Cheminot');

export interface IStorage {
    getStopsTree(): Q.Promise<opt.IOption<any>>;
    getDateExeptions(): Q.Promise<opt.IOption<any>>;
    getTdspGraph(): Q.Promise<opt.IOption<any>>;
    reset(): Q.Promise<void>;
    insertDateExceptions(exceptions: any): Q.Promise<void>;
    insertTdspGraph(tdspGraph: any): Q.Promise<void>;
    insertStopsTree(stopsTree): Q.Promise<void>;
    insertTrips(trips: Array<any>, progress: (string, any) => void): Q.Promise<void>;
    putVersion(version: string): Q.Promise<void>;
    version(): Q.Promise<opt.IOption<string>>;
    tripById(id: string): Q.Promise<opt.IOption<any>>;
    tripsByIds(ids: seq.IList<string>): Q.Promise<seq.IList<any>>;
}

export function impl(): IStorage {
    var s:any = self;
    if(!utils.isChromeEmulator()) {
        return NativeDB.impl();
    } else if(s.indexedDB) {
        return IndexedDB.impl();
    } else if(s.openDatabase) {
        return WebSql.impl();
    } else {
        utils.oops('You need a more recent device !');
    }
}

export var STOPS: opt.IOption<any> = new opt.None<any>();
export var EXCEPTIONS: opt.IOption<any> = new opt.None<any>();
export var TRIPS: opt.IOption<any> = new opt.None<any>();
export var TDSPGRAPH: opt.IOption<any> = new opt.None<any>();

export function addTripsToCache(tripsToAdd: any): void {
    TRIPS.map((trips) => {
        //TODO merge only if not already merged
        TRIPS = new opt.Some(_.extend(trips, tripsToAdd));
    }).getOrElse(() => {
        TRIPS = new opt.Some(tripsToAdd);
    });
}

export function stops(): any {
    return STOPS.getOrElse(() => {
        utils.error('STOPS not initialized !');
        return null;
    });
}

export function exceptions(): any {
    return EXCEPTIONS.getOrElse(() => {
        utils.error('exceptions not initialized !');
        return null;
    });
}

export function tdspGraph(): any {
    return TDSPGRAPH.getOrElse(() => {
        utils.error('tdspGraph not initialized !');
        return null;
    });
}

export function isInitialized(): boolean {
    return STOPS.isDefined() && EXCEPTIONS.isDefined() && TDSPGRAPH.isDefined();
}

export function forceInstallDB(config: any, STORAGE: IStorage, progress: (string, any?) => void): Q.Promise<void> {
    utils.log('Installing from scratch DB');
    return utils.measureF(() => Api.db(config, progress), 'fetchApi').then((db) => {
        return STORAGE.reset().then(() => {
            return utils.measureF(() => STORAGE.insertStopsTree(db.treeStops), 'persistStops');
        }).then(() => {
            return utils.measureF(() => STORAGE.insertDateExceptions(db.exceptions), 'persistExceptions');
            progress('setup:exceptions');
        }).then(() => {
            progress('setup:stops');
            return utils.measureF(() => STORAGE.insertTrips(db.trips, progress), 'persistTrips');
        }).then(() => {
            return utils.measureF(() => STORAGE.insertTdspGraph(db.tdspGraph), 'persistTdspGraph');
            progress('setup:tdspgraph');
        }).then(() => {
            return STORAGE.putVersion(db.version);
        }).then(() => {
            progress('setup:done');
        });
    });
}

export function cacheDB(progress: (string, any?) => void): Q.Promise<void> {
    var config = Cheminot.config();
    return Api.db(config, progress).then((db) => {
        STOPS = new opt.Some(db.treeStops);
        EXCEPTIONS = new opt.Some(db.exceptions);
        TDSPGRAPH = new opt.Some(db.tdspGraph);
        db.trips.data.forEach((d) => {
            addTripsToCache(d.trips);
        });
    });
}

export function installDB(config: any, progress: (string, any?) => void): Q.Promise<void> {
    var STORAGE = impl();
    var d = Q.defer<any>();
    if(STOPS.isEmpty()) {
        STORAGE.version().then((maybeVersion) => {
            STORAGE.getStopsTree().then((maybeStops) => {
                STORAGE.getDateExeptions().then((maybeExceptions) => {
                    STORAGE.getTdspGraph().then((maybeTdspGraph) => {
                        if(maybeVersion.isDefined() && maybeStops.isDefined() && maybeExceptions.isDefined()) {
                            maybeStops.foreach((stops) => {
                                STOPS = new opt.Some(stops);
                            });
                            maybeExceptions.foreach((exceptions) => {
                                EXCEPTIONS = new opt.Some(exceptions);
                            });
                            maybeTdspGraph.foreach((tdspGraph) => {
                                TDSPGRAPH = new opt.Some(tdspGraph);
                            });
                            d.resolve(null);
                        } else {
                            cacheDB(progress).then(() => {
                                d.resolve(null);
                            });
                            Setup.start(progress).then(() => {
                                d.resolve(null);
                            });
                        }
                    });
                });
            });
        }).catch((reason) => {
            utils.error(JSON.stringify(reason));
            d.reject(reason);
        });
    } else {
        d.resolve(null);
    }
    return d.promise;
}
