cordova.define('cordova/plugin_list', function(require, exports, module) {
module.exports = [
    {
        "file": "plugins/org.apache.cordova.keyboard/www/keyboard.js",
        "id": "org.apache.cordova.keyboard.keyboard",
        "clobbers": [
            "window.Keyboard"
        ]
    }
];
module.exports.metadata = 
// TOP OF METADATA
{
    "org.apache.cordova.keyboard": "0.1.2"
}
// BOTTOM OF METADATA
});