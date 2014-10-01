import m = require('mithril');
import Q = require('q');
import Zanimo = require('Zanimo');
import _ = require('lodash');
import IScroll = require('IScroll');
import moment = require('moment');
import Utils = require('utils');
import Routes = require('routes');

export interface Ctrl {
  scope: () => HTMLElement;
  shouldBeHidden: () => boolean;
  onTabTouched: (e: Event) => void;
  onInputStationTouched:(ctrl: Ctrl, e: Event) => void;
}

function renderTabs(ctrl: Ctrl) {
  var attributes = {
    config: function(el: HTMLElement, isUpdate: boolean, context: any) {
      if (!isUpdate) {
        el.addEventListener('touchend', ctrl.onTabTouched);
      }
    }
  }

  var hint = m("div", { class: "hint" });
  return m("ul", { class: "top-bar tabs"}, [
    m("li", _.merge({ class: "today selected" }, attributes), ["Aujourd'hui", hint]),
    m("li", _.merge({ class: "tomorrow" }, attributes), ["Demain", hint]),
    m("li", _.merge({ class: "other" }, attributes), ["Autre", hint])
  ])
}

function renderInputsStation(ctrl: Ctrl) {
  var inputStationAttrs = {
    config: function(el: HTMLElement, isUpdate: boolean, context: any) {
      if (!isUpdate) {
        el.addEventListener('touchstart', _.partial(ctrl.onInputStationTouched, ctrl));
      }
    }
  };

  return m("div", { class: "start-end" },
           m("form", {}, [
             m("div", _.merge({ class: "input start"}, inputStationAttrs), [
               m("input", { name: "start", disabled: "true", type: "text", placeholder: "Départ" }),
               m("button", { type: "button", class: "font reset" })
             ]),
             m("div", _.merge({ class: "input end"}, inputStationAttrs), [
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

function render(ctrl: Ctrl) {
  return [
    renderTabs(ctrl),
    renderInputsStation(ctrl),
    renderStations(),
    renderDateTime()
  ];
}

export class Home implements m.Module<Ctrl> {

  controller(): Ctrl {
    return {
      scope: () => {
        return document.querySelector('#home');
      },

      shouldBeHidden: () => {
        return !Routes.matchHome(m.route());
      },

      onTabTouched: (e: Event) => {
        var touched = e.currentTarget;
        var tabs = touched.parentElement.querySelectorAll('li');
        Array.apply(null, tabs).forEach((e: HTMLElement) => e.classList.remove('selected'));
        touched.classList.add('selected');

        var date = document.querySelector('#home .datetime .date');
        if(touched.classList.contains('other')) {
          date.classList.add('other');
        } else {
          date.classList.remove('other');
        }
      },

      onInputStationTouched: (ctrl: Ctrl, e: Event) => {
        var station = e.currentTarget;
        var inputStation = station.querySelector('input');
        var hideInput = (inputStation.getAttribute('name') == "start") ? hideInputStationEnd : hideInputStationStart;
        Q.all([moveUpViewport(ctrl), hideInput(ctrl), hideDateTimePanel(ctrl)]).then(() => {
          station.querySelector('button.reset').classList.add('focus');
        });
      }
    };
  }

  view(ctrl: Ctrl) {
    return render(ctrl);
  }
}

var home = new Home();

export function get(): Home {
  return home;
}

/** HELPERS */

function hideInputStationEnd(ctrl: Ctrl): Q.Promise<HTMLElement> {
  var inputStationEnd = ctrl.scope().querySelector('.input.end');
  var inputStationStart = ctrl.scope().querySelector('.input.start');
  inputStationStart.classList.remove('animating');
  inputStationEnd.classList.add('animating');
  var translateY = inputStationStart.offsetTop - inputStationEnd.offsetTop;
  return Zanimo(inputStationEnd, 'transform', 'translate3d(0,'+ translateY + 'px,0)', 200);
}

function hideInputStationStart(ctrl: Ctrl): Q.Promise<HTMLElement> {
  var stationStart = ctrl.scope().querySelector('.input.start');
  stationStart.style.display = 'none';
  return Utils.Promise.pure(stationStart);
}

function moveUpViewport(ctrl: Ctrl): Q.Promise<HTMLElement> {
  var viewport = document.querySelector('#viewport');
  var headerHeight = document.querySelector('header').offsetHeight;
  var tabsHeight = ctrl.scope().querySelector('.tabs').offsetHeight;
  var translateY = tabsHeight + headerHeight;
  return Zanimo(viewport, 'transform', 'translate3d(0,-'+ translateY + 'px,0)', 200).then(() => {
    viewport.style.bottom = '-' + translateY + 'px';
    return viewport;
  });
}

function hideDateTimePanel(ctrl: Ctrl): Q.Promise<HTMLElement> {
  var datetime = ctrl.scope().querySelector('.datetime');
  datetime.style.display = 'none';
  return Utils.Promise.pure(datetime);
}
