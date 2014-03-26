/// <reference path='../dts/Q.d.ts'/>

declare var Abyssa: any;

import opt = require('./lib/immutable/Option');
import seq = require('./lib/immutable/List');
import utils = require('./utils/utils');
import IView = require('./views/IView');
import Schedule = require('./views/Schedule');
import Timetable = require('./views/Timetable');
import Splashscreen = require('./views/Splashscreen');
import Home = require('./views/Home');
import Storage = require('./db/storage');
import Planner = require('./models/Planner');
import Upgrade = require('./tasks/upgrade');
import Cheminot = require('./Cheminot');

export function init(views: seq.IList<IView>) {

    var viewsHelper = new ViewsHelper(views);

    function ensureInitApp(viewName: string): Q.Promise<void> {
        //Upgrade.checkPeriodically();
        var p: Q.Promise<void>;
        if(!Storage.isInitialized()) {
            var splashscreenView = viewsHelper.splashscreen();
            p = splashscreenView.setup().then(() => {
                return splashscreenView.show().then(() => {
                    return Storage.installDB(Cheminot.config(), (event, data) => {
                        if(event === 'setup:fetch') {
                            splashscreenView.progress(data);
                        } else if(event.indexOf('worker') >= 0) {
                            ViewsHelper.onSetupProgress(event, data);
                        }
                    }).then(() => {
                        return Q.delay(utils.Promise.DONE(), 1000);
                    });
                });
            }).fail((reason) => {
                utils.error(reason);
            });
        } else {
            p = utils.Promise.DONE();
        }
        return p.then(() => {
            viewsHelper.hideOthers(viewName);
            return ViewsHelper.view(views, viewName).setup().then(() => {
                return utils.Promise.DONE();
            });
        });
    }

    var CheminotApp = Abyssa.Router({
        app: Abyssa.State('', {
            enter: function(params) {
                return this.async(ensureInitApp('home').then(() => {
                    viewsHelper.home().show();
                }));
            },

            show: Abyssa.State('', function() {
                var homeView = viewsHelper.home();
                homeView.reset();
                return this.async(homeView.scheduleView.hide());
            }),

            onlyStart: Abyssa.State('start/:start', function(params) {
                var start = params['start'];
                var homeView = viewsHelper.home();
                homeView.fillStart(start);
                return this.async(homeView.scheduleView.hide());
            }),

            onlyEnd: Abyssa.State('end/:end', function(params) {
                var end = params['end'];
                var homeView = viewsHelper.home();
                homeView.fillEnd(end);
                return this.async(homeView.scheduleView.hide());
            }),

            schedule: Abyssa.State('schedule/:start/:end', function(params) {
                var start = params['start'];
                var end = params['end'];
                var homeView = viewsHelper.home();
                homeView.fillStart(start);
                homeView.fillEnd(end);
                return this.async(homeView.scheduleView.show());
            }),

            timetable: Abyssa.State('timetable/:start/:end/:when', function(params) {
                return this.async(
                    opt.Option(params['start']).flatMap((start:string) => {
                        return opt.Option(params['end']).flatMap((end:string) => {
                            return opt.Option(params['when']).flatMap((when:string) => {
                                return opt.Option(parseInt(when, 10));
                            }).map((when:number) => {
                                return Planner.schedulesFor(start, end, when).then((trips) => {
                                    viewsHelper.timetable().show();
                                });
                            });
                        });
                    }).getOrElse(() => {
                        return utils.Promise.DONE();
                    })
                );
            })
        })
    });

    Cheminot.initApp(CheminotApp);
}

export class Navigate {

    static home(maybeStart: opt.IOption<string> = new opt.None<string>(), maybeEnd: opt.IOption<string> = new opt.None<string>()) {
        if(maybeStart.isDefined() && maybeEnd.isDefined()) {
            maybeStart.foreach((start) => {
                maybeEnd.foreach((end) => {
                    Cheminot.app().state('schedule/' + start + '/' + end);
                });
            });
        } else {
            if(maybeStart.isEmpty() && maybeEnd.isEmpty()) {
                Cheminot.app().state('');
            } else {
                maybeStart.foreach((start) => {
                    Cheminot.app().state('start/' + start);
                });
                maybeEnd.foreach((end) => {
                    Cheminot.app().state('end/' + end);
                });
            }
        }
    }

    static timetable(start: string, end: string, when: number) {
    }

    static back() {
    }
}

class ViewsHelper {

    views: seq.IList<IView>;

    constructor(views: seq.IList<IView>) {
        this.views = views;
    }

    hideOthers = (but: string) => {
        return ViewsHelper.viewsBut(this.views, but).foreach((view) => {
            view.hide();
        });
    }

    splashscreen(): Splashscreen {
        return <Splashscreen>ViewsHelper.view(this.views, 'splashscreen');
    }

    home(): Home {
        return <Home>ViewsHelper.view(this.views, 'home');
    }

    timetable(): Timetable {
        return <Timetable>ViewsHelper.view(this.views, 'timetable');
    }

    static view(views: seq.IList<IView>, name: string): IView {
        return views.find((view) => {
            return view.name == name;
        }).getOrElse(() => {
            utils.error("Can't get view " + name);
            return null;
        });
    }

    static viewsBut(views: seq.IList<IView>, exclude: string): seq.IList<IView> {
        return views.filterNot((view) => {
            return view.name === exclude;
        });
    }

    static onSetupProgress(event: string, data: any) {
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
}