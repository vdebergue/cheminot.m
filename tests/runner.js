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
  'Paris-Montparnasse 1-2': 'StopPoint:OCETrain TER-87391003'
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

      describe('timeRefinement', function() {

        it('should return the correct trip from Chartres to Paris-Montparnasse 1-2 at 07:57', function() {

          var ts = moment().hours(7).minutes(57).seconds(0).toDate().getTime();
          var vsId = STOPS['Chartres'];
          var veId = STOPS['Paris-Montparnasse 1-2'];
          var x = tr.timeRefinement(db.tdspGraph, vsId, veId, ts);

          expect(asTimeString(x[STOPS['Chartres']].gi.arrivalTime)).to.equal('07:46:00');
          expect(asTimeString(x[STOPS['Maintenon']].gi.arrivalTime)).to.equal('08:09:00');
          expect(asTimeString(x[STOPS['Epernon']].gi.arrivalTime)).to.equal('08:16:00');
          expect(asTimeString(x[STOPS['Rambouillet']].gi.arrivalTime)).to.equal('08:29:00');
          expect(asTimeString(x[STOPS['Versailles-Chantiers']].gi.arrivalTime)).to.equal('08:51:00');
          expect(asTimeString(x[STOPS['Paris-Montparnasse 1-2']].gi.arrivalTime)).to.equal('09:05:00');
        });

      });

      mocha.run();
    });

  });

});