/// <reference path='../dts/Q.d.ts'/>
/// <reference path='../dts/zepto.d.ts'/>
/// <reference path='../dts/Q.d.ts'/>
/// <reference path='../dts/underscore.d.ts'/>
/// <reference path='../dts/moment.d.ts'/>
/// <reference path="../dts/mocha.d.ts" />
/// <reference path="../dts/chai.d.ts" />

import seq = require('./lib/immutable/List');
import IView = require('./views/IView');
import View = require('./views/View');
import Home = require('./views/Home');
import Timetable = require('./views/Timetable');
import Trip = require('./views/Trip');
import Splashscreen = require('./views/Splashscreen');
import App = require('./application');
import utils = require('./utils/utils');

declare var Keyboard;

if(window['cordova'] != null) {
    document.addEventListener("deviceready", () => {
        ready();
    }, false);
} else {
    $(document).ready(function() {
        ready();
    });
}

function ready() {
    if(utils.isAppleMobile()) {
        Keyboard.shrinkView(true);
        Keyboard.disableScrollingInShrinkView(true);
        $('body').addClass('ios');
    }
    if(utils.isIOS7()) {
        $('body').addClass('ios7');
    }

    View.globalEvents();
    var homeView = new Home('#viewport', '#home', 'home');
    var timetableView = new Timetable('#viewport', '#timetable', 'timetable');
    var tripView = new Trip('#viewport', '#trip', 'trip');
    var splashscreenView = new Splashscreen('#viewport', '#splashscreen', 'splashscreen');
    App.init(seq.List<IView>(homeView, timetableView, tripView, splashscreenView));
}
