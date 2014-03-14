import tuple = require('lib/immutable/Tuple');
import seq = require('lib/immutable/List');
import opt = require('lib/immutable/Option');
import Storage = require('db/storage');
import planner = require('models/Planner');

export var INFINI = 9999999999999;

export function isTimeout(start: number): boolean {
    return (Date.now() - start) >= 2000;
}

export function timeRefinement(graph: any, vsId: string, veId: string, ts: number): any {
    var RESULTS = {}

    var Q = initialize(graph, vsId, ts);
    var indexed = Q._1;
    var queue = Q._2;
    var start = Date.now();
    var hasFoundTrip = false;

    while(queue.length > 0 && !isTimeout(start)) {
        queue = _.sortBy(queue, (el:any) => {
            return el.gi.arrivalTime;
        });

        var hvi = queue.shift();

        if(hvi) {
            delete(indexed[hvi.stopId]);

            RESULTS[hvi.stopId] = hvi;

            if(hvi.gi.arrivalTime === INFINI || hvi.stopId === veId) {
                if(hvi.stopId === veId) {
                    hasFoundTrip = true;
                }
                break;
            }

            refineArrivalTimes(graph, indexed, hvi);
         }
    }
    return hasFoundTrip ? RESULTS : null;
}

function refineArrivalTimes(graph: any, indexed: any, indexedVi: any) {
    var vi = graph[indexedVi.stopId];

    var departureTimes = vi.stopTimes.filter((st) => {
        return st.arrivalTime >= indexedVi.gi.arrivalTime;
    }).sort((a, b) => {
        return a.departureTime - b.departureTime;
    });

    vi.edges.forEach((vjId) => {
        var vj = graph[vjId];
        var indexedVj = indexed[vjId];

        var stopTimes = vj.stopTimes.sort((a: any, b: any) => {
            return a.arrivalTime - b.arrivalTime;
        });

        var maybeFound = _.find(stopTimes, (st: any) => {
            return _.find(departureTimes, (dt: any) => {
                return st.tripId === dt.tripId && st.arrivalTime > dt.departureTime;
            });
        });

        if(maybeFound && indexedVj) {
            if(indexedVj.gi.arrivalTime === INFINI || indexedVj.gi.arrivalTime > maybeFound.arrivalTime) {
                indexedVj.gi.arrivalTime = maybeFound.arrivalTime;
                indexedVj.tripId = maybeFound.tripId;
                indexedVj.gi.direction = maybeFound.direction;
            }
        }
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
