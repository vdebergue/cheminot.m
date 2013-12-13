/// <reference path='../../dts/Q.d.ts'/>
/// <reference path='../../dts/zepto.d.ts'/>

import IView = require('./IView');
import View = require('./View');
import Templating = require('./templating')

export = Timetable;

class Timetable extends View implements IView {

    name: string;

    constructor(container: string, scope: string) {
        this.name = 'timetable';
        super(container, scope);
    }

    setup(): Q.Promise<void> {
        return super.ensure(Templating.timetable).then(() => {
            this.bindEvents();
        });
    }

    bindEvents(): void {
    }

    show(): Q.Promise<void> {
        return Templating.header.timetable().then((tpl) => {
            this.header.update(tpl);
        });
    }

    hide(): Q.Promise<void> {
        return null;
    }
}