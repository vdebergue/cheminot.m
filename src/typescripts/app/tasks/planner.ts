import Cheminot = require('../Cheminot');
import Storage = require('../db/storage');
import utils = require('../utils/utils');

export function lookForBestTrip(vsId: string, veId: string, stopTimes: Array<number>, max: number, progress: (data: any) => void): Q.Promise<any> {
    var d = Q.defer<any>();
    var config = Cheminot.config();
    var worker = new Worker(config.workers.planner);

    worker.postMessage(JSON.stringify({
        event: 'search',
        stopTimes: stopTimes,
        config: config,
        vsId: vsId,
        veId: veId,
        max: max
    }));

    worker.onmessage = (e) => {
        var msg = JSON.parse(e.data)
        if(msg.event == 'debug') {
            utils.log(msg.data);
        } else if(msg.event == 'progress') {
            progress(msg.data);
        } else if(msg.event == 'query') {
            performQuery(worker, msg.data);
        } else {
            if(msg.data) {
                d.resolve(msg.data);
            } else {
                d.reject("not found")
            }
            worker.terminate();
        }
    }

    worker.onerror = (e) => {
        d.reject(e);
        worker.terminate();
    };

    return d.promise;
}

function giveBackQueryResult(worker: any, name: string, data: any) {
    worker.postMessage(JSON.stringify({
        event: 'query',
        data: data
    }));
}

function performQuery(worker: any, q: any): void {
    var params = q.params;
    if(q.name == 'installDB') {
        Storage.installDB.apply(null, params).then(() => {
            giveBackQueryResult(worker, 'installDB', null);
        });
    } else if(q.name == 'tripsByIds') {
        Storage.impl().tripsByIds.apply(null, params).then((data) => {
            giveBackQueryResult(worker, 'tripsByIds', data);
        });
    } else if(q.name == 'tdspGraph') {
        giveBackQueryResult(worker, 'tdspGraph', Storage.tdspGraph());
    } else if(q.name == 'exceptions') {
        giveBackQueryResult(worker, 'exceptions', Storage.exceptions());
    }
}
