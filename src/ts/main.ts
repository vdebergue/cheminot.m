/// <reference path='dts/Immutable.d.ts'/>
/// <reference path='dts/mithril.d.ts'/>

'use strict';

import Immutable = require('Immutable');
import m = require('mithril');

class Item {
    href: string;
    title: string;

    constructor(href: string, title: string) {
        this.href = href;
        this.title = title;
    }
}

interface CheminotCtrl {
    list: Array<Item>;
    f: () => void;
}

class CheminotApp {

    list: Array<Item> = [];

    controller(): CheminotCtrl {
        return {
            list: [new Item('http://github.com/srenault','Title1')],
            f: () => {
                console.log('here');
            }
        };
    }

    view(ctrl: CheminotCtrl): Array<any> {
        return [
            ctrl.list.map((item) => m("a", {href: item.href}, item.title)),
            m("a", {onclick: ctrl.f}, "Link")
        ];
    }
}

(() => {
    var map1 = Immutable.Map({a:1, b:1, c:1});
    var cheminotApp = new CheminotApp();
    m.module(document.querySelector("body"), cheminotApp);
})();