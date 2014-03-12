import tuple = require('lib/immutable/Tuple');
import seq = require('lib/immutable/List');
import opt = require('lib/immutable/Option');
import Storage = require('db/storage');
import planner = require('models/Planner');

export var INFINI = 9999999999999;

export function timeRefinement(graph: any, vsId: string, veId: string, ts: number, exceptions: any): any {

    var RESULTS = {}

    var Q = initialize(graph, vsId, ts);
    var indexed = Q._1;
    var queue = Q._2;

    // STARTING NODE
    var hvs = queue.shift();
    delete(indexed[hvs.stopId]);

    RESULTS[hvs.stopId] = hvs;

    console.log('--->')
    console.log(hvs.gi.tripId);
    console.log('<---')

    refineArrivalTimes(graph, indexed, hvs, exceptions, (stopTime) => {
        return (stopTime.arrivalTime > hvs.gi.arrivalTime) &&
            (stopTime.tripId === hvs.gi.tripId) &&
            (stopTime.direction === hvs.gi.direction);
    });

    // OTHERS
    var timeout = 15;
    var start = Date.now();
    // while(queue.length > 0 || ((Date.now() - start) < timeout)) {
    //     queue = _.sortBy(queue, (el:any) => {
    //         return el.gi.arrivalTime;
    //     });

    //     var hvi = queue.shift();
    //     if(hvi.gi.arrivalTime === INFINI) {
    //         console.log('BREAK');
    //         break;
    //     }

    //     if(hvi) {
    //         delete(indexed[hvi.stopId]);

    //         RESULTS[hvi.stopId] = hvi;

    //         refineArrivalTimes(graph, indexed, hvi, (stopTime) => {
    //             return stopTime.arrivalTime > hvi.gi.arrivalTime
    //         });
    //     }
    // }

    if((Date.now() - start) > timeout) {
        console.log('Timeout !');
    }

    return RESULTS;
}

function refineArrivalTimes(graph: any, indexed: any, indexedVi: any, exceptions: any, filter: (stopTime: any) => boolean) {
    var vi = graph[indexedVi.stopId];

    console.log(indexedVi);

    var nextDepartures = vi.stopTimes.filter((st) => {
        return st.departureTime > indexedVi.gi.arrivalTime;
    });

    var tripIds = nextDepartures.map((x) => {
        return x.tripId;
    });

    Storage.impl().tripsByIds(seq.List.apply(null, tripIds)).then((trips) => {

        var validTrips = trips.filter((trip) => {
            return planner.Trip.isValidOn(trip, new Date(), exceptions);
        });

        var validDepartures = nextDepartures.filter((d) => {
            return validTrips.exists((t) => {
                return t.id === d.tripId;
            });
        });

        console.log(_(_.sortBy(validDepartures, (d:any) => {
            return d.departureTime;
        })).map((d:any) => {
            return new Date(d.departureTime) + " " + d.tripId;
        }));

        vi.edges.forEach((vjId) => {

            var vj = graph[vjId];

            var filtered = vj.stopTimes.filter((st) => {
                return filter(st);
            })

            var sorted = _.sortBy(filtered, (st:any) => {
                return st.arrivalTime;
            });

            var maybeFound = sorted[0];

            var indexedVj = indexed[vjId];

            if(maybeFound && indexedVj) {
                if(indexedVj.gi.arrivalTime === INFINI || indexedVj.gi.arrivalTime > maybeFound.arrivalTime) {
                    indexedVj.gi.arrivalTime = maybeFound.arrivalTime;
                    indexedVj.tripId = maybeFound.tripId;
                    indexedVj.gi.direction = maybeFound.direction;
                }
            }
        });
    }).fail((reason) => {
        console.log(reason);
    });
}

export function initialize(graph: any, vsId: string, ts: number): tuple.Tuple2<any, any> {
    var vs = graph[vsId];
    var tsString = moment(ts).format('HH:mm:ss');

    var stopTimeTs:any = _.find(vs.stopTimes, (stopTime:any) => {
        return moment(stopTime.departureTime).format('HH:mm:ss') === tsString;
    });

    var gs = new ArrivalTime(vs.id, stopTimeTs.arrivalTime, stopTimeTs.tripId, stopTimeTs.direction);

    var indexed = {};
    var queue = [];
    var xs = {
        stopId: vs.id,
        gi: gs
    };
    indexed[vs.id] = xs;
    queue.push(xs);

    Object.keys(graph).map((viId) => {
        var vi = graph[viId];
        if(vi.id != vsId) {
            var gi = new ArrivalTime(vi.id, INFINI, null, null);
            var xi = {
                stopId: vi.id,
                gi: gi
            }
            indexed[vi.id] = xi;
            queue.push(xi);
        }
    });

    return new tuple.Tuple2(indexed, queue);
}

export class ArrivalTime {
    arrivalTime: number;
    tripId: string;
    stopId: string;
    direction: string;

    constructor(stopId: string, arrivalTime: number, tripId: string, direction) {
        this.stopId = stopId;
        this.arrivalTime = arrivalTime;
        this.tripId = tripId;
        this.direction = direction;
    }
}
