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

    private static func parseISODate(_ value: String) -> Date? {
        let fractionalFormatter = ISO8601DateFormatter()
        fractionalFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        if let date = fractionalFormatter.date(from: value) {
            return date
        }

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: value)
    }

    /// Check if HealthKit is available on this device
    @objc func isAvailable(_ call: CAPPluginCall) {
        let available = HKHealthStore.isHealthDataAvailable()
        call.resolve([
            "available": available
        ])
    }

    /// Request HealthKit authorization from user
    /// IMPORTANT: Apple does NOT tell apps if user granted/denied READ permissions
    /// For READ permissions, we can only detect:
    /// - if user needs to see the dialog (.shouldRequest)
    /// - if user already decided (.unnecessary)
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

        // First, check if we need to show the permission dialog
        let shareSet: Set<HKSampleType> = []
        healthStore.getRequestStatusForAuthorization(toShare: shareSet, read: readSet) { status, error in
            DispatchQueue.main.async {
                if let error = error {
                    call.reject(error.localizedDescription)
                    return
                }

                switch status {
                case .shouldRequest:
                    // User hasn't decided yet - show permission dialog
                    self.healthStore.requestAuthorization(toShare: shareSet, read: readSet) { success, authError in
                        DispatchQueue.main.async {
                            if let authError = authError {
                                call.reject(authError.localizedDescription)
                            } else {
                                // Apple doesn't tell us if user actually granted READ permission
                                // success=true means dialog was shown, NOT that permission was granted
                                // We return "dialogShown" and let the frontend test by querying data
                                call.resolve([
                                    "granted": true,  // Dialog was successfully shown
                                    "status": "dialogShown",
                                    "requiresSettingsRedirect": false,
                                    "note": "Permission dialog was shown. Test access by querying steps."
                                ])
                            }
                        }
                    }

                case .unnecessary:
                    // User already made a decision in the past
                    // We cannot know if they granted or denied READ permission
                    call.resolve([
                        "granted": true,  // Can't determine, assume positive
                        "status": "previouslyRequested",
                        "requiresSettingsRedirect": false,
                        "note": "User previously decided. Test access by querying steps."
                    ])

                @unknown default:
                    call.reject("Unknown authorization status")
                }
            }
        }
    }

    /// Test if we actually have read access to step data
    /// This is the TRUE test - query steps and see if we get data
    @objc func testReadAccess(_ call: CAPPluginCall) {
        guard let startDateString = call.getString("startDate"),
              let endDateString = call.getString("endDate"),
              let startDate = Self.parseISODate(startDateString),
              var endDate = Self.parseISODate(endDateString),
              let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            call.reject("Invalid parameters")
            return
        }

        endDate = Calendar.current.date(byAdding: .second, value: 1, to: endDate) ?? endDate

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
                if let error = error as? HKError {
                    // Check error type
                    switch error.code {
                    case .errorAuthorizationDenied:
                        call.resolve([
                            "hasAccess": false,
                            "steps": 0,
                            "reason": "authorizationDenied"
                        ])
                    case .errorNoData:
                        call.resolve([
                            "hasAccess": false,
                            "steps": 0,
                            "reason": "noData"
                        ])
                    default:
                        call.reject(error.localizedDescription)
                    }
                } else {
                    let steps = Int(result?.sumQuantity()?.doubleValue(for: HKUnit.count()) ?? 0)
                    // If steps > 0, we have access
                    // If steps == 0, either no steps OR no permission (Apple doesn't tell us which)
                    call.resolve([
                        "hasAccess": steps > 0,
                        "steps": steps,
                        "reason": steps > 0 ? "hasData" : "noDataOrNoPermission"
                    ])
                }
            }
        }

        self.healthStore.execute(query)
    }

    /// Query step count for a date range
    @objc func querySteps(_ call: CAPPluginCall) {
        guard let startDateString = call.getString("startDate"),
              let endDateString = call.getString("endDate"),
              let startDate = Self.parseISODate(startDateString),
              var endDate = Self.parseISODate(endDateString),
              let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            call.reject("Invalid parameters: startDate and endDate required in ISO 8601 format")
            return
        }

        // Extend end date by 1 second to ensure we capture all steps up to midnight
        endDate = Calendar.current.date(byAdding: .second, value: 1, to: endDate) ?? endDate

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
                if let error = error as? HKError {
                    switch error.code {
                    case .errorAuthorizationDenied:
                        call.reject("HealthKit authorization denied")
                    case .errorNoData:
                        call.resolve([
                            "steps": 0
                        ])
                    default:
                        call.reject("Failed to query steps: \(error.localizedDescription)")
                    }
                } else if let error = error {
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
