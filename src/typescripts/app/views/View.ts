/// <reference path='../../dts/Q.d.ts'/>

export = View

import Layout = require('./Layout')
import App = require('../application')

class View {

    container: string;
    scope: string;

    constructor(container: string, scope: string) {
        this.container = container;
        this.scope = scope;
    }

    exists(): boolean {
        return this.$container().find(this.scope).size() > 0;
    }

    ensureLayout(): Q.Promise<void> {
        return Layout.setup();
    }

    ensure(tmpl: () => Q.Promise<string>): Q.Promise<void> {
        return this.ensureLayout().then(() => {
            return tmpl().then((tmpl) => {
                if(!this.exists()) {
                    this.$container().prepend(tmpl);
                } else {
                    this.$scope().remove();
                    this.$container().prepend(tmpl);
                }
            });
        });
    }

    $container(): ZeptoCollection {
        return $(this.container);
    }

    $scope(): ZeptoCollection {
        return $(this.scope);
    }

    showView(): void {
        this.$scope().removeClass('hidden');
    }

    hide(): Q.Promise<void> {
        this.$scope().addClass('hidden')
        return Q<void>(null);
    }

    bindEvent(type: string, selector: string, fn: (e: Event) => boolean): void {
        var fnWithContext = <any>$.proxy(fn, this);
        this.$scope().on(type, selector, fnWithContext);
    }

    header = {
        $header(): ZeptoCollection {
            return $('header');
        },
        update(tpl: string): void {
            this.$header().removeClass('hidden').html(tpl);
        },
        bindEvent(type: string, selector: string, fn: (e: Event) => boolean): void {
            this.$header().on(type, selector, fn);
        }
    }

    static currentViewName(): string {
        return $('.view:not(.hidden)').attr('id');
    }

    static globalEvents(): void {
        var $body = $('body');
        var onBackButton = (e: Event) => {
            window.history.back();
            return true;
        };
        document.addEventListener("backbutton", onBackButton, false);
        $body.on('tap', '.back-btn', onBackButton);
    }
}
