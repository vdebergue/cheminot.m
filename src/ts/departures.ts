import m = require('mithril');
import Routes = require('routes');
import _ = require('lodash');
import IScroll = require('IScroll');
import moment = require('moment');

export interface Ctrl {
  scope: () => HTMLElement;
  shouldBeHidden: () => boolean;
  startStation: string;
  endStation: string;
  departures: (value?: Array<Departure>) => Array<Departure>;
  at: Date;
  iscroll: () => IScroll;
}

interface Departure {
  startTime: Date;
  endTime: Date;
  nbSteps: number;
  duration: Moment;
}

function formatTime(dateTime: Date): string {
  return moment(dateTime).format('HH:mm');
}

function renderMeta(departure: Departure): m.VirtualElement[] {
  var duration = m('div.duration', {}, [
    m('span.egg-timer'),
    m('span.value', {}, departure.duration.format('HH:mm'))
  ]);

  if(departure.nbSteps <= 1) {
    return [m("span.steps", {}, "Direct"), duration];
  } else {
    return [m("span.steps", {}, [
      m("span.value", {}, departure.nbSteps),
      m("span.changements")
    ]), duration];
  }
}

function render(ctrl: Ctrl) {
  var labels = { 'data-label-pullup': "Tirer pour actualiser", 'data-label-release': "Relacher pour actualiser", 'data-loading': "Chargement..." };
  var departuresAttrs = {
    config: function(el: HTMLElement, isUpdate: boolean, context: any) {
      ctrl.iscroll().refresh();
    }
  };

  return [
    m("div#wrapper", {}, [
      m("ul.departures", departuresAttrs,
        ctrl.departures().map((departure) => {
          return m('li', { 'data-starttime': departure.startTime.getTime(),'data-endtime': departure.endTime.getTime() }, [
            m('div.meta', {}, renderMeta(departure)),
            m('div.start-end', {}, [
              m('span.alarm-clock'),
              m('span.start', {}, formatTime(departure.startTime)),
              m('span.end', {}, formatTime(departure.endTime))
            ])
          ]);
        })),
      m("div.pull-up", {}, [
        m("span.indicator"),
        m("span.label", labels, "Tirer pour rafraichir")
      ])
    ])
  ];
}

export class Departures implements m.Module<Ctrl> {
  controller(): Ctrl {
    var at = parseInt(m.route.param("at"), 10);
    return {
      scope: () => {
        return document.querySelector('#departures');
      },

      shouldBeHidden: () => {
        return !Routes.matchDepartures(m.route());
      },

      iscroll: _.once(function() {
        var wrapper = this.scope().querySelector('#wrapper');
        var header = document.querySelector('#header');
        var top = header.offsetTop + header.offsetHeight;
        wrapper.style.top = top + 'px';
        return new IScroll(wrapper);
      }),

      startStation: m.route.param("start"),

      endStation: m.route.param("end"),

      at: new Date(at),

      departures: m.prop([{
        startTime: new Date(),
        endTime: moment().add('hours', 1).toDate(),
        nbSteps: 1,
        duration: moment.utc(moment().add('hours',1).diff(moment()))
      }])
    };
  }

  view(ctrl: Ctrl) {
    return render(ctrl);
  }
}

var departures = new Departures();

export function get(): Departures {
  return departures;
}
