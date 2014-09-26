import m = require('mithril');
import Header = require('header');
import Home = require('home');
import Departures = require('departures');
import Trip = require('trip');

export interface Ctrl {
  header: Header.Ctrl;
  home: Home.Ctrl;
  departures: Departures.Ctrl;
  trip: Trip.Ctrl;
}

export class App implements m.Module<Ctrl> {

  controller(): Ctrl {
    return {
      header: Header.get().controller(),
      home: Home.get().controller(),
      departures: Departures.get().controller(),
      trip: Trip.get().controller()
    };
  }

  view(ctrl: Ctrl) {
    return [
      m("header", { id: "header" }, Header.get().view(ctrl.header)),
      m("section", { id: "home", class: "view" }, Home.get().view(ctrl.home)),
      m("section", { id: "departures", class: "view" }, Departures.get().view(ctrl.departures)),
      m("section", { id: "trip", class: "view" }, Trip.get().view(ctrl.trip))
    ];
  }
}

var app = new App();

export function get(): App {
  return app;
}
