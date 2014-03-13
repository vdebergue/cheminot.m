
export function pathSelection(graph: any, arrivalTimes: any, ts: number, vsId: string, veId: string): any {

    var vs = graph[vsId];
    var vj = graph[veId];
    var arrivalTimeVe = arrivalTimes[vj.id];
    var p = [arrivalTimeVe];

    while(vj.id != vs.id) {
        var arrivalTimeVj = arrivalTimes[vj.id];

        for(var i=0; i<vj.edges.length; i++) {

            var vi = graph[vj.edges[i]];
            var arrivalTimeVi = arrivalTimes[vi.id];

            if(arrivalTimeVi) {

                var maybeDepartureTime= _.find(vi.stopTimes, (st:any) => {
                    return st.tripId === arrivalTimeVj.tripId && st.departureTime < arrivalTimeVj.gi.arrivalTime;
                });

                if(maybeDepartureTime) {
                    vj = vi;
                    p.unshift(arrivalTimeVj);
                    break;
                }
            }
        }
    }

    p.unshift(arrivalTimes[vsId]);

    return p;
}