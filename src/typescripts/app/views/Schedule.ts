import IView = require('./IView');
import View = require('./View');
import utils = require('../utils/utils');
import Interactions = require('./Interactions');

declare var Zanimo;

export = Schedule;

class Schedule extends View implements IView {

    name: string;
    interactions: any;

    constructor(container: string, scope: string, name: string, interactions: Interactions) {
        this.name = name;
        this.interactions = interactions;
        super(container, scope);
    }

    setup(): Q.Promise<IView> {
        return utils.Promise.pure(this);
    }

    show(): Q.Promise<void> {
        return Q.delay(120).then(() => {
            var offset = super.$container().offset();
            var $schedule = this.$scope();
            var scheduleOffet = $schedule.offset();
            var translate = offset.top + offset.height + Math.abs(scheduleOffet.top);;
            var f = Zanimo.transform($schedule.get(0), 'translate3d(0,'+ translate + 'px,0)', true).then(() => {
                return Q.delay(600).then(() => {
                    $schedule.addClass('displayed');
                });
            });
            this.interactions.register(f);
            return f;
        });
    }

    hide(): Q.Promise<void> {
        if(this.isDisplayed()) {
            var $schedule = this.$scope();
            var originTop = $schedule.attr('data-origin-top');
            $schedule.removeClass('displayed');
            var f =  Q.delay(utils.Promise.DONE(), 400).then(() => {
                return Zanimo.transform($schedule.get(0), 'translate3d(0,0,0)', true).then(() => {
                    return utils.Promise.DONE();
                });
            });
            this.interactions.register(f);
            return f;
        } else {
            return utils.Promise.DONE();
        }
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