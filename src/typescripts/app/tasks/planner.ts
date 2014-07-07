import Cheminot = require('../Cheminot');
import Storage = require('../db/storage');
import utils = require('../utils/utils');
import opt = require('../lib/immutable/Option');

var WORKER = new opt.None<Worker>();
var config = Cheminot.config();

export function init(): Worker {
    return WORKER.getOrElse(() => {
        var worker = new Worker(config.workers.planner);
        WORKER = new opt.Some(worker);
        worker.postMessage({
            event: 'init',
            data: {
                tdspGraph: Storage.tdspGraph(),
                exceptions: Storage.exceptions()
            }
        });
        return worker;
    });
}

export function stop(): void {
    var worker = init();
    worker.postMessage({
        event: 'cancel'
    });
}

export function lookForBestTrip(vsId: string, veId: string, stopTimes: Array<number>, progress: (data: any) => boolean): Q.Promise<any> {
    var d = Q.defer<any>();
    var worker = init();

    worker.postMessage({
        event: 'search',
        stopTimes: stopTimes,
        config: config,
        vsId: vsId,
        veId: veId
    });

    worker.onmessage = (e) => {
        var msg = e.data;
        if(msg.event == 'debug') {
            utils.log(msg.data);
        } else if(msg.event == 'progress') {
            var toContinue = progress(msg.data);
            giveBackResult(worker, 'progress', 'lookForBestTrip', toContinue);
        } else if(msg.event == 'query') {
            performQuery(worker, msg.data);
        } else {
            if(msg.data) {
                d.resolve(msg.data);
            } else {
                d.reject("not found")
            }
        }
    }

    worker.onerror = (e) => {
        d.reject(e);
    };

    return d.promise;
}

function giveBackResult(worker: any, event: string, name: string, data: any) {
    worker.postMessage({
        event: event,
        data: data,
        name: name
    });
}

function performQuery(worker: any, q: any): void {
    var params = q.params;
    if(q.name == 'installDB') {
        Storage.installDB.apply(null, params).then(() => {
            giveBackResult(worker, 'query', 'installDB', null);
        });
    } else if(q.name == 'tripsByIds') {
        Storage.impl().tripsByIds.apply(null, params).then((data) => {
            giveBackResult(worker, 'query', 'tripsByIds', data);
        });
    } else if(q.name == 'tdspGraph') {
        giveBackResult(worker, 'query', 'tdspGraph', Storage.tdspGraph());
    } else if(q.name == 'exceptions') {
        giveBackResult(worker, 'query', 'exceptions', Storage.exceptions());
    }
}
