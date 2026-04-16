// ============================================================================
// ALTERNATIVE UPDATE METHOD FOR BIOMETRIC SETUP
// ============================================================================
// If findByIdAndUpdate is not working, try this approach using save()
// Replace the update section in routes/biometric-fixed.js around line 433-485
// ============================================================================

    // 🔥 ALTERNATIVE: Use save() method instead of findByIdAndUpdate
    // This sometimes works better for nested objects
    
    // Fetch the user document
    const userDoc = await User.findById(user._id);
    
    if (!userDoc) {
      console.error(`[BIOMETRIC-SETUP] User not found: ${user._id}`);
      return res.status(404).json({ error: "User not found" });
    }
    
    // Initialize biometric object if it doesn't exist
    if (!userDoc.biometric) {
      userDoc.biometric = {
        enabled: false,
        attempts: 0
      };
    }
    
    // Set top-level biometric fields
    userDoc.biometric.setup = true;
    userDoc.biometric.type = type;
    userDoc.biometric.lastSetupAt = new Date();
    userDoc.biometric.attempts = 0;
    userDoc.biometric.lockedUntil = null;
    
    // Initialize nested objects if they don't exist
    if (!userDoc.biometric.faceVerification) {
      userDoc.biometric.faceVerification = {};
    }
    
    if (!userDoc.biometric.livenessCheck) {
      userDoc.biometric.livenessCheck = {};
    }
    
    // Set nested verification fields
    if (verificationData) {
      userDoc.biometric.faceVerification.verified = true;
      userDoc.biometric.faceVerification.confidenceScore = verificationData.faceMatchScore || 1.0;
      userDoc.biometric.faceVerification.lastVerified = new Date();
      userDoc.biometric.faceVerification.verificationAttempts = 0;
      
      userDoc.biometric.livenessCheck.lastChecked = new Date();
      userDoc.biometric.livenessCheck.lastScore = verificationData.livenessScore || 1.0;
      userDoc.biometric.livenessCheck.lastDeviceId = deviceId;
      userDoc.biometric.livenessCheck.lastScanType = type;
    } else {
      // Initialize even without verificationData
      userDoc.biometric.faceVerification.verified = false;
      userDoc.biometric.faceVerification.verificationAttempts = 0;
      
      userDoc.biometric.livenessCheck.lastChecked = null;
      userDoc.biometric.livenessCheck.lastScore = null;
      userDoc.biometric.livenessCheck.lastDeviceId = deviceId || null;
      userDoc.biometric.livenessCheck.lastScanType = type || null;
    }
    
    // Log before save
    console.log(`[BIOMETRIC-SETUP] Saving user ${user._id} with biometric:`, {
      setup: userDoc.biometric.setup,
      type: userDoc.biometric.type,
      hasFaceVerification: !!userDoc.biometric.faceVerification,
      hasLivenessCheck: !!userDoc.biometric.livenessCheck,
    });
    
    // Save the document
    // Use validateBeforeSave: false to skip validation
    // Use markModified to ensure nested objects are saved
    userDoc.markModified('biometric');
    userDoc.markModified('biometric.faceVerification');
    userDoc.markModified('biometric.livenessCheck');
    
    const savedUser = await userDoc.save({ validateBeforeSave: false });
    
    // Verify the save
    console.log(`[BIOMETRIC-SETUP] After save - setup:`, savedUser.biometric?.setup);
    console.log(`[BIOMETRIC-SETUP] After save - type:`, savedUser.biometric?.type);
    console.log(`[BIOMETRIC-SETUP] After save - verified:`, savedUser.biometric?.faceVerification?.verified);
    
    // Double-check by fetching from database
    const verifyUser = await User.findById(user._id).lean();
    console.log(`[BIOMETRIC-SETUP] Database verification:`, {
      setup: verifyUser.biometric?.setup,
      type: verifyUser.biometric?.type,
      verified: verifyUser.biometric?.faceVerification?.verified,
      hasFaceVerification: !!verifyUser.biometric?.faceVerification,
      hasLivenessCheck: !!verifyUser.biometric?.livenessCheck,
      fullBiometric: JSON.stringify(verifyUser.biometric, null, 2)
    });
    
    // Use savedUser for response instead of updatedUser
    const updatedUser = savedUser;

// ============================================================================
// INSTRUCTIONS:
// ============================================================================
// 1. Find the section in routes/biometric-fixed.js starting at line 433
// 2. Replace the update object building and findByIdAndUpdate with the code above
// 3. Keep the rest of the endpoint code (logging, response, etc.)
// 4. Test the registration again
// ============================================================================
