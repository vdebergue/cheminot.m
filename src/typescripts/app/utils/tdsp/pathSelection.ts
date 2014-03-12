import tuple = require('lib/immutable/Tuple');

export function pathSelection(graph: any, arrivalTimes: any, ts: number, vsId: string, veId: string): any {

    var vs = graph[vsId];
    var vj = graph[veId];
    var p = [];

    while(vj.stopId != vs.stopId) {
        var gj = arrivalTimes[vj.stopId];
        for(var i=0; i<gj.edges.length; i++) {
            var vi = gj.edges[i];
            var gi = arrivalTimes[vi.stopId];
            if((gj.tripId === gi.tripId) && (gj.direction === gi.direction) && (gj.arrivalTime > gi.arrivalTime)) {
                p.unshift(new tuple.Tuple2(gi, gj));
                break;
            }
        }
    }

    return p;
}