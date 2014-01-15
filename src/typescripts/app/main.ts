/// <reference path='../dts/zepto.d.ts'/>

import seq = require('./lib/immutable/List');
import IView = require('./views/IView');
import Home = require('./views/Home');
import Timetable = require('./views/Timetable');
import Trip = require('./views/Trip');
import Setup = require('./views/Setup');
import App = require('./application');
import utils = require('./utils/utils');

(() => {
    if(utils.isIOS7()) {
        $('body').addClass('ios7');
    }
})();

$(document).ready(function() {
    var homeView = new Home('#viewport', '#home', 'home');
    var timetableView = new Timetable('#viewport', '#timetable', 'timetable');
    var tripView = new Trip('#viewport', '#trip', 'trip');
    var setupView = new Setup('#viewport', '#setup', 'setup');
    App.init(seq.List<IView>(homeView, timetableView, tripView, setupView));
});
