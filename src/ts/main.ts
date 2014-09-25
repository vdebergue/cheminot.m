/// <reference path='dts/Immutable.d.ts'/>
/// <reference path='dts/mithril.d.ts'/>

'use strict';

import Immutable = require('Immutable');
import m = require('mithril');
import App = require('app');
import Departures = require('departures');

m.route.mode = 'hash';
m.route(document.querySelector('.body'), "/", {
    "/": App.get()
});
