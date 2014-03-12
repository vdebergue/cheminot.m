require.config({
  baseUrl: 'app'
});

window.CONFIG = {
  api: 'http://127.0.0.1:9000/api'
};

// Require libraries
require(['require'], function(require) {
  require(['utils/tdsp/timeRefinement', 'utils/tdsp/pathSelection'], function(tr, ps) {
    $.getJSON('http://localhost:9000/api/db/MjAxNC0wMS0xNF8wMC0xOS0wMA==', function(db) {
      console.log('here');
      var ts = moment().hours(7).minutes(57).seconds(0).toDate().getTime();
      var vsId = "StopPoint:OCETrain TER-87394007";
      var veId = "StopPoint:OCETrain TER-87391003";
      var x = tr.timeRefinement(db.tdspGraph, vsId, veId, ts);
      console.log(new Date(x['StopPoint:OCETrain TER-87394130'].gi.arrivalTime));
      console.log(new Date(x['StopPoint:OCETrain TER-87394114'].gi.arrivalTime));
      console.log(new Date(x['StopPoint:OCETrain TER-87393314'].gi.arrivalTime));
      console.log(new Date(x['StopPoint:OCETrain TER-87393009'].gi.arrivalTime));
      console.log(new Date(x['StopPoint:OCETrain TER-87391003'].gi.arrivalTime));
    });
    //mocha.run();
  });
});