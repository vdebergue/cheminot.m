/// <reference path='../dts/zepto.d.ts'/>

import seq = require('./lib/immutable/List');
import IView = require('./views/IView');
import Home = require('./views/Home');
import Timetable = require('./views/Timetable');
import Trip = require('./views/Trip');
import App = require('./application');

$(document).ready(function() {
    var homeView = new Home('#viewport', '#home');
    var timetableView = new Timetable('#viewport', '#timetable');
    var tripView = new Trip('#viewport', '#trip');
    App.init(seq.List<IView>(homeView, timetableView, tripView));
});
