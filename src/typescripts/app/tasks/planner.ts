import Cheminot = require('../Cheminot');

export function lookForBestTrip(vsId: string, veId: string, stopTimes: Array<number>, max: number): Q.Promise<any> {
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
        if(msg.data) {
            d.resolve(msg.data);
        } else {
            d.reject("not found")
        }
        worker.terminate();
    }

    worker.onerror = (e) => {
        d.reject(e);
        worker.terminate();
    };

    return d.promise;
}
