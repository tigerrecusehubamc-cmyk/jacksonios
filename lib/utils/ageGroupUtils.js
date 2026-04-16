/**
 * Utility functions for age group conversion
 * Converts age (number) to age group string format used by API
 */

/**
 * Convert age to age group string
 * @param {number} age - User's age (e.g., 29)
 * @returns {string} Age group string (e.g., "25-34")
 */
export const getAgeGroupFromAge = (age) => {
  if (!age || typeof age !== 'number') {
    return "18-24"; // Default fallback
  }

  if (age < 18) return "18-24"; // Default to 18-24 for under 18
  if (age >= 18 && age <= 24) return "18-24";
  if (age >= 25 && age <= 34) return "25-34";
  if (age >= 35 && age <= 44) return "35-44";
  if (age >= 45 && age <= 54) return "45-54";
  if (age >= 55 && age <= 64) return "55-64";
  if (age >= 65) return "65+";
  
  return "18-24"; // Default fallback
};

/**
 * Get age group from user profile
 * Handles both age (number) and ageRange (string) formats
 * @param {Object} userProfile - User profile object
 * @returns {string} Age group string
 */
export const getAgeGroupFromProfile = (userProfile) => {
  if (!userProfile) {
    return "18-24"; // Default fallback
  }

  // If ageRange is already provided as string (e.g., "25-34")
  if (userProfile.ageRange) {
    return userProfile.ageRange;
  }

  // If age is provided as number, convert to age group
  if (userProfile.age !== undefined && userProfile.age !== null) {
    return getAgeGroupFromAge(userProfile.age);
  }

  // Fallback to default
  return "18-24";
};

/**
 * Get gender from user profile
 * @param {Object} userProfile - User profile object
 * @returns {string} Gender string (e.g., "male", "female")
 */
export const getGenderFromProfile = (userProfile) => {
  if (!userProfile) {
    return "male"; // Default fallback
  }

  // Check various possible gender fields
  if (userProfile.gender) {
    return userProfile.gender.toLowerCase();
  }

  // Fallback to default
  return "male";
};

