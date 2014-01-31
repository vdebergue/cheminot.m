/// <reference path='../../dts/Q.d.ts'/>
/// <reference path='../../dts/zepto.d.ts'/>

import IView = require('./IView');
import View = require('./View');
import Templating = require('./templating');

export = Setup;

class Setup extends View implements IView {

    name: string;

    constructor(container: string, scope: string, name: string) {
        this.name = name;
        super(container, scope);
    }

    setup(): Q.Promise<IView> {
        return super.ensure(Templating.setup.layout).then(() => {
            this.bindEvents();
            return this;
        });
    }

    show(): Q.Promise<void> {
        return Q<void>(super.showView());
    }

    bindEvents(): void {
    }

    $progress(): ZeptoCollection {
        var $progress =  this.$scope().find('progress');

        $progress.bind('setup:fetch', (e:any) => {
            var percent = e.data;
            $progress.val((percent * 30) / 100);
        });

        $progress.bind('setup:stops', () => {
            $progress.val('50');
        });

        $progress.bind('setup:trip', () => {
            var updated = $progress.val() + 5;
            $progress.val(updated);
        });

        $progress.bind('setup:done', () => {
            $progress.val('100');
        });

        return $progress;
    }
}