#import "Cheminot.h"
#import <Cordova/CDVPlugin.h>
#import "Adapter.h"

@implementation Cheminot

-(const char*)dbPath {
  NSString* path = [[NSBundle mainBundle] pathForResource:@"cheminot" ofType:@"db"];
  return [path UTF8String];
}

- (void)echo:(CDVInvokedUrlCommand*)command
{
  CDVPluginResult* pluginResult = nil;
  NSString* echo = [command.arguments objectAtIndex:0];
  NSLog(@"Path: %s", self.dbPath);
  const char* t = getVersion(self.dbPath);
  NSLog(@"|> %s", t);
  if (echo != nil && [echo length] > 0) {
    pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:echo];
  } else {
    pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR];
  }
    
  [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

@end
