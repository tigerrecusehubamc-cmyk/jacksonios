//
//  HealthKitBridge.swift
//  App
//
//  Full iOS HealthKit SDK Integration for Capacitor
//  Tracks user footsteps using native iOS HealthKit framework
//

import Foundation
import Capacitor
import HealthKit

/// Native HealthKit Bridge for Capacitor
/// Provides full step tracking functionality using iOS HealthKit SDK
@objc(HealthKitBridge)
public class HealthKitBridge: CAPPlugin {

    /// Shared HealthKit store instance
    private let healthStore = HKHealthStore()

    /// Check if HealthKit is available on this device
    @objc func isAvailable(_ call: CAPPluginCall) {
        let available = HKHealthStore.isHealthDataAvailable()
        call.resolve([
            "available": available
        ])
    }

    /// Request HealthKit authorization from user
    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard let readTypes = call.getArray("read", String.self) else {
            call.reject("Invalid read types parameter")
            return
        }

        var readSet: Set<HKObjectType> = []

        if readTypes.contains("steps") {
            if let stepType = HKObjectType.quantityType(forIdentifier: .stepCount) {
                readSet.insert(stepType)
            }
        }

        healthStore.requestAuthorization(toShare: nil, read: readSet) { success, error in
            DispatchQueue.main.async {
                if let error = error {
                    call.reject(error.localizedDescription)
                } else {
                    call.resolve([
                        "granted": success
                    ])
                }
            }
        }
    }

    /// Query step count for a date range
    @objc func querySteps(_ call: CAPPluginCall) {
        guard let startDateString = call.getString("startDate"),
              let endDateString = call.getString("endDate"),
              let startDate = ISO8601DateFormatter().date(from: startDateString),
              let endDate = ISO8601DateFormatter().date(from: endDateString),
              let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            call.reject("Invalid parameters: startDate and endDate required in ISO 8601 format")
            return
        }

        let predicate = HKQuery.predicateForSamples(
            withStart: startDate,
            end: endDate,
            options: .strictStartDate
        )

        let query = HKStatisticsQuery(
            quantityType: stepType,
            quantitySamplePredicate: predicate,
            options: .cumulativeSum
        ) { _, result, error in
            DispatchQueue.main.async {
                if let error = error {
                    call.reject("Failed to query steps: \(error.localizedDescription)")
                } else {
                    let steps = Int(
                        result?.sumQuantity()?.doubleValue(for: HKUnit.count()) ?? 0
                    )
                    call.resolve([
                        "steps": steps
                    ])
                }
            }
        }

        self.healthStore.execute(query)
    }
}


