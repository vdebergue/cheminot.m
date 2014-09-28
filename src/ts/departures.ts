import m = require('mithril');
import Routes = require('routes');

export interface Ctrl {
  isHidden: boolean
}

function render() {
  return [
    m("h1", {}, "Departures"),
    m("a[href='/trip/1']", {config: m.route}, "Trip")
  ];
}

export class Departures implements m.Module<Ctrl> {

  controller(): Ctrl {
    return {
      isHidden: !Routes.matchDepartures(m.route())
    };
  }

  view(ctrl: Ctrl) {
    return render();
  }
}

var departures = new Departures();

export function get(): Departures {
  return departures;
}
