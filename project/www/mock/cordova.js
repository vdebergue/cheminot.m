window.cordova = {
    isMock: true,
    plugins: {
        SoftKeyboard: {
            hide: function(success, error) {
                success && success();
            },
            show: function(success, error) {
                success && success();
            }
        },
        Cheminot: {
            lookForBestTrip: function (start, end, at, success, error) {
                window.setTimeout(function() {
                    success({
                        startTime: new Date(at + 3600000),
                        endTime: new Date(at + (3600000 * 2)),
                        nbSteps: 1,
                        id: function () {
                            return this.startTime.getTime() + '-' + this.endTime.getTime();
                        }
                    });
                }, 1500);
            }
        }
    }
};
