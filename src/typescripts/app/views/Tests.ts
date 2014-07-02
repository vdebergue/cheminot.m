export = Tests;

/// <reference path="../../dts/chai.d.ts" />
/// <reference path="../../dts/mocha.d.ts" />

import IView = require('./IView');
import View = require('./View');
import Templating = require('./templating');
import tdsp = require('../utils/tdsp/tdsp');
import chai = require('../lib/spec/chai');

class Tests extends View implements IView {

    name: string;

    constructor(container: string, scope: string, name: string) {
        this.name = name;
        super(container, scope);
    }

    setup(): Q.Promise<IView> {
        return super.ensure(Templating.tests.layout).then(() => {
            this.bindEvents();
            return this;
        });
    }

    bindEvents(): void {
    }

    show(): Q.Promise<void> {
        return Templating.tests.header().then((tpl) => {
            this.header.update(tpl);
            super.showView();
        });
    }

    run(): void {
    }
}