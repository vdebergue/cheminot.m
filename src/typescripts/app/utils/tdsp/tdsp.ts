import tr = require('./timeRefinement');
import ps = require('./pathSelection');

export function isTimeout(start: number): boolean {
    return (Date.now() - start) >= 10000;
}

export function lookForBestTrip(Storage: any, graph: any, vsId: string, veId: string, vsTripId: string, ts: number, exceptions: any, debug: (msg: any) => void): Q.Promise<any> {
    return tr.timeRefinement(Storage, graph, vsId, veId, vsTripId, ts, exceptions, debug).then((arrivalTimes) => {
        if(arrivalTimes) {
            return ps.pathSelection(graph, arrivalTimes, ts, vsId, veId);
        } else {
            return null;
        }
    });
}
