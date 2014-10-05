/// <reference path='dts/lib.d.ts'/>
/// <reference path='dts/mithril.d.ts'/>
/// <reference path='dts/Q.d.ts'/>
/// <reference path='dts/IScroll.d.ts'/>
/// <reference path='dts/moment.d.ts'/>
/// <reference path='dts/Zanimo.d.ts'/>
/// <reference path='dts/lodash.d.ts'/>
/// <reference path='dts/cheminot.d.ts'/>

'use strict';

import m = require('mithril');
import App = require('app');
import Routes = require('routes');
import Suggestions = require('suggestions');

Suggestions.init();

m.route.mode = 'hash';
m.route(document.querySelector('#viewport'), "/", {
  "/": App.get(),
  "/departures": App.get(),
  "/trip/:id": App.get()
});
