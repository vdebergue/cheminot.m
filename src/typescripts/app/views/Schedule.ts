import IView = require('./IView');
import View = require('./View');
import utils = require('../utils/utils');

declare var Zanimo;
declare var Keyboard;

export = Schedule;

class Schedule extends View implements IView {

    name: string;

    constructor(container: string, scope: string, name: string) {
        this.name = name;
        super(container, scope);
        this.bindEvents();
    }

    setup(): Q.Promise<IView> {
        return utils.Promise.pure(this);
    }

    show(): Q.Promise<void> {
        return Q.delay(120).then(() => {
            var offset = super.$container().offset();
            var $schedule = this.$scope();
            var scheduleOffet = $schedule.offset();
            var translate = offset.top + offset.height + Math.abs(scheduleOffet.top);
            return Zanimo.transform($schedule.get(0), 'translate3d(0,'+ translate + 'px,0)', true).then(() => {
                return Q.delay(600).then(() => {
                    $schedule.addClass('displayed');
                });
            });
        });
    }

    hide(): Q.Promise<void> {
        if(this.isDisplayed()) {
            var $schedule = this.$scope();
            var originTop = $schedule.attr('data-origin-top');
            $schedule.removeClass('displayed');
            return Q.delay(utils.Promise.DONE(), 400).then(() => {
                return Zanimo.transform($schedule.get(0), 'translate3d(0,0,0)', true).then(() => {
                    return utils.Promise.DONE();
                });
            });
        } else {
            return utils.Promise.DONE();
        }
    }

    bindEvents(): void {
        super.bindEvent('focus', 'input[type=date], input[type=time]', this.onDateTimeFocus);
        super.bindEvent('change', 'input[type=date], input[type=time]', this.onDateTimeSelected);
    }

    isCurrentlyFilled($input: ZeptoCollection): boolean {
        var $item = $input.closest('li');
        return !!$item.find('.filled').size();
    }

    onDateTimeFocus(e: Event): boolean {
        Keyboard.hideFormAccessoryBar(false);
        return true;
    }

    onDateTimeSelected(e: Event): boolean {
        var $input = $(e.currentTarget);
        var $button = $input.parent();
        if(this.isCurrentlyFilled($input)) {
            $input.closest('li').siblings('li.enabled').find('.time, .calendar').removeClass('filled');
        } else {
            this.$scope().find('.time, .calendar').removeClass('filled');
        }
        $button.addClass('filled');
        return true;
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