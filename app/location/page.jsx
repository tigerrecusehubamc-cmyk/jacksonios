"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { updateLocation, updateProfile } from "@/lib/api";
import { getCityAndCountry } from "@/lib/locationUtils";
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { useSplash } from "@/components/SplashScreen";

export default function LocationPage() {
  const { hideSplash } = useSplash();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { hideSplash(); }, [hideSplash]);

  // Block Android hardware back button — user must grant or skip location to proceed
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let listenerHandle;
    App.addListener("backButton", () => {
      // Do nothing — back is blocked on Location screen
    }).then((handle) => {
      listenerHandle = handle;
    });
    return () => { listenerHandle?.remove(); };
  }, []);
  const [error, setError] = useState(null);
  const [loadingStep, setLoadingStep] = useState("");
  const router = useRouter();
  const [isSkipping, setIsSkipping] = useState(false);
  const { user, token, updateUserInContext } = useAuth();
  const [showSkipWarning, setShowSkipWarning] = useState(false);
  // Main location handler with Android optimization
  const handleContinue = async () => {
    if (!user || !token) {
      setError("Authentication session not found. Please log in again.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingStep("Starting location process...");

    try {
      // Request location permissions
      setLoadingStep("Requesting location permissions...");
      const permissionStatus = await Geolocation.requestPermissions();

      if (permissionStatus.location === 'granted') {
        setLoadingStep("Getting GPS location...");

        // Android-optimized location settings
        const locationOptions = {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000, // Accept recent location for speed
          requireAltitude: false,
          requireSpeed: false,
          requireHeading: false
        };

        // Get GPS position with retry logic
        let position = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            position = await Geolocation.getCurrentPosition(locationOptions);
            break;
          } catch (locationError) {
            if (attempt === 3) throw locationError;
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait before retry
          }
        }

        if (!position) throw new Error("Unable to get location");

        const { latitude, longitude, accuracy } = position.coords;

        // Get city/country from coordinates
        setLoadingStep("Getting location details...");
        let city = "Unknown", country = "Unknown", region = "Unknown", timezone = "Asia/Kolkata";

        try {
          const locationDetails = await getCityAndCountry(latitude, longitude);
          city = locationDetails.city || "Unknown";
          country = locationDetails.country || "Unknown";
          region = locationDetails.region || "Unknown";
          timezone = locationDetails.timezone || "Asia/Kolkata";
        } catch (geocodingError) {
          // Use fallback values
        }

        // Get IP address and network info
        setLoadingStep("Getting network information...");
        let networkData = { ip: "Unknown", isp: "Unknown", timezone };

        try {
          // Try CORS-friendly IP services
          const ipServices = [
            { url: 'https://ipapi.co/json/', parser: (data) => ({ ip: data.ip, isp: data.org || "Unknown" }) },
            { url: 'https://ipinfo.io/json', parser: (data) => ({ ip: data.ip, isp: data.org || "Unknown" }) },
            { url: 'https://jsonip.com', parser: (data) => ({ ip: data.ip, isp: "Unknown" }) }
          ];

          for (const service of ipServices) {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 8000);

              const response = await fetch(service.url, {
                signal: controller.signal,
                headers: { 'Accept': 'application/json', 'User-Agent': 'JacksonRewardsApp/1.0 (Android)' },
                mode: 'cors'
              });

              clearTimeout(timeoutId);

              if (response.ok) {
                const data = await response.json();
                const parsedData = service.parser(data);
                networkData = { ...parsedData, timezone };
                break;
              }
            } catch (serviceError) {
              console.error(`[Location] IP service ${service.url} failed:`, serviceError);
              continue; // Try next service
            }
          }
        } catch (networkError) {
          // Use fallback values
        }

        // Prepare location data for API
        const locationData = {
          latitude: parseFloat(latitude.toFixed(8)),
          longitude: parseFloat(longitude.toFixed(8)),
          accuracy: Math.round(accuracy) || 15,
          country: country || "IN",
          city: city || "New Delhi",
          region: region || "Delhi",
          timezone: timezone,
          ip: networkData.ip,
          isp: networkData.isp,
          platform: "android",
          userAgent: navigator.userAgent,
          language: navigator.language,
          locationSource: "gps"
        };

        // Send to backend
        setLoadingStep("Saving location data...");
        await updateLocation(locationData, token);

        // Update location on user profile
        const locationUpdate = {
          location: {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            country: locationData.country,
            city: locationData.city,
          },
        };
        updateProfile(locationUpdate, token).catch(() => { });

        // Update user in context immediately
        if (user) {
          updateUserInContext({ ...user, ...locationUpdate });
        }

        localStorage.setItem("locationCompleted", "true");
        router.push("/face-verification");

      } else {
        // Permission denied
        if (permissionStatus.location === 'denied') {
          setError("Location access is required. Please enable location permissions in your device settings and restart the app.");
        } else {
          setError("Location access is required for key features. You can enable it later in app settings.");
        }
      }
    } catch (err) {
      // Handle specific Android errors
      let errorMessage = "Could not get your location. Please ensure location services are enabled and try again.";

      if (err.code === 1) {
        errorMessage = "Location permission was denied. Please enable location access in your device settings.";
      } else if (err.code === 2) {
        errorMessage = "Location is unavailable. Please check your GPS settings and try again.";
      } else if (err.code === 3) {
        errorMessage = "Location request timed out. Please try again in an area with better GPS signal.";
      } else if (err.message.includes('Location services are not enabled') || err.message.includes('OS-PLUG-GLOC-0007')) {
        errorMessage = "Location services are disabled. Please enable location services in Android settings:\n\n1. Go to Settings > Location\n2. Turn ON Location\n3. Set location mode to 'High accuracy'\n4. Return to the app and try again.";
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!user) {
      setError("Authentication session not found. Please log in again.");
      return;
    }

    setIsSkipping(true);
    setError(null);

    try {
      console.log("User chose to skip location permission.");

      // THIS IS THE KEY CHANGE: Show the in-page warning
      setShowSkipWarning(true);

    } catch (apiError) {
      console.error("Error handling skip:", apiError);
      setError("An error occurred. Please try again.");
    } finally {
      // Stop the "Skipping..." loader, the user will now see the warning
      setIsSkipping(false);
    }
  };

  const handleConfirmSkip = () => {
    router.push("/face-verification");
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <div
      className="relative w-screen h-screen bg-[#272052] overflow-hidden"
      data-model-id="949:9584"
    >
      <div className="relative w-full max-w-[375px] h-full mx-auto flex flex-col">
        {/* Background blur effect */}
        <div className="absolute w-[300px] h-[300px] top-20 left-1/2 transform -translate-x-1/2 bg-[#af7de6] rounded-full blur-[200px] opacity-60" />

        {/* App Version */}
        <div className="absolute top-[1px] left-3 w-full h-[40px] z-10">
          <div className="absolute top-[10px] left-3 [font-family:'Poppins',Helvetica] font-light text-[#A4A4A4] text-[10px] tracking-[0] leading-3 whitespace-nowrap">
            App Version: {process.env.NEXT_PUBLIC_APP_VERSION || "V0.0.1"}
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between w-full px-5 mt-[56px] pb-4 z-10">
          <button
            className="w-6 h-6 cursor-pointer"
            aria-label="Go back"
            onClick={handleGoBack}
          >
            <img
              className="w-full h-full"
              alt=""
              src="/assets/animaapp/gGYGC01x/img/arrow-back-ios-new-2x.png"
            />
          </button>

          <h1 className="text-[#FFFFFF] [font-family:'Poppins',Helvetica] mr-20 font-semibold text-xl text-center">
            Location Access
          </h1>

          <div className="w-6 h-6"></div>
        </div>

        {/* Main content - centered */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="flex flex-col items-center text-center max-w-sm">
            <div className="w-64 h-64 mb-6 flex items-center justify-center">
              <img
                className="w-full h-full object-contain"
                alt="Location access illustration"
                src="/assets/animaapp/gGYGC01x/img/image-4028-2x.png"
                loading="eager"
              />
            </div>

            <p className="text-[#F4F3FC] [font-family:'Poppins',Helvetica] font-normal text-lg leading-relaxed mb-8">
              You must select &quot;Allow While Using the App&quot; on the next
              screen for Jackson app to work
            </p>

            {/* Progress Indicator */}
            {isLoading && (
              <div className="w-full max-w-sm mx-auto mb-4">
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center justify-center mb-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    <span className="text-white text-sm font-medium">
                      {loadingStep || "Processing..."}
                    </span>
                  </div>
                  <div className="text-gray-300 text-xs text-center">
                    This may take 5-15 seconds for accurate location
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="w-full px-6 mb-4">
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 max-w-sm mx-auto">
              <h3 className="text-red-400 font-semibold text-sm mb-2">Location Error</h3>
              <div className="text-red-300 text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">
                {error}
              </div>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-red-400 text-xs underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Bottom buttons */}
        <div className="w-full px-6 pb-8">

          {!showSkipWarning ? (
            <div className="w-full max-w-sm mx-auto">
              <button
                className="w-full h-12 rounded-xl bg-[linear-gradient(180deg,rgba(158,173,247,1)_0%,rgba(113,106,231,1)_100%)] cursor-pointer transition-opacity duration-200 hover:opacity-90 active:opacity-80 disabled:opacity-50 flex items-center justify-center mb-4"
                onClick={handleContinue}
                disabled={isLoading || isSkipping}
              >
                <span className="[font-family:'Poppins',Helvetica] font-semibold text-white text-base">
                  {isLoading ? (loadingStep || "Processing...") : "Continue"}
                </span>
              </button>

              {/* <button
                onClick={handleSkip}
                disabled={isLoading || isSkipping}
                className="w-full py-3 [font-family:'Poppins',Helvetica] font-medium text-[#FFFFFF] text-sm text-center hover:text-white transition-colors duration-200 disabled:opacity-50"
              >
                {isSkipping ? "Updating..." : "Skip for now (Jackson won't work)"}
              </button> */}
            </div>
          ) : (
            <div className="w-full max-w-sm mx-auto">
              <p className="mb-6 text-yellow-300 [font-family:'Poppins',Helvetica] text-sm text-center leading-relaxed">
                Warning: Location-dependent features won't work correctly if you skip this step.
              </p>

              <button
                className="w-full h-12 rounded-xl bg-[linear-gradient(180deg,rgba(226,106,106,1)_0%,rgba(192,57,43,1)_100%)] cursor-pointer transition-opacity duration-200 hover:opacity-90 active:opacity-80 flex items-center justify-center"
                onClick={handleConfirmSkip}
              >
                <span className="[font-family:'Poppins',Helvetica] font-semibold text-white text-base">
                  Proceed Anyway
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

