import m = require('mithril');
import Q = require('q');
import Zanimo = require('Zanimo');
import _ = require('lodash');
import IScroll = require('IScroll');
import moment = require('moment');
import Utils = require('utils');
import Stops = require('stops');
import Routes = require('routes');

export interface Ctrl {
  scope: () => HTMLElement;
  shouldBeHidden: () => boolean;
  onTabTouched: (e: Event) => void;
  onInputStationTouched :(ctrl: Ctrl, e: Event) => void;
  onResetStationTouched: (ctrl: Ctrl, e: Event) => void;
  onDateTimeChange: (ctrl: Ctrl, e: Event) => void;
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
    config: function(el: HTMLElement, isUpdate: boolean, context: Object) {
      if (!isUpdate) {
        Utils.DOM.Event.one(el, 'touchend', _.partial(ctrl.onInputStationTouched, ctrl));
      }
    }
  };

  var resetStationAttrs = {
    config: function(el: HTMLElement, isUpdate: boolean, context: any) {
      if (!isUpdate) {
        el.addEventListener('touchend', _.partial(ctrl.onResetStationTouched, ctrl));
      }
    }
  }

  return m("div", { class: "start-end" },
           m("form", {}, [
             m("div", _.merge({ class: "input start"}, inputStationAttrs), [
               m("input", { name: "start", disabled: "true", type: "text", placeholder: "Départ" }),
               m("button", _.merge({ type: "button", class: "font reset" }, resetStationAttrs))
             ]),
             m("div", _.merge({ class: "input end"}, inputStationAttrs), [
               m("input", { name: "end", disabled: "true", type: "text", placeholder: "Arrivée" }),
               m("button", _.merge({ type: "button", class: "font reset" }, resetStationAttrs))
             ])
           ]));
}

function renderStations() {
  return m("div", { class: "stations" },
           m("div", { id: "wrapper" },
             m("ul", { class: "suggestions list" })));
}

function renderDateTime(ctrl: Ctrl) {
  var inputDateTimeAttrs = {
    config: function(el: HTMLElement, isUpdate: boolean, context: Object) {
      if (!isUpdate) {
        el.addEventListener('change', _.partial(ctrl.onDateTimeChange, ctrl));
      }
    }
  };

  return m("ul", { class: 'list datetime'}, [
    m("li", { class: "date" }, [
      m("span", { class: "label" }, "Date de départ"),
      m("span", { class: "value" }),
      m("input", _.merge({ type: "date" }, inputDateTimeAttrs))
    ]),
    m("li", { class: "time" }, [
      m("span", { class: "label" }, "Heure de départ"),
      m("span", { class: "value" }),
      m("input", _.merge({ type: "time" }, inputDateTimeAttrs))
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
    renderDateTime(ctrl)
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

      onInputStationTouched: function(ctrl: Ctrl, e: Event) {
        var station = e.currentTarget;
        var inputStation = station.querySelector('input');
        var hideInput = isInputStationStart(inputStation) ? hideInputStationEnd : hideInputStationStart;
        Q.all([hideInput(ctrl), hideDateTimePanel(ctrl)]).then(() => {
          return moveUpViewport(ctrl).then(() => {
            station.querySelector('button.reset').classList.add('focus');
            inputStation.removeAttribute('disabled');
            inputStation.focus();
            Utils.Keyboard.show();
          });
        });
      },

      onResetStationTouched: (ctrl: Ctrl, e: Event) => {
        var reset = e.currentTarget;
        var inputStation = reset.previousElementSibling;
        var showInput = isInputStationStart(inputStation) ? showInputStationEnd : showInputStationStart;
        inputStation.setAttribute('disabled', 'true');
        Utils.Keyboard.hide().then(() => {
          moveDownViewport(ctrl).then(() => {
            showInput(ctrl).then(() => {
              showDateTimePanel(ctrl).then(() => {
                reset.classList.remove('focus');
                Utils.DOM.Event.one(reset.parentElement, 'touchend', _.partial(ctrl.onInputStationTouched, ctrl));
              });
            });
          });
        });
      },

      onDateTimeChange: (ctrl: Ctrl, e: Event) => {
        var input = <HTMLInputElement> e.currentTarget;
        var value = input.previousElementSibling;
        value.textContent = input.value;
      }
    }
  }

  view(ctrl: Ctrl) {
    return render(ctrl);
  }
}

var home = new Home();

export function get(): Home {
  return home;
}

/** BACK STAGE */

function isInputStationStart(el: Element): boolean {
  return el.getAttribute('name') == "start";
}

function hideInputStationEnd(ctrl: Ctrl): Q.Promise<HTMLElement> {
  var inputStationEnd = ctrl.scope().querySelector('.input.end');
  var inputStationStart = ctrl.scope().querySelector('.input.start');
  inputStationStart.classList.remove('animating');
  inputStationEnd.classList.add('animating');
  var translateY = inputStationStart.offsetTop - inputStationEnd.offsetTop;
  return Zanimo(inputStationEnd, 'transform', 'translate3d(0,'+ translateY + 'px,0)', 200);
}

function showInputStationEnd(ctrl: Ctrl): Q.Promise<HTMLElement> {
  var inputStationEnd = ctrl.scope().querySelector('.input.end');
  return Zanimo(inputStationEnd, 'transform', 'translate3d(0,0,0)', 200).then(() => {
    inputStationEnd.classList.remove('animating');
    inputStationEnd.classList.remove('above');
    return inputStationEnd;
  });
}

function hideInputStationStart(ctrl: Ctrl): Q.Promise<HTMLElement> {
  var stationStart = ctrl.scope().querySelector('.input.start');
  stationStart.style.display = 'none';
  return Utils.Promise.pure(stationStart);
}

function showInputStationStart(ctrl: Ctrl): Q.Promise<HTMLElement> {
  var stationStart = ctrl.scope().querySelector('.input.start');
  stationStart.style.display = 'block';
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

function moveDownViewport(ctrl: Ctrl): Q.Promise<HTMLElement> {
  var viewport = document.querySelector('#viewport');
  return Zanimo(viewport, 'transform', 'translate3d(0,0,0)', 200).then(() => {
    viewport.style.bottom = '0';
    return viewport;
  });
}

function hideDateTimePanel(ctrl: Ctrl): Q.Promise<HTMLElement> {
  var datetime = ctrl.scope().querySelector('.datetime');
  datetime.style.display = 'none';
  return Utils.Promise.pure(datetime);
}

function showDateTimePanel(ctrl: Ctrl): Q.Promise<HTMLElement> {
  var datetime = ctrl.scope().querySelector('.datetime');
  datetime.style.display = 'block';
  return Utils.Promise.pure(datetime);
}
