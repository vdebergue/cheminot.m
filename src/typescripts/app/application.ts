/// <reference path='../dts/Q.d.ts'/>

declare var Path: any;

import opt = require('lib/immutable/Option');
import seq = require('./lib/immutable/List');
import utils = require('./utils/utils');
import IView = require('./views/IView');
import Timetable = require('./views/Timetable');
import Splashscreen = require('./views/Splashscreen');
import Home = require('./views/Home');
import Trip = require('./views/Trip');
import Storage = require('./db/storage');
import Planner = require('./models/Planner');
import Upgrade = require('./tasks/upgrade');

function view(views: seq.IList<IView>, name: string): IView {
    return views.find((view) => {
        return view.name == name;
    }).getOrElse(() => {
        utils.error("Can't get view " + name);
        return null;
    });
}

function viewsBut(views: seq.IList<IView>, exclude: string): seq.IList<IView> {
    return views.filterNot((view) => {
        return view.name === exclude;
    });
}

function onSetupProgress(event: string, data: any) {
    var $progress = $('#progress-install');
    var $value = $progress.find('.value');
    var current = parseInt($value.text(), 10);
    $progress.removeClass('hidden');

    if(event === 'worker.setup:fetch') {
        var percent = Math.round((parseInt(data, 10) * 30) / 100);
        $value.text(percent.toString());
    } else if(event === 'worker.setup:exceptions') {
        $value.text('40');
    } else if(event === 'worker.setup:stops') {
        $value.text('50');
    } else if(event === 'worker.setup:trip') {
        var percent = Math.round((((data.value / data.total) * 100) * 50) / 100)
        $value.text((50 + percent).toString());
    } else if(event === 'worker.setup:done') {
        $value.text('100');
        $progress.addClass('hidden');
    }
}

export function init(views: seq.IList<IView>) {

    var config = window['CONFIG'];

    function ensureInitApp(viewName: string): Q.Promise<void> {
        Upgrade.checkPeriodically();
        var p: Q.Promise<void>;
        if(!Storage.isInitialized()) {
            p = view(views, 'splashscreen').setup().then((splashscreenView) => {
                return splashscreenView.show().then(() => {
                    return Storage.installDB(config, (event, data) => {
                        if(event === 'setup:fetch') {
                            (<Splashscreen>splashscreenView).progress(data);
                        } else if(event.indexOf('worker') >= 0) {
                            onSetupProgress(event, data);
                        }
                    }).then(() => {
                        return Q.delay(Q(null), 1000);
                    });
                });
            }).fail((reason) => {
                utils.error(reason);
            });
        } else {
            p = Q<void>(null);
        }
        return p.then(() => {
            hideOtherViews(viewName);
            return view(views, viewName).setup().then(() => {
                return null;
            });
        });
    }

    var hideOtherViews = (but: string) => {
        return viewsBut(views, but).foreach((view) => {
            view.hide();
        });
    }

    Path.map('#/').to(function() {
        ensureInitApp('home').then(() => {
            var homeView = <Home>view(views, 'home');
            homeView.show();
        });
    });

    Path.map('#/start/:start').to(function() {
        ensureInitApp('home').then(() => {
            var start = this.params['start'];
            var homeView = <Home>view(views, 'home');
            homeView.fillSelectedStart(start);
            homeView.show();
        });
    });

    Path.map('#/end/:end').to(function() {
        ensureInitApp('home').then(() => {
            var end = this.params['end'];
            var homeView = <Home>view(views, 'home');
            homeView.fillSelectedEnd(end);
            homeView.show();
        });
    });

    Path.map('#/schedule/:start/:end').to(function() {
        ensureInitApp('home').then(() => {
            var homeView = <Home> view(views, 'home');
            var start = this.params['start'];
            var end = this.params['end'];
            homeView.show();
            homeView.displayWhen(start, end);
        });
    });

    Path.map('#/timetable/:start/:end/:when').to(function() {
        ensureInitApp('timetable').then(() => {
            var start = this.params['start'];
            var end = this.params['end'];
            var when = parseInt(this.params['when'], 10);
            Planner.schedulesFor(start, end).then((maybeSchedules) => {
                maybeSchedules.map((schedules) => {
                    var timetableView = <Timetable> view(views, 'timetable');
                    Storage.impl().getDateExeptions().then((exceptions) => {
                        timetableView.buildWith(new Date(when), schedules, exceptions.getOrElse(() => {
                            return {};
                        }));
                        timetableView.show();
                    });
                }).getOrElse(() => {
                });
            }).fail((reason) => {
                utils.log(reason);
            });
        });
    });

    Path.map('#/trip/:id').to(function() {
        ensureInitApp('trip').then(() => {
            var tripId = this.params['id'];
            Storage.impl().tripById(tripId).then((maybeTrip) => {
                maybeTrip.foreach((trip) => {
                    var tripView = <Trip> view(views, 'trip');
                    tripView.buildWith(trip);
                    tripView.show();
                });
            });
        });
    });

    Path.rescue(() => {
        navigate('/');
    });

    Path.listen();
    if(!window.location.hash) {
        navigate('/');
    }
}

function navigate(path: string): void {
    var hash = "#" + path;
    window.location.hash = hash;
}

export function navigateToHome(maybeStart: opt.IOption<string> = new opt.None<string>(), maybeEnd: opt.IOption<string> = new opt.None<string>()): void {
    if(!(maybeStart.isDefined() && maybeEnd.isDefined())) {
        var route = maybeStart.map((start) => {
            return '/start/' + start;
        }).getOrElse(() => {
            return maybeEnd.map((end) => {
                return '/end/' + end;
            }).getOrElse(() => {
                return '/';
            });
        });
        navigate(route);
    } else {
        utils.oops('Unable to navigate to home: both start & end are already filled !');
    }
}

export function navigateToHomeWhen(start: string, end: string): void {
    navigate('/schedule/' + start + '/' + end)
}

export function navigateToTrip(tripId: string): void {
    navigate('/trip/' + tripId);
}

export function navigateToTimetable(start: string, end: string, when: number): void {
    navigate('/timetable/' + start + '/' + end + '/' + when);
}

export function navigateToBack(): void {
    history.back();
}