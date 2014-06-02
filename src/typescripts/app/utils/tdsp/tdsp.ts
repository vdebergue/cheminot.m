import tr = require('./timeRefinement');
import ps = require('./pathSelection');

export function isTimeout(start: number): boolean {
    return (Date.now() - start) >= 2000;
}

export function lookForBestTrip(graph: any, vsId: string, veId: string, vsTripId: string, ts: number, exceptions: any): Q.Promise<any> {
    return tr.timeRefinement(graph, vsId, veId, vsTripId, ts, exceptions).then((arrivalTimes) => {
        if(arrivalTimes) {
            return ps.pathSelection(graph, arrivalTimes, ts, vsId, veId);
        } else {
            return null;
        }
    });
}
