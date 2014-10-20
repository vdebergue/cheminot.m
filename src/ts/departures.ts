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
  nbItemsPerScreen: (value?: number) => number;
  lastArrivalTime: (value?: Date) => Date;
  currentPageSize: (value?: number) => number;
  at: Date;
  iscroll: () => IScroll;
}

function formatDay(dateTime: Date): string {
  return moment(dateTime).format('dddd MM MMMM');
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
  var pullUp = m("li.pull-up", { key: 'departures-pullup' }, [
    m("span.indicator"),
    m("span.label", {}, 'Tirer pour actualiser')
  ]);

  var departuresList = ctrl.departures().map((departure) => {
    return m('li', { key: departure.id() }, [
      m('div.meta', {}, renderMeta(departure)),
      m('div.start-end', {}, [
        m('span.alarm-clock'),
        m('span.start', {}, formatTime(departure.startTime)),
        m('span.end', {}, formatTime(departure.endTime))
      ])
    ]);
  });

  var zipped = _.zip(ctrl.departures(), departuresList);
  var departures = _.reduce(zipped, (acc, d) => {
    var model = d[0];
    var dom = d[1];
    if(!moment(acc.lastDay).isSame(model.startTime, 'day')) {
      var dayEl = m('li.day', { key: model.startTime }, formatDay(model.startTime));
      acc.lastDay = model.startTime;
      acc.elements.push(dayEl);
    }
    acc.elements.push(dom);
    return acc;
  }, { lastDay: new Date(), elements: new Array<m.VirtualElement>() });

  if(ctrl.isPullUpDisplayed()) {
    departures.elements.push(pullUp);
  }

  var departuresAttrs = {
    config: function(el: HTMLElement, isUpdate: boolean, context: any) {
      ctrl.iscroll().refresh();
      if(!isUpdate) {
        lookForNextDepartures(ctrl, ctrl.at);
      } else {
        ctrl.iscroll().scrollTo(0, ctrl.iscroll().maxScrollY, 600)
      }
    }
  };

  return [m("div#wrapper", {}, m("ul.departures", departuresAttrs, departures.elements))];
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
          if(this.isPullUpLoading() && this.currentPageSize() == 0) {
            this.isPullUpLoading(false);
            this.scope().querySelector('.departures .pull-up');
            this.isPullUpFlip(false);
            this.pullUpLabel('Tirer pour actualiser');
          }
        });

        iscroll.on('scroll', function() {
          if(this.y < this.maxScrollY && !self.isPullUpFlip()) {
            self.isPullUpFlip(true);
            self.pullUpLabel('Relacher pour actualiser');
            this.maxScrollY = this.maxScrollY;
          }
        });

        iscroll.on('scrollEnd', function() {
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

      nbItemsPerScreen: m.prop(0),

      currentPageSize: m.prop(0),

      isPullUpDisplayed: m.prop(false),

      isPullUpLoading: Utils.m.prop(false, (isLoading: boolean) => {
        if(isLoading) {
          document.querySelector('.pull-up').classList.add('loading');
        } else {
          document.querySelector('.pull-up').classList.remove('loading');
        }
      }),

      isPullUpFlip: Utils.m.prop(false, (isFlip: boolean) => {
        if(isFlip) {
          document.querySelector('.pull-up').classList.add('flip');
        } else {
          document.querySelector('.pull-up').classList.remove('flip');
        }
      }),

      pullUpLabel: Utils.m.prop('Tirer pour rafraichir', (label: string) => {
        document.querySelector('.pull-up .label').textContent = label;
      }),

      lastArrivalTime: m.prop()
    };
  }

  view(ctrl: Ctrl) {
    return render(ctrl);
  }
}

function lookForNextDepartures(ctrl: Ctrl, at: Date): void {
  cordova.plugins.Cheminot.lookForBestTrip(ctrl.startStation, ctrl.endStation, at.getTime(),
    (departure) => {
      m.startComputation();
      ctrl.departures().push(departure);
      ctrl.currentPageSize(ctrl.currentPageSize() + 1);
      ctrl.lastArrivalTime(departure.endTime);
      if(isMoreItemsNeeded(ctrl)) {
        lookForNextDepartures(ctrl, departure.endTime);
      } else {
        ctrl.currentPageSize(0);
      }
      m.endComputation();
    },
    () => {
    }
  );
}

function isMoreItemsNeeded(ctrl: Ctrl): boolean {
  if(!isScreenFull(ctrl) && ctrl.nbItemsPerScreen() == 0) {
    return true;
  } else {
    return ctrl.currentPageSize() < ctrl.nbItemsPerScreen();
  }
}

function isScreenFull(ctrl: Ctrl): boolean {
  var departures = ctrl.scope().querySelector('.departures');
  var header = document.querySelector('#header');
  var viewportSize = Utils.viewportSize();
  var height = Math.max(viewportSize[0], viewportSize[1]);
  var isFull = (departures.offsetHeight + header.offsetHeight) >= height;
  if(isFull && ctrl.nbItemsPerScreen() == 0) {
    ctrl.nbItemsPerScreen(ctrl.departures().length);
  }
  ctrl.isPullUpDisplayed(isFull);
  return isFull;
}

var departures = new Departures();

export function get(): Departures {
  return departures;
}
