require.config({
    baseUrl: 'app'
});

window.config = {
    api: 'http://127.0.0.1:9000/api',
    workers: {
        planner: 'app/workers/planner.js',
        setup: 'app/workers/setup.js'
    }
};

var STOPS = {
    'Chartres': 'StopPoint:OCETrain TER-87394007',
    'Maintenon': 'StopPoint:OCETrain TER-87394130',
    'Epernon': 'StopPoint:OCETrain TER-87394114',
    'Rambouillet': 'StopPoint:OCETrain TER-87393314',
    'Versailles-Chantiers': 'StopPoint:OCETrain TER-87393009',
    'Paris-Montparnasse 1-2': 'StopPoint:OCETrain TER-87391003',
    'Laval': 'StopPoint:OCETrain TER-87478404',
    'Le Mans': 'StopPoint:OCETrain TER-87396002',
    'Lille Europe': 'StopPoint:OCETrain TER-87223263',
    'Brest': 'StopPoint:OCETrain TER-87474007'
};

function asTimeString(time) {
    return moment(time).format('HH:mm:ss');
}

require(['require', '../chai', '../mocha'], function(require, chai) {

    assert = chai.assert;
    should = chai.should();
    expect = chai.expect;

    mocha.setup('bdd');

    require(['utils/tdsp/tdsp', 'db/storage', 'models/Planner', 'lib/immutable/List', 'lib/immutable/Option', 'utils/utils', 'tasks/planner'], function(tdsp, Storage, planner, seq, opt, utils, PlannerTask) {

        Storage.installDB(window.config, function() { console.log('...'); }).then(function() {

            describe('Time dependent graph', function() {

                describe('From Chartres to Paris Montparnasse at any valid start time', function() {
                    this.timeout(1000 * 60 * 2);

                    it('should return valid trips for one day at different starting time', function(done) {
                        var vsId = STOPS['Chartres'];
                        var veId = STOPS['Paris-Montparnasse 1-2'];
                        var vs = Storage.tdspGraph()[vsId];

                        var departureTimes = seq.List.apply(null, _.sortBy(vs.stopTimes, function(st) {
                            return st.departureTime;
                        }));

                        PlannerTask.lookForBestTrip(vsId, veId, departureTimes.take(20).asArray(), 4).then(function(results) {
                            console.log(results);
                            done();
                        }).fail(function(reason) {
                            console.log('ERROR', reason);
                        });
                    });
                });


                // describe('From Chartres to Paris-Montparnasse', function() {
                //   this.timeout(1000 * 60);

                //   it('should find a direct trip', function(done) {

                //     var ts = moment().hours(7).minutes(57).seconds(0).toDate().getTime();
                //     var vsId = STOPS['Chartres'];
                //     var veId = STOPS['Paris-Montparnasse 1-2'];
                //     var vsTripId = 'OCESN016756F0100317032';
                //     tdsp.lookForBestTrip(db.tdspGraph, vsId, veId, vsTripId, ts, db.exceptions).then(function(results) {
                //       expect(asTimeString(results[0].gi.arrivalTime)).to.equal('07:46:00');
                //       expect(asTimeString(results[1].gi.arrivalTime)).to.equal('08:09:00');
                //       expect(asTimeString(results[2].gi.arrivalTime)).to.equal('08:16:00');
                //       expect(asTimeString(results[3].gi.arrivalTime)).to.equal('08:29:00');
                //       expect(asTimeString(results[4].gi.arrivalTime)).to.equal('08:51:00');
                //       expect(asTimeString(results[5].gi.arrivalTime)).to.equal('09:05:00');
                //       done();
                //     });
                //   });

                // });

                // describe('From Laval to Chartres', function() {
                //   this.timeout(1000 * 60);

                //   it('should find a trip with some changes', function(done) {
                //     var ts = moment().hours(6).minutes(17).seconds(0).toDate().getTime();
                //     var vsId = STOPS['Laval'];
                //     var veId = STOPS['Chartres'];
                //     var vsTripId = 'OCESN857604F0100244863';
                //     tdsp.lookForBestTrip(db.tdspGraph, vsId, veId, vsTripId, ts, db.exceptions).then(function(results) {
                //       expect(asTimeString(results[0].gi.arrivalTime)).to.equal('06:17:00');
                //       expect(asTimeString(results[3].gi.arrivalTime)).to.equal('07:10:00');
                //       expect(asTimeString(results[13].gi.arrivalTime)).to.equal('08:51:00');
                //       done();
                //     });
                //   });
                // });

                mocha.run();

            });

        });

    });
});

// var futures = departureTimes.grouped(x).map(function(stopTimes) {
//     return PlannerTask.lookForBestTrip(vsId, veId, stopTimes.asArray());
// }).asArray();


// utils.parPromises(futures).then(function(results) {
//     console.log(results);
//     done();
// }).fail(function(reason) {
//     console.log('ERROR', reason);
// });

// utils.sequencePromises(departureTimes, function(st) {
//   var ts = st.departureTime;
//   return tdsp.lookForBestTrip(db.tdspGraph, vsId, veId, st.tripId, ts, db.exceptions).then(function(results) {
//     return [ts, results];
//   }).fail(function(reason) {
//     console.log(reason);
//     return [ts, null];
//   });
// }).then(function(results) {
//   results.filter(function(x) {
//     return x[1];
//   }).forEach(function(x) {
//     console.log(new Date(x[0]), x[1]);
//   });
//   done();
// });

// utils.sequencePromises(departureTimes, function(st) {
//   var ts = st.departureTime;
//   return PlannerTask.lookForBestTrip(vsId, veId, st.tripId, ts).then(function(results) {
//     return [ts, results];
//   }).fail(function(reason) {
//     console.log(reason);
//     return [ts, null];
//   });
// }).then(function(results) {
//   results.filter(function(x) {
//     return x[1];
//   }).forEach(function(x) {
//     console.log(new Date(x[0]), x[1]);
//   });
//   done();
// });