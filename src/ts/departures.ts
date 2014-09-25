import m = require('mithril');

export interface Ctrl {
}

export class Departures implements m.Module<Ctrl> {

    controller(): Ctrl {
        return {
        };
    }

    view(ctrl: Ctrl) {
        console.log('here');
        return [
            m("h1", {}, "Departures")
        ];
    }
}

var departures = new Departures();

export function get(): Departures {
    return departures;
}
