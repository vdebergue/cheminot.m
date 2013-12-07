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
        if(!this.exists()) {
            return Templating.layout().then((tmpl) => {
                this.$body().prepend(tmpl);
            });
        } else {
            return Q<void>(null);
        }
    }
}