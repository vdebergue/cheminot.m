cordova.define('cordova/plugin_list', function(require, exports, module) {
module.exports = [
    {
        "file": "plugins/org.apache.cordova.keyboard/www/keyboard.js",
        "id": "org.apache.cordova.keyboard.keyboard",
        "clobbers": [
            "window.Keyboard"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.statusbar/www/statusbar.js",
        "id": "org.apache.cordova.statusbar.statusbar",
        "clobbers": [
            "window.StatusBar"
        ]
    },
    {
        "file": "plugins/com.phonegap.plugins.sqlite/www/SQLitePlugin.js",
        "id": "com.phonegap.plugins.sqlite.SQLitePlugin",
        "clobbers": [
            "SQLitePlugin"
        ]
    }
];
module.exports.metadata = 
// TOP OF METADATA
{
    "org.apache.cordova.keyboard": "0.1.2",
    "org.apache.cordova.statusbar": "0.1.3",
    "org.apache.cordova.plugin.softkeyboard": "1.0.3",
    "com.phonegap.plugins.sqlite": "1.0.0"
}
// BOTTOM OF METADATA
});