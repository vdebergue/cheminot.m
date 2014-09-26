/// <reference path='dts/mithril.d.ts'/>

'use strict';

import m = require('mithril');
import App = require('app');
import Routes = require('routes');

m.route.mode = 'hash';
m.route(document.querySelector('#viewport'), "/", {
  "/": App.get(),
  "/departures": App.get(),
  "/trip/:id": App.get()
});
