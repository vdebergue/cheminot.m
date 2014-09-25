import m = require('mithril');

export interface Ctrl {
}

export class Home implements m.Module<Ctrl> {

    controller(): Ctrl {
        return {
        };
    }

    view(ctrl: Ctrl) {
        return [
            m("h1", {}, "Home")
        ];
    }
}

var home = new Home();

export function get(): Home {
    return home;
}
