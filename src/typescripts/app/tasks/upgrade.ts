import Api = require('../ws/api');
import Storage = require('../db/storage');
import utils = require('../utils/utils');

export var checkPeriodically = _.once(() => {
    setInterval(() => {
        Storage.impl().version().then((maybeVersion) => {
            maybeVersion.foreach((versionDB) => {
                Q.timeout(Api.version(), 2000).then((versionApi) => {
                    if(versionDB && versionApi && (versionDB != versionApi)) {
                        alert('A new version is available');
                    }
                }).fail((reason) => {
                    utils.error('Unable to fetch /api: ' + reason)
                });
            });
        });
    }, 10000)
});