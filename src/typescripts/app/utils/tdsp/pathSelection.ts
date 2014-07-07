import tdsp = require('./tdsp');

export function pathSelection(graph: any, arrivalTimes: any, ts: number, vsId: string, veId: string): any {

    var vs = graph[vsId];
    var vj = graph[veId];
    var arrivalTimeVe = arrivalTimes[vj.id];
    var p = [];
    var start = Date.now();
    var hasFoundTrip = false;

    while(vj.id != vs.id && !tdsp.isTimeout(start)) {
        var arrivalTimeVj = arrivalTimes[vj.id];

        for(var i=0; i<vj.edges.length; i++) {

            var vi = graph[vj.edges[i]];
            var arrivalTimeVi = arrivalTimes[vi.id];

            if(arrivalTimeVi) {

                var maybeDepartureTime = _.find(vi.stopTimes, (st:any) => {
                    return st.tripId === arrivalTimeVj.gi.tripId && st.departureTime < arrivalTimeVj.gi.arrivalTime;
                });

                if(maybeDepartureTime) {
                    vj = vi;
                    p.unshift(arrivalTimeVj);
                    hasFoundTrip = vj.id === vs.id;
                    break;
                }
            }
        }
    }

    p.unshift(arrivalTimes[vsId]);

    return hasFoundTrip ? p : null;
}