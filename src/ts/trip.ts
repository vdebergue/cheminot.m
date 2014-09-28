import m = require('mithril');
import Routes = require('routes');

export interface Ctrl {
  isHidden: boolean;
  id: string;
}

function render(id: string) {
  return [
    m("h1", {}, "Trip " + id)
  ];
}

export class Trip implements m.Module<Ctrl> {

  controller(): Ctrl {
    return {
      isHidden: !Routes.matchTrip(m.route()),
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
