import IView = require('./IView');
import View = require('./View');
import utils = require('../utils/utils');

declare var Zanimo;

export = Schedule;

class Schedule extends View implements IView {

    name: string;

    constructor(container: string, scope: string, name: string) {
        this.name = name;
        super(container, scope);
    }

    setup(): Q.Promise<IView> {
        return utils.Promise.pure(this);
    }

    show(): Q.Promise<void> {
        var d = Q.defer<void>();
        var $schedule = this.$scope();
        setTimeout(() => {
            var viewOffset = this.$scope().offset();
            var translate = viewOffset.top + viewOffset.height;
            Zanimo.transform($schedule.get(0), 'translate3d(0,'+ translate + 'px,0)').then(() => {
                setTimeout(() => {
                    $schedule.addClass('displayed');
                    d.resolve(null);
                }, 600);
            });
        }, 120);
        return d.promise;
    }

    hide(): Q.Promise<void> {
        var $schedule = this.$scope();
        $schedule.removeClass('displayed');
        return Q.delay(utils.Promise.DONE(), 400).then(() => {
            return Zanimo.transform($schedule.get(0), 'translate3d(0,0,0)', true).then(() => {
                return utils.Promise.DONE();
            });
        });
    }

    bindEvents(): void {
    }

    getSelectedTime(): number {
        var $btn = this.$scope().find('.when .active')
        var timestamp = Date.now();
        if($btn.is('.tomorrow')) {
            timestamp = moment().add('days', 1).hours(12).toDate().getTime();
        } else if($btn.is('.other')) {
            timestamp = parseInt($btn.attr('data-date'), 10);
        }
        return timestamp;
    }

    isDisplayed(): boolean {
        return this.$scope().is('.displayed');
    }
}