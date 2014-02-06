/// <reference path='../../dts/Q.d.ts'/>
/// <reference path='../../dts/zepto.d.ts'/>

import IView = require('./IView');
import View = require('./View');
import Templating = require('./templating');

export = Splashscreen;

class Splashscreen extends View implements IView {

    name: string;

    constructor(container: string, scope: string, name: string) {
        this.name = name;
        super(container, scope);
    }

    setup(): Q.Promise<IView> {
        return super.ensure(Templating.splashscreen.layout).then(() => {
            this.bindEvents();
            return this;
        });
    }

    show(): Q.Promise<void> {
        return Q<void>(super.showView());
    }

    bindEvents(): void {
    }

    progress(percent): ZeptoCollection {
        var $progress =  this.$scope().find('.progress .value');
        var round = Math.round(percent * 100) / 100;
        $progress.text(round.toString());
        return $progress;
    }
}