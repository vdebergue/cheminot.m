import m = require('mithril');
import Routes = require('routes');
import _ = require('lodash');
import IScroll = require('IScroll');
import moment = require('moment');
import Utils = require('utils');
import View = require('view');

export interface Ctrl {
  scope: () => HTMLElement;
  shouldBeHidden: () => boolean;
  startStation: string;
  endStation: string;
  departures: (value?: Array<Departure>) => Array<Departure>;
  isPullUpDisplayed: (value?: boolean) => boolean;
  isPullUpLoading: (value?: boolean) => boolean;
  isPullUpFlip: (value?: boolean) => boolean;
  pullUpLabel: (value?: string) => string;
  lastArrivalTime: (value?: Date) => Date;
  at: Date;
  iscroll: () => IScroll;
}

function formatTime(dateTime: Date): string {
  return moment(dateTime).format('HH:mm');
}

function formatDuration(duration: number): string {
  return moment.utc(duration).format('HH:mm');
}

function renderMeta(departure: Departure): m.VirtualElement[] {
  var duration = m('div.duration', {}, [
    m('span.egg-timer'),
    m('span.value', {}, formatDuration(Utils.DateTime.duration(departure.startTime, departure.endTime)))
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
  var pullUpAttrs = View.handleAttributes({ class: 'loading flip'}, (name, value) => {
    switch(name + ':' + value) {
    case 'class:loading': return ctrl.isPullUpLoading();
    case 'class:flip': return ctrl.isPullUpFlip();
    default: return true;
    }
  });

  var pullUp = m("li.pull-up", pullUpAttrs, [
    m("span.indicator"),
    m("span.label", {}, ctrl.pullUpLabel())
  ]);

  var departures = ctrl.departures().map((departure) => {
    return m('li', {}, [
      m('div.meta', {}, renderMeta(departure)),
      m('div.start-end', {}, [
        m('span.alarm-clock'),
        m('span.start', {}, formatTime(departure.startTime)),
        m('span.end', {}, formatTime(departure.endTime))
      ])
    ]);
  });

  if(ctrl.isPullUpDisplayed()) {
    departures.push(pullUp);
  }

  var departuresAttrs = {
    config: function(el: HTMLElement, isUpdate: boolean, context: any) {
      ctrl.iscroll().refresh();
      if(!isUpdate) {
        lookForNextDepartures(ctrl, ctrl.at);
      }
    }
  };

  return [m("div#wrapper", {}, m("ul.departures", departuresAttrs, departures))];
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
        var self = this;
        var wrapper = this.scope().querySelector('#wrapper');
        var header = document.querySelector('#header');
        var top = header.offsetTop + header.offsetHeight;
        wrapper.style.top = top + 'px';

        var iscroll = new IScroll(wrapper, { probeType: 1});

        iscroll.on('refresh', () => {
          console.log('refresh', this.isPullUpLoading());
          if(this.isPullUpLoading()) {
            m.startComputation();
            this.isPullUpLoading(false);
            this.isPullUpFlip(false);
            this.pullUpLabel('Tirer pour actualiser');
            m.endComputation();
          }
        });

        iscroll.on('scroll', function() {
          console.log('scroll', this.y, this.maxScrollY);
          if(this.y < (this.maxScrollY + 50) && !self.isPullUpFlip()) {
            m.startComputation();
            self.isPullUpFlip(true);
            self.pullUpLabel('Relacher pour actualiser');
            this.maxScrollY = this.maxScrollY;
            m.endComputation();
          }
        });

        iscroll.on('scrollEnd', function() {
          console.log('scrollEnd', self.isPullUpFlip());
          if(self.isPullUpFlip() && !self.isPullUpLoading()) {
            self.isPullUpLoading(true);
            self.pullUpLabel('Chargement...');
            lookForNextDepartures(self, self.lastArrivalTime());
          }
        });

        return iscroll;
      }),

      startStation: m.route.param("start"),

      endStation: m.route.param("end"),

      at: new Date(at),

      departures: m.prop([]),

      isPullUpDisplayed: m.prop(false),

      isPullUpLoading: m.prop(false),

      isPullUpFlip: m.prop(false),

      pullUpLabel: m.prop('Tirer pour rafraichir'),

      lastArrivalTime: m.prop()
    };
  }

  view(ctrl: Ctrl) {
    return render(ctrl);
  }
}

function lookForNextDepartures(ctrl: Ctrl, at: Date): void {
  cordova.plugins.Cheminot.lookForBestTrip(ctrl.startStation, ctrl.endStation, ctrl.at.getTime(),
    (departure) => {
      m.startComputation();
      ctrl.departures().push(departure);
      ctrl.lastArrivalTime(departure.endTime);
      if(!isScreenFull(ctrl)) {
        lookForNextDepartures(ctrl, departure.endTime);
      }
      m.endComputation();
    },
    () => {
    }
  );
}

function isScreenFull(ctrl: Ctrl): boolean {
  var departures = ctrl.scope().querySelector('.departures');
  var header = document.querySelector('#header');
  var viewportSize = Utils.viewportSize();
  var height = Math.max(viewportSize[0], viewportSize[1]);
  var b = (departures.offsetHeight + header.offsetHeight) >= height;
  ctrl.isPullUpDisplayed(b);
  return b;
}

var departures = new Departures();

export function get(): Departures {
  return departures;
}
