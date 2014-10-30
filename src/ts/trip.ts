import m = require('mithril');
import Routes = require('routes');

export interface Ctrl {
  shouldBeHidden: () => boolean;
  id: string;
}

function render(id: string) {
  return [
    m('div.top-bar.title', {}, [
      m('div', {}, [
        m('span.start'),
        m('span.to'),
        m('span.end')
      ])
    ]),
    m('div#wrapper', {}, m('ul.stops'))
  ];
}

export class Trip implements m.Module<Ctrl> {

  controller(): Ctrl {
    return {
      shouldBeHidden: () => {
        return !Routes.matchTrip(m.route());
      },
      id: m.route.param("id")
    };
  }

  view(ctrl: Ctrl) {
    return render(ctrl.id);
  }
}

var trip = new Trip();

export function get(): Trip {
  return trip;
}
