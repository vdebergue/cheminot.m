
export function lookForBestTrip(vsId, veId, stopTimes): Q.Promise<any> {
    var d = Q.defer<any>();

    var worker = new Worker('app/workers/planner.js');
    worker.postMessage(JSON.stringify({
        event: 'search',
        stopTimes: stopTimes,
        config: window['CONFIG'],
        vsId: vsId,
        veId: veId
    }));

    worker.onmessage = (e) => {
        var msg = JSON.parse(e.data)
        console.log('DONE');
        console.log(msg);
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
