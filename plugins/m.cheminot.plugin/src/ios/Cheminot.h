#import <Cordova/CDVPlugin.h>
#import <Cordova/CDVInvokedUrlCommand.h>

@interface Cheminot : CDVPlugin {
    @protected
    BOOL _statusBarOverlaysWebView;
    @protected
    UIView* _statusBarBackgroundView;
    @protected
    BOOL _uiviewControllerBasedStatusBarAppearance;
    @protected
    UIColor* _statusBarBackgroundColor;
}

@property (atomic, assign) BOOL statusBarOverlaysWebView;

- (void) overlaysWebView:(CDVInvokedUrlCommand*)command;

- (void) styleDefault:(CDVInvokedUrlCommand*)command;
- (void) styleLightContent:(CDVInvokedUrlCommand*)command;
- (void) styleBlackTranslucent:(CDVInvokedUrlCommand*)command;
- (void) styleBlackOpaque:(CDVInvokedUrlCommand*)command;

- (void) backgroundColorByName:(CDVInvokedUrlCommand*)command;
- (void) backgroundColorByHexString:(CDVInvokedUrlCommand*)command;

- (void) hide:(CDVInvokedUrlCommand*)command;
- (void) show:(CDVInvokedUrlCommand*)command;
- (void) _ready:(CDVInvokedUrlCommand*)command;

@end
