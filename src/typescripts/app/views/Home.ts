/// <reference path='../../dts/Q.d.ts'/>
/// <reference path='../../dts/zepto.d.ts'/>

import IView = require('./IView');
import View = require('./View');
import Templating = require('./templating')

export = Home;

class Home extends View implements IView {

    name: string;

    constructor(container: string, scope: string) {
        this.name = 'home';
        super(container, scope);
    }

    setup(): Q.Promise<void> {
        return super.ensure(Templating.home).then(() => {
            this.bindEvents();
        });
    }

    bindEvents(): void {
        this.header.bindEvent('click', 'button', this.onButtonClick)
        super.bindEvent('click', 'h1', this.onTitleClick);
    }

    show(): Q.Promise<void> {
        return Templating.header.home().then((tpl) => {
            this.header.update(tpl);
        });
    }

    hide(): Q.Promise<void> {
        return null;
    }

    onButtonClick(e: Event): boolean {
        console.log('haaa');
        return true;
    }

    onTitleClick(e: Event): boolean {
        console.log('here');
        return true;
    }
}
