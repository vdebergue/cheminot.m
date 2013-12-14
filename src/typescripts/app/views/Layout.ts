/// <reference path='../../dts/Q.d.ts'/>
/// <reference path='../../dts/zepto.d.ts'/>

import IView = require('./IView');
import Templating = require('./templating')

export = Layout;

class Layout {

    static $body(): ZeptoCollection {
        return $('body');
    }

    static exists(): boolean {
        return $('body #viewport').size() > 0;
    }

    static setup(): Q.Promise<void> {
        return Templating.layout().then((tmpl) => {
            if(!this.exists()) {
                this.$body().prepend(tmpl);
            }
        });
    }
}