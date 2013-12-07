/// <reference path='../dts/zepto.d.ts'/>

import seq = require('./lib/immutable/List');
import Home = require('./views/Home')
import App = require('./application')

$(document).ready(function() {
    var home = new Home('#viewport', '#home');
    App.init(seq.List(home));
});
