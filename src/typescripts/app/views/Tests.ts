export = Tests;

import IView = require('./IView');
import View = require('./View');
import Templating = require('./templating');
import tdsp = require('../utils/tdsp/tdsp');
import utils = require('../utils/utils');
import Storage = require('../db/storage');
import Cheminot = require('../Cheminot');

class Tests extends View implements IView {

    name: string;
    stops: any;
    storageInterface: any;

    constructor(container: string, scope: string, name: string) {
        this.name = name;
        super(container, scope);
        this.initTestSuites();
    }

    setup(): Q.Promise<IView> {
        return super.ensure(Templating.tests.layout).then(() => {
            this.bindEvents();
            return this;
        });
    }

    bindEvents(): void {
    }

    show(): Q.Promise<void> {
        return Templating.tests.header().then((tpl) => {
            this.header.update(tpl);
            super.showView();
        });
    }

    asTimeString(time: number) {
        return moment(time).format('HH:mm:ss');
    }

    initStops(): void {
        this.stops = {
            'Chartres': 'StopPoint:OCETrain TER-87394007',
            'Maintenon': 'StopPoint:OCETrain TER-87394130',
            'Epernon': 'StopPoint:OCETrain TER-87394114',
            'Rambouillet': 'StopPoint:OCETrain TER-87393314',
            'Versailles-Chantiers': 'StopPoint:OCETrain TER-87393009',
            'Paris-Montparnasse 1-2': 'StopPoint:OCETrain TER-87391003',
            'Laval': 'StopPoint:OCETrain TER-87478404',
            'Le Mans': 'StopPoint:OCETrain TER-87396002',
            'Lille Europe': 'StopPoint:OCETrain TER-87223263',
            'Brest': 'StopPoint:OCETrain TER-87474007'
        };
    }

    initStorageInterface(): void {
        this.storageInterface = {
            installDB: function() {
                Storage.installDB(Cheminot.config(), function() {});
            },
            tripsByIds: function(ids) {
                return Storage.impl().tripsByIds(ids);
            },
            tdspGraph: function() {
                return utils.Promise.pure(Storage.tdspGraph());
            },
            exceptions: function() {
                return utils.Promise.pure(Storage.exceptions());
            }
        };
    }

    initTestSuites(): void {
        this.initStops();
        this.initStorageInterface();

        mocha.setup('bdd');

        describe('Time dependent graph', () => {
            var self = this;
            describe('From Chartres to Paris-Montparnasse', function() {
                this.timeout(1000 * 60);

                it('should find a direct trip', (done) => {
                    var ts = moment().hours(13).minutes(34).seconds(0).toDate().getTime();
                    var exceptions = Storage.exceptions();
                    var graph = Storage.tdspGraph();
                    var vsId = self.stops['Chartres'];
                    var veId = self.stops['Paris-Montparnasse 1-2'];
                    var vs = graph[vsId];
                    var debug = () => {};
                    var when = new Date();

                    var sortedStopTimes = _.sortBy(vs.stopTimes, (st:any) => {
                        return st.departureTime;
                    });

                    var partitionned = _.partition(sortedStopTimes, (st:any) => {
                        var d1 = utils.setSameTime(new Date(st.departureTime), when);
                        return d1.getTime() < when.getTime();
                    });

                    var departureTimes = partitionned[1].concat(partitionned[0]);

                    utils.sequencePromises(departureTimes, (st:any) => {
                        return tdsp.lookForBestTrip(self.storageInterface, graph, vsId, veId, st.tripId, st.departureTime, exceptions, debug).then((results) => {
                            console.log(results);
                        }).catch(function(reason) {
                            console.log(reason);
                        });
                    }).then(() => {
                        done();
                    }).catch(function(reason) {
                        console.log('here');
                        done(reason);
                    });;
                });
            });
        });
    }

    run(): void {
        mocha.run();
    }
}