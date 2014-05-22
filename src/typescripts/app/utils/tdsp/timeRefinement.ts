import tuple = require('lib/immutable/Tuple');
import seq = require('lib/immutable/List');
import opt = require('lib/immutable/Option');
import Storage = require('db/storage');
import planner = require('models/Planner');
import tdsp = require('./tdsp');

export var INFINI = 9999999999999;

function tripsAvailability(tripIds: seq.IList<string>, exceptions: any): Q.Promise<any> {
    var today = new Date();
    return Storage.impl().tripsByIds(tripIds).then((trips) => {
        return tripIds.foldLeft({}, function(acc, id) {
            return trips.find((trip) => {
                return trip.id === id;
            }).map((trip) => {
                acc[id] = planner.Trip.isValidOn(trip, today, exceptions);
                return acc;
            }).getOrElse(() => {
                acc[id] = false;
                return acc;
            });
        });
    });
}

export function timeRefinement(graph: any, vsId: string, veId: string, vsTripId: string, ts: number, exceptions: any): Q.Promise<any> {
    var RESULTS = {}

    var initializedQ = initialize(graph, vsTripId, vsId, ts);
    var indexed = initializedQ._1;
    var queue = initializedQ._2;
    var start = Date.now();

    function loop(queue, RESULTS): Q.Promise<any> {

        var isTimeout = tdsp.isTimeout(start);

        if(queue.length > 0 && !isTimeout) {

            queue = _.sortBy(queue, (el:any) => {
                return el.gi.arrivalTime;
            });

            var hvi = queue.shift();

            if(hvi) {
                delete(indexed[hvi.stopId]);

                RESULTS[hvi.stopId] = hvi;

                if(hvi.gi.arrivalTime === INFINI || hvi.stopId === veId) {
                    if(hvi.stopId === veId) {
                        return Q.resolve(RESULTS);
                    } else {
                        return Q.reject("break")
                    }
                }

                return refineArrivalTimes(graph, indexed, hvi, exceptions, (hvi.stopId === vsId)).then(() => {
                    return loop(queue, RESULTS);
                });
            }

        } else {
            if(isTimeout) {
                return Q.reject('timeout');
            } else {
                return Q.reject('empty');
            }
        }
    }

    return loop(queue, RESULTS);
}

function refineArrivalTimes(graph: any, indexed: any, indexedVi: any, exceptions: any, isStart: boolean): Q.Promise<void> {
    var vi = graph[indexedVi.stopId];

    var tripIds = seq.List.apply(null, vi.stopTimes.map((st) => {
        return st.tripId;
    }));

    return tripsAvailability(tripIds, exceptions).then((availabities) => {
        return vi.stopTimes.filter((st) => {
            return availabities[st.tripId] && (st.arrivalTime >= indexedVi.gi.arrivalTime);
        }).sort((a, b) => {
            return a.departureTime - b.departureTime;
        });

    }).then((departureTimes) => {

        vi.edges.forEach((vjId) => {
            var vj = graph[vjId];
            var indexedVj = indexed[vjId];

            var stopTimes = vj.stopTimes.filter((st) => {
                return isStart ? (indexedVi.gi.tripId === st.tripId) : true;
            }).sort((a: any, b: any) => {
                return a.arrivalTime - b.arrivalTime;
            });

            var maybeFound = _.find(stopTimes, (st: any) => {
                return _.find(departureTimes, (dt: any) => {
                    return (st.tripId === dt.tripId) && (st.arrivalTime > dt.departureTime);
                });
            });

            if(maybeFound && indexedVj) {
                if(indexedVj.gi.arrivalTime === INFINI || indexedVj.gi.arrivalTime > maybeFound.arrivalTime) {
                    indexedVj.gi.arrivalTime = maybeFound.arrivalTime;
                    indexedVj.gi.tripId = maybeFound.tripId;
                    indexedVj.gi.direction = maybeFound.direction;
                    indexedVj.gi.departureTime = maybeFound.departureTime;
                }
            }

        });
    });
}

export function initialize(graph: any, vsTripId: string, vsId: string, ts: number): tuple.Tuple2<any, any> {
    var vs = graph[vsId];
    var tsString = moment(ts).format('HH:mm:ss');

    var stopTimeTs:any = _.find(vs.stopTimes, (stopTime:any) => {
        return moment(stopTime.departureTime).format('HH:mm:ss') === tsString && stopTime.tripId === vsTripId;
    });

    var gs = new ArrivalTime(vs.id, stopTimeTs.arrivalTime, stopTimeTs.tripId, stopTimeTs.direction, stopTimeTs.departureTime);

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
            var gi = new ArrivalTime(vi.id, INFINI, null, null, null);
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
    departureTime: number;

    constructor(stopId: string, arrivalTime: number, tripId: string, direction, departureTime: number) {
        this.stopId = stopId;
        this.arrivalTime = arrivalTime;
        this.tripId = tripId;
        this.direction = direction;
        this.departureTime = departureTime;
    }
}
