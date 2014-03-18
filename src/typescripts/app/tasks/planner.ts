
export function lookForBestTrip(vsId: string, veId: string, vsTripId: string, ts: number): Q.Promise<any> {
    var d = Q.defer<any>();

    var worker = new Worker('app/workers/planner.js');
    worker.postMessage(JSON.stringify({
        event: 'search',
        vsId: vsId,
        veId: veId,
        vsTripId: vsTripId,
        ts: ts
    }));

    worker.onmessage = (e) => {
        d.resolve(JSON.parse(e.data));
        worker.terminate();
    }

    worker.onerror = (e) => {
        d.reject(e);
        worker.terminate();
    };

    return d.promise;
}
