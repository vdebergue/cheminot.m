require.config({
  baseUrl: 'app'
});

window.CONFIG = {
  api: 'http://127.0.0.1:9000/api'
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

$.getJSON('http://localhost:9000/api/db/MjAxNC0wMS0xNF8wMC0xOS0wMA==', function(db) {

  // Require libraries
  require(['require', '../chai', '../mocha'], function(require, chai) {

    assert = chai.assert;
    should = chai.should();
    expect = chai.expect;

    mocha.setup('bdd');

    require(['utils/tdsp/timeRefinement', 'utils/tdsp/pathSelection'], function(tr, ps) {

      describe('Time dependent graph', function() {

        describe('From Chartres to Paris-Montparnasse', function() {

          it('should find a direct trip', function() {

            var ts = moment().hours(7).minutes(57).seconds(0).toDate().getTime();
            var vsId = STOPS['Chartres'];
            var veId = STOPS['Paris-Montparnasse 1-2'];
            var arrivalTimes = tr.timeRefinement(db.tdspGraph, vsId, veId, ts);
            var results = ps.pathSelection(db.tdspGraph, arrivalTimes, ts, vsId, veId);

            expect(asTimeString(results[0].gi.arrivalTime)).to.equal('07:46:00');
            expect(asTimeString(results[1].gi.arrivalTime)).to.equal('08:09:00');
            expect(asTimeString(results[2].gi.arrivalTime)).to.equal('08:16:00');
            expect(asTimeString(results[3].gi.arrivalTime)).to.equal('08:29:00');
            expect(asTimeString(results[4].gi.arrivalTime)).to.equal('08:51:00');
            expect(asTimeString(results[5].gi.arrivalTime)).to.equal('09:05:00');
          });

        });

        describe('From Laval to Chartres', function() {

          it('should find a trip with some changes', function() {

            var ts = moment().hours(6).minutes(17).seconds(0).toDate().getTime();
            var vsId = STOPS['Laval'];
            var veId = STOPS['Chartres'];
            var arrivalTimes = tr.timeRefinement(db.tdspGraph, vsId, veId, ts);
            var results = ps.pathSelection(db.tdspGraph, arrivalTimes, ts, vsId, veId);

            expect(asTimeString(results[0].gi.arrivalTime)).to.equal('06:17:00');
            expect(asTimeString(results[3].gi.arrivalTime)).to.equal('07:10:00');
            expect(asTimeString(results[13].gi.arrivalTime)).to.equal('08:48:00');
          });

        });

        describe('From Lille-Europe to Brest', function() {

          it('shouldn\'t find any trip', function() {

            var ts = moment().hours(7).minutes(54).seconds(0).toDate().getTime();
            var vsId = STOPS['Lille Europe'];
            var veId = STOPS['Brest'];
            var arrivalTimes = tr.timeRefinement(db.tdspGraph, vsId, veId, ts);

            expect(arrivalTimes).to.equal(null);
          });

        });

      });

      mocha.run();

    });

  });

});