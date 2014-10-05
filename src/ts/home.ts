import m = require('mithril');
import Q = require('q');
import Zanimo = require('Zanimo');
import _ = require('lodash');
import IScroll = require('IScroll');
import moment = require('moment');
import Utils = require('utils');
import Suggestions = require('suggestions');
import Routes = require('routes');

export interface Ctrl {
  scope: () => HTMLElement;
  shouldBeHidden: () => boolean;
  onTabTouched: (e: Event) => void;
  onInputStationTouched :(ctrl: Ctrl, e: Event) => void;
  onResetStationTouched: (ctrl: Ctrl, e: Event) => void;
  onDateTimeChange: (ctrl: Ctrl, e: Event) => void;
  onInputStationKeyUp: (ctrl: Ctrl, e: Event) => void;
  inputStationTerm: (value?: string) => string;
  stations: (value?: Array<Suggestions.Station>) => Array<Suggestions.Station>;
  onStationSelected: (ctrl: Ctrl, e: Event) => void;
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
  var inputStationWrapperAttrs = {
    config: (el: HTMLElement, isUpdate: boolean, context: Object) => {
      if (!isUpdate) {
        Utils.DOM.Event.one(el, 'touchend', _.partial(ctrl.onInputStationTouched, ctrl));
      }
    }
  };

  var inputStationAttrs = {
    disabled: "true",
    type: "text",
    onkeyup: _.partial(ctrl.onInputStationKeyUp, ctrl),
    value: ctrl.inputStationTerm()
  };

  var resetStationAttrs = {
    config: (el: HTMLElement, isUpdate: boolean, context: any) => {
      if (!isUpdate) {
        el.addEventListener('touchend', _.partial(ctrl.onResetStationTouched, ctrl));
      }
    }
  }

  return m("div", { class: "start-end" },
           m("form", {}, [
             m("div", _.merge({ class: "input start" }, inputStationWrapperAttrs), [
               m("input", _.merge({ name: "start", placeholder: "Départ" }, inputStationAttrs)),
               m("button", _.merge({ type: "button", class: "font reset" }, resetStationAttrs))
             ]),
             m("div", _.merge({ class: "input end"}, inputStationWrapperAttrs), [
               m("input", _.merge({ name: "end", placeholder: "Arrivée" }, inputStationAttrs)),
               m("button", _.merge({ type: "button", class: "font reset" }, resetStationAttrs))
             ])
           ]));
}

function renderStations(ctrl: Ctrl) {
  var term = ctrl.inputStationTerm();
  var stationAttrs = {
    config: function(el: HTMLElement, isUpdate: boolean, context: any) {
      if (!isUpdate) {
        el.addEventListener('touchend', _.partial(ctrl.onStationSelected, ctrl));
      }
    }
  }

  return m("div", { class: "stations" },
           m("div", { id: "wrapper" },
             m("ul", { class: "suggestions list" },
               ctrl.stations().map((station) => {
                 return m('li', _.merge({ "data-id": station.id, "data-name": station.name }, stationAttrs),
                          m('div', {}, [
                            m('span', { class: 'match' }, _.take(station.name, term.length).join('')),
                            m('span', {}, _.drop(station.name, term.length).join(''))
                          ]));
               }))));
}

function renderDateTime(ctrl: Ctrl) {
  var inputDateTimeAttrs = {
    config: (el: HTMLElement, isUpdate: boolean, context: Object) => {
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
    renderStations(ctrl),
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

      onInputStationTouched: (ctrl: Ctrl, e: Event) => {
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

      onInputStationKeyUp: (ctrl: Ctrl, e: Event) => {
        var input = <HTMLInputElement> e.currentTarget;
        var term = input.value;
        ctrl.stations(Suggestions.search(term));
      },

      inputStationTerm: m.prop(''),

      stations: m.prop([]),

      onStationSelected: (ctrl: Ctrl, e: Event) => {
        var station = e.currentTarget;
        var id = station.getAttribute('data-id');
        var inputStation = currentInputStation(ctrl);
        inputStation.setAttribute('data-selected', id);
        resetInputStationsPosition(ctrl, inputStation);
        checkSubmitRequirements(ctrl);
      },

      onResetStationTouched: (ctrl: Ctrl, e: Event) => {
        var resetButton = e.currentTarget;
        var inputStation = <HTMLInputElement> resetButton.previousElementSibling;
        inputStation.removeAttribute('data-selected');
        resetInputStationsPosition(ctrl, inputStation);
        checkSubmitRequirements(ctrl);
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

function resetInputStationsPosition(ctrl: Ctrl, inputStation: HTMLInputElement): Q.Promise<void> {
  var showInput = isInputStationStart(inputStation) ? showInputStationEnd : showInputStationStart;
  var resetButton = <HTMLElement> inputStation.nextElementSibling;
  inputStation.setAttribute('disabled', 'true');
  resetButton.classList.remove('focus');
  return Utils.Keyboard.hide().then(() => {
    moveDownViewport(ctrl).then(() => {
      showInput(ctrl).then(() => {
        showDateTimePanel(ctrl).then(() => {
          Utils.DOM.Event.one(resetButton.parentElement, 'touchend', _.partial(ctrl.onInputStationTouched, ctrl));
        });
      });
    });
  });
}

function currentInputStation(ctrl: Ctrl): HTMLInputElement {
  var inputStation = <HTMLInputElement> ctrl.scope().querySelector('.input input:not([disabled])');
  return inputStation;
}

function canBeSubmitted(ctrl: Ctrl): boolean {
  var inputsStation = ctrl.scope().querySelectorAll('.input input[type=text]');
  var isStationsSelected = _.every(inputsStation, (input) => {
    return input.getAttribute('data-selected') != null;
  });

  if(isStationsSelected) {
    var tab = ctrl.scope().querySelector('.tabs .selected');
    var time = ctrl.scope().querySelector('.datetime .time .value');
    if(tab.classList.contains('other')) {
      var date = ctrl.scope().querySelector('.datetime .date .value');
      return !!date && !!time;
    } else {
      return !!time;
    }
  }
  return false;
}

function checkSubmitRequirements(ctrl: Ctrl): void {
  var submitButton = ctrl.scope().querySelector('.datetime .submit');
  console.log('here');
  if(canBeSubmitted(ctrl)) {
    submitButton.classList.remove('disabled');
    submitButton.classList.add('enabled');
  } else {
    submitButton.classList.remove('enabled');
    submitButton.classList.add('disabled');
  }
}
