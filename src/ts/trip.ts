import m = require('mithril');

export interface Ctrl {
    id: string;
}

export class Trip implements m.Module<Ctrl> {

    controller(): Ctrl {
        return {
            id: m.route.param("id")
        };
    }

    view(ctrl: Ctrl) {
        if(ctrl.id) {
            return [
                m("h1", {}, "Trip " + ctrl.id)
            ];
        } else {
            return [];
        }
    }
}

var trip = new Trip();

export function get(): Trip {
    return trip;
}
