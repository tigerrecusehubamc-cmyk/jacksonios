//
//  HealthKitBridge.m
//  App
//
//  Objective-C Bridge for HealthKit Capacitor Plugin
//  Exposes Swift methods to Capacitor JavaScript bridge
//

#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Define Capacitor plugin with three methods:
// 1. isAvailable - Check if HealthKit is available
// 2. requestAuthorization - Request permission to read steps
// 3. querySteps - Query step count for date range
CAP_PLUGIN(HealthKitBridge, "HealthKit",
    CAP_PLUGIN_METHOD(isAvailable, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(requestAuthorization, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(querySteps, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(testReadAccess, CAPPluginReturnPromise);
)


