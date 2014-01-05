/// <reference path='../../dts/Q.d.ts'/>

export = View

import Layout = require('./Layout')

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

    reset(): void {
        this.$scope().empty();
    }

    ensure(tmpl: () => Q.Promise<string>): Q.Promise<void> {
        return this.ensureLayout().then(() => {
            return tmpl().then((tmpl) => {
                if(!this.exists()) {
                    this.$container().prepend(tmpl);
                } else {
                    this.$scope().empty();
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

    bindEvent(type: string, selector: string, fn: (e: Event) => boolean): void {
        var fnWithContext = <any>$.proxy(fn, this);
        this.$scope().on(type, selector, fnWithContext);
    }

    header = {
        $header(): ZeptoCollection {
            return $('header');
        },
        update(tpl: string): void {
            this.$header().html(tpl);
        },
        bindEvent(type: string, selector: string, fn: (e: Event) => boolean): void {
            this.$header().on(type, selector, fn);
        }
    }
}
