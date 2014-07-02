import opt = require('lib/immutable/Option');
import seq = require('lib/immutable/List');
import Storage = require('../db/storage');
import TernaryTree = require('../utils/ternaryTree');
import utils = require('../utils/utils');
import PlannerTask = require('tasks/planner');

export class Trip {
    private static isInPeriod(startDate: Date, endDate: Date, when: Date): boolean {
        var start = moment(startDate);
        var end = moment(endDate);
        return (start.isBefore(when) || start.isSame(when, 'day')) && (end.isAfter(when) || end.isSame(when, 'day'));
    }

    private static weekAvailability(service: any, when: Date): boolean {
        var dict = {
            1: 'monday',
            2: 'tuesday',
            3: 'wednesday',
            4: 'thursday',
            5: 'friday',
            6: 'saturday',
            0: 'sunday'
        };
        var day = dict[when.getDay()];
        return service[day] === "1";
    }

    private static tripException(when: Date, serviceId: string, exceptions: any, isRemoved: boolean, debug: (msg: any) => void): boolean {
        var mwhen = moment(when);
        return opt.Option(exceptions[serviceId]).exists((exception:any) => {
            if(mwhen.isSame(when, 'day')) {
                return _.find(exception, (ex: any) => {
                    return mwhen.isSame(ex.date, 'day') && ex.exceptionType === (isRemoved ? 2 : 1);
                }) != null;
            } else {
                return false;
            }
        });
    }

    private static hasRemoved(when: Date, serviceId: string, exceptions: any, debug: (msg: any) => void): boolean {
        return Trip.tripException(when, serviceId, exceptions, true, debug);
    }

    private static hasAdded(when: Date, serviceId: string, exceptions: any, debug: (msg: any) => void): boolean {
        return Trip.tripException(when, serviceId, exceptions, false, debug);
    }

    public static isValidOn(trip: any, when: Date, exceptions: any, debug: (msg: any) => void): boolean {
        if(trip.service) {
            var startDate = new Date(trip.service.startDate);
            var endDate = new Date(trip.service.endDate);
            var serviceId = trip.service.serviceId;
            if(!Trip.hasRemoved(when, serviceId, exceptions, debug) &&
               ((Trip.isInPeriod(startDate, endDate, when) && Trip.weekAvailability(trip.service, when))
                || Trip.hasAdded(when, serviceId, exceptions, debug))) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }
}
