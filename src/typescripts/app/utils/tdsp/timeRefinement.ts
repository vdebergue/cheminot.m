import tuple = require('lib/immutable/Tuple');
import seq = require('lib/immutable/List');
import either = require('lib/immutable/Either');
import opt = require('lib/immutable/Option');
import utils = require('utils/utils');
import planner = require('models/Planner');
import tdsp = require('./tdsp');

export var INFINI = 9999999999999;

function tripsAvailability(Storage: any, tripIds: string[], when: Date, exceptions: any, debug: (msg: any) => void): Q.Promise<any> {
    return Storage.tripsByIds(tripIds).then((trips) => {
        debug('tripsByIds done')
        return tripIds.reduce((acc, id, index) => {
            return opt.Option(trips[index]).map((trip) => {
                acc[id] = planner.Trip.isValidOn(trip, when, exceptions, debug);
                return acc;
            }).getOrElse(() => {
                acc[id] = false;
                return acc;
            });
        }, {});
    });
}

export function timeRefinement(Storage: any, graph: any, vsId: string, veId: string, vsTripId: string, ts: number, exceptions: any, debug: (msg: any) => void): Q.Promise<any> {
    var RESULTS = {}
    var initializedQ = initialize(graph, vsTripId, vsId, ts);
    var indexed = initializedQ._1;
    var queue = initializedQ._2;
    var start = Date.now();

    return (function _timeRefinement(queue, RESULTS): Q.Promise<any> {
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
                        return Q(<any>RESULTS);
                    } else {
                        return Q.reject("break")
                    }
                }
                return refineArrivalTimes(Storage, graph, indexed, hvi, exceptions, (hvi.stopId === vsId), new Date(ts), debug).then(() => {
                    var d = Q.defer();
                    setTimeout(() => {
                        return d.resolve(_timeRefinement(queue, RESULTS));
                    }, 0);
                    return d.promise;
                });
            }
        } else {
            if(isTimeout) {
                return Q.reject('timeout');
            } else {
                return Q.reject('empty');
            }
        }
    })(queue, RESULTS);
}

function refineArrivalTimes(Storage: any, graph: any, indexed: any, indexedVi: any, exceptions: any, isStart: boolean, ts: Date, debug: (msg: any) => void): Q.Promise<void> {

    var vi = graph[indexedVi.stopId];
    var tripIds =vi.stopTimes.map((st:any) => {
        return st.tripId;
    });

    return tripsAvailability(Storage, tripIds, ts, exceptions, debug).then((availabities) => {
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

    var gs = new ArrivalTime(vs, stopTimeTs.arrivalTime, stopTimeTs.tripId, stopTimeTs.direction, stopTimeTs.departureTime);

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
            var gi = new ArrivalTime(vi, INFINI, null, null, null);
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
    stop: any;
    direction: string;
    departureTime: number;

    constructor(stop: any,arrivalTime: number, tripId: string, direction, departureTime: number) {
        this.stop = stop;
        this.arrivalTime = arrivalTime;
        this.tripId = tripId;
        this.direction = direction;
        this.departureTime = departureTime;
    }
}
