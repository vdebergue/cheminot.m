import m = require('mithril');
import Routes = require('routes');

export interface Ctrl {
  isHidden: boolean
}

function render() {
  return [
    m("h1", {}, "Home"),
    m("a[href='/departures']", {config: m.route}, "Departures")
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
