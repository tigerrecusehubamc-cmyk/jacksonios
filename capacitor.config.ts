import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jackson.rewards.app',
  appName: 'Jackson',
  webDir: 'out',
  server: {
    allowNavigation: [
      'http://94.249.151.176:4001'
    ],
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000, // Show for 2 seconds minimum
      launchAutoHide: true, // Auto hide after duration
      backgroundColor: "#000000",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false, // No spinners
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#af7de6",
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: "launch_screen",
      useDialog: true,
    },
    Geolocation: {
      // Android-specific location configuration
      android: {
        enableHighAccuracy: true,
        timeout: 30000, // 30 seconds timeout for Android
        maximumAge: 0, // Force fresh location
        requireAltitude: false,
        requireSpeed: false,
        requireHeading: false,
        // Android location provider settings
        locationProvider: "gps", // Use GPS as primary location source
        // Enable background location if needed
        enableBackgroundLocation: false,
        // Android-specific permission handling
        permissionRationale: "This app needs location access to provide location-based features and rewards.",
        // Android location accuracy settings
        locationAccuracy: "high", // high, medium, low
        // Android location update settings
        locationUpdateInterval: 10000, // 10 seconds
        fastestLocationUpdateInterval: 5000, // 5 seconds
      },
      // iOS-specific location configuration
      ios: {
        enableHighAccuracy: true,
        timeout: 15000, // 15 seconds timeout for iOS
        maximumAge: 0,
        requireAltitude: false,
        requireSpeed: false,
        requireHeading: false,
        // iOS location authorization
        authorizationLevel: "whenInUse", // whenInUse, always
        // iOS location accuracy
        locationAccuracy: "best",
      }
    },
    Stripe: {
      publishableKey: "pk_test_51SBUH3PJY1SybSwUCQEkb8qM1YDRgbKitMYFGpRDcryE1AFDPIHoI4ovL61hITqeaoFeNgDkFlZ5tBV7rFv7B3U0008lDMyvfe", // Add your Stripe publishable key here
      stripeAccount: "", // Optional: Add if using Connect
      setReturnUrlSchemeOnAndroid: true,
      setReturnUrlSchemeOnIOS: true,
      returnUrlScheme: "jacksonrewards", // Use payment success scheme
    },
    BiometricAuth: {
      // iOS Face ID usage description
      ios: {
        NSFaceIDUsageDescription: "Jackson app uses Face ID to securely verify your identity and protect your account."
      },
      // Android biometric configuration
      android: {
        biometricPromptTitle: "Face Verification",
        biometricPromptSubtitle: "Complete face verification to secure your account",
        biometricPromptNegativeButtonText: "Cancel"
      }
    },
  },
  ios: {
    packageClassList: [
      "CapacitorPlayIntegrityPlugin",
      "StripePlugin",
      "AppPlugin",
      "CAPBrowserPlugin",
      "CAPCameraPlugin",
      "DevicePlugin",
      "FilesystemPlugin",
      "GeolocationPlugin",
      "PreferencesPlugin",
      "SplashScreenPlugin",
      "StatusBarPlugin",
      "NavigationBarPlugin",
      "NativeBiometric",
      "HealthKitBridge"
    ]
  },
};

export default config;