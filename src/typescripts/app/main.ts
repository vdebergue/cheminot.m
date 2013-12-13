/// <reference path='../dts/zepto.d.ts'/>

import seq = require('./lib/immutable/List');
import IView = require('./views/IView');
import Home = require('./views/Home');
import Timetable = require('./views/Timetable');
import App = require('./application');

$(document).ready(function() {
    var home = new Home('#viewport', '#home');
    var timetable = new Timetable('#viewport', '#timetable');
    App.init(seq.List<IView>(home, timetable));
});
