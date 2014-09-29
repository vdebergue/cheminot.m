import m = require('mithril');
import q = require('q');
import z = require('Zanimo');
import IScroll = require('IScroll');
import moment = require('moment');
import Routes = require('routes');

export interface Ctrl {
  isHidden: boolean
}

function renderTabs() {
  var hint = m("div", { class: "hint" });
  return m("ul", { class: "top-bar tabs"}, [
    m("li", { class: "today selected"}, ["Aujourd'hui", hint]),
    m("li", { class: "tomorrow" }, ["Demain", hint]),
    m("li", { class: "other" }, ["Autre", hint])
  ])
}

function renderStartEnd() {
  return m("div", { class: "start-end" },
           m("form", {}, [
             m("div", { class: "input start"}, [
               m("input", { name: "start", disabled: "true", type: "text", placeholder: "Départ" }),
               m("button", { type: "button", class: "font reset" })
             ]),
             m("div", { class: "input end"}, [
               m("input", { name: "end", disabled: "true", type: "text", placeholder: "Arrivée" }),
               m("button", { type: "button", class: "font reset" })
             ])
           ]));
}

function renderStations() {
  return m("div", { class: "stations" },
           m("div", { id: "wrapper" },
             m("ul", { class: "suggestions list" })));
}

function renderDateTime() {
  return m("ul", { class: 'list datetime'}, [
    m("li", { class: "date" }, [
      m("span", { class: "label" }, "Date de départ"),
      m("span", { class: "value" }),
      m("input", { type: "date" })
    ]),
    m("li", { class: "time" }, [
      m("span", { class: "label" }, "Heure de départ"),
      m("span", { class: "value" }),
      m("input", { type: "time" })
    ]),
    m("li", { class: "submit disabled" }, [
      m("span", {}, "Rechercher"),
      m("button", { class: "font go" })
    ])
  ]);
}

function render() {
  return [
    renderTabs(),
    renderStartEnd(),
    renderStations(),
    renderDateTime()
  ];
}

export class Home implements m.Module<Ctrl> {

  controller(): Ctrl {
    return {
      isHidden: !Routes.matchHome(m.route())
    };
  }

  view(ctrl: Ctrl) {
    return render();
  }
}

var home = new Home();

export function get(): Home {
  return home;
}
