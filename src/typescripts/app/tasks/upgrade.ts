import Cheminot = require('../Cheminot');
import Api = require('../ws/api');
import utils = require('../utils/utils');
import Storage = require('../db/storage');

export var checkPeriodically = _.once(() => {
    setInterval(() => {
        Storage.impl().version().then((maybeVersion) => {
            maybeVersion.foreach((versionDB) => {
                Q.timeout(Api.version(Cheminot.config()), 2000).then((versionApi) => {
                    if(versionDB && versionApi && (versionDB != versionApi)) {
                        alert('A new version is available');
                    }
                }).catch((reason) => {
                    utils.error('Unable to fetch /api: ' + reason)
                });
            });
        });
    }, 24 * 60 * 60 * 1000)
});
