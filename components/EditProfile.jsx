"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { uploadAvatar } from "@/lib/api";
import { useSelector, useDispatch } from "react-redux";
import { updateUserProfile, fetchUserProfile } from "@/lib/redux/slice/profileSlice";

export const EditProfile = () => {
  const router = useRouter();
  const { token } = useAuth();
  const dispatch = useDispatch();
  const { details: profile, detailsStatus: profileStatus } = useSelector((state) => state.profile);
  console.log(profile)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    socialTag: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [originalAvatar, setOriginalAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (profileStatus === 'succeeded' && profile) {
      setFormData({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        email: profile.email || "",
        mobile: profile.mobile || "",
        socialTag: profile.socialTag || "",
      });
      if (profile.profile?.avatar) {
        // Clean and fix the avatar URL
        let avatarUrl = profile.profile.avatar;

        // Remove any leading '=' characters
        avatarUrl = avatarUrl.replace(/^=+/, '');

        // Ensure the avatar URL has proper protocol
        if (!avatarUrl.startsWith('http')) {
          avatarUrl = `https://rewardsuatapi.hireagent.co${avatarUrl}`;
        }

        setAvatarPreview(avatarUrl);
        setOriginalAvatar(avatarUrl);
      }
    }
  }, [profile, profileStatus]);



  const validateField = (field, value) => {
    const errors = {};
    const trimmedValue = value ? value.trim() : '';

    if (field === 'firstName' || field === 'lastName') {
      const fieldName = field === 'firstName' ? 'First name' : 'Last name';

      if (!value || value.trim() === '') {
        if (field === 'firstName') {
          errors[field] = 'First name is required';
        }
      } else if (value.length > 10) {
        errors[field] = `${fieldName} must be 10 characters or less`;
      } else if (!/^[a-zA-Z\s'-]+$/.test(value)) {
        errors[field] = `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`;
      }
    }

    if (field === 'email') {
      if (!value || value.trim() === '') {
        errors[field] = 'Email is required';
      } else if (value.length > 50) {
        errors[field] = 'Email must be 50 characters or less';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors[field] = 'Enter a valid email address';
      }
    }

    if (field === 'mobile') {
      if (!value || value.trim() === '') {
        errors[field] = 'Mobile number is required';
      } else if (value.length > 15) {
        errors[field] = 'Mobile number must be 15 characters or less';
      } else if (!/^\+?[0-9\s\-\(\)]+$/.test(value)) {
        errors[field] = 'Mobile number can only contain numbers';
      }
    }

    if (field === 'lastName') {
      if (!trimmedValue) {
        errors[field] = 'Last name is required';
      } else if (trimmedValue.length > 10) {
        errors[field] = 'Last name must be 10 characters or less';
      } else if (!/^[a-zA-Z\s'-]+$/.test(trimmedValue)) {
        errors[field] = 'Last name can only contain letters, spaces, hyphens, and apostrophes';
      }
    }

    if (field === 'socialTag') {
      if (!trimmedValue) {
        errors[field] = 'Social Tag is required';
      } else if (trimmedValue.length < 3) {
        errors[field] = 'Social Tag must be at least 3 characters';
      } else if (trimmedValue.length > 20) {
        errors[field] = 'Social Tag must be 20 characters or less';
      } else if (!/^[a-zA-Z0-9_]+$/.test(trimmedValue)) {
        errors[field] = 'Social Tag can only contain letters, numbers, and underscores';
      }
    }
    return errors;
  };

  const handleInputChange = (field, value) => {
    let truncatedValue = value;
    if ((field === 'firstName' || field === 'lastName') && value.length > 10) {
      truncatedValue = value.substring(0, 10);
    } else if (field === 'email' && value.length > 50) {
      truncatedValue = value.substring(0, 50);
    } else if (field === 'mobile' && value.length > 15) {
      truncatedValue = value.substring(0, 15);
    } else if (field === 'socialTag' && value.length > 20) {
      truncatedValue = value.substring(0, 20);
    }

    setFormData((prev) => ({ ...prev, [field]: truncatedValue }));
    const fieldError = validateField(field, truncatedValue);
    setFieldErrors((prev) => ({
      ...prev,
      [field]: fieldError[field] || null
    }));
  };

  // Check if form is valid
  const isFormValid = () => {
    const errors = {
      ...validateField('firstName', formData.firstName),
      ...validateField('lastName', formData.lastName),
      ...validateField('email', formData.email),
      ...validateField('mobile', formData.mobile),
      ...validateField('socialTag', formData.socialTag),
    };

    return Object.keys(errors).length === 0 && formData.firstName.trim() !== '';
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    if (!token) {
      setError("Session expired. Please log in again.");
      return;
    }
    if (!formData.firstName) {
      setError("First name cannot be empty.");
      return;
    }

    setIsSaving(true);
    setError(null);
    const dataToUpdate = {
      firstName: formData.firstName,
      lastName: formData.lastName || "-",
      mobile: formData.mobile,
      status: "active",
      socialTag: formData.socialTag,
      theme: profile?.profile?.theme || "light",
    };
    try {
      const resultAction = await dispatch(updateUserProfile({ profileData: dataToUpdate, token }));

      if (updateUserProfile.rejected.match(resultAction)) {
        throw new Error(resultAction.payload);
      }
      // Use router.back() for smoother navigation without re-render
      router.back();
    } catch (err) {
      setError(err.message || "Failed to save profile.");
      console.error("Failed to save profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfilePictureChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);

    if (token) {
      const upload = async () => {
        try {
          await uploadAvatar(file, token);
          dispatch(fetchUserProfile(token));
          alert("Avatar updated successfully!");
        } catch (err) {
          setError(err.message || "Failed to upload avatar.");
          setAvatarPreview(originalAvatar);
          console.error("Failed to upload avatar:", err);
        }
      };
      upload();
    }
  };

  const triggerFileInput = () => fileInputRef.current.click();
  const handleClose = () => router.back();

  // Only show loading if we don't have any profile data at all
  if (profileStatus === 'loading' && !profile) {
    return <div className="bg-[#272052] flex h-screen justify-center items-center text-white">Loading Profile Editor...</div>;
  }
  if (profileStatus === 'failed' && !profile) {
    return <div className="bg-[#272052] flex h-screen justify-center items-center text-red-500">Could not load profile data to edit.</div>;
  }


  return (
    <div className="bg-[#272052] flex min-h-screen flex-row justify-center w-full relative overflow-auto scrollbar-hide">
      <div
        className="relative w-full max-w-[390px] min-h-full bg-[#272052] mx-auto"
        data-model-id="2739:7886"
      >
        <header className="absolute w-full h-24 top-[10px] left-0 px-6 pt-4">
          <div className="relative w-full h-full flex items-center justify-between">
            <div
              className="w-[48px] h-[48px] font-semibold text-[32px] [font-family:'Poppins',Helvetica] text-white tracking-[0] leading-[normal] flex items-center justify-center"
              role="img"
              aria-label="Theme toggle"
            >
              ☀
            </div>

            <h1 className="absolute left-1/2 transform -translate-x-1/2 [font-family:'Poppins',Helvetica] font-bold text-white text-xl text-center tracking-[0] leading-[normal]">
              Edit Profile
            </h1>

            <button
              onClick={handleClose}
              className="w-[31px] h-[31px] cursor-pointer flex items-center justify-center"
              aria-label="Close edit profile"
            >
              <img
                className="w-full h-full"
                alt="Close"
                src="https://c.animaapp.com/mFM2C37Z/img/close.svg"
              />
            </button>
          </div>
        </header>

        {/* White divider below header */}
        <div className="absolute w-full h-[3px] top-[96px] left-0 bg-white"></div>

        <div className="absolute w-[132px] h-[132px] top-[140px] left-1/2 transform -translate-x-1/2">
          <div className="relative w-full h-full">
            <img
              src={avatarPreview || "/profile.png"}
              alt="Profile avatar preview"
              width={132}
              height={132}
              className="w-[132px] h-[132px] object-cover rounded-full"
              crossOrigin="anonymous"
              onError={(e) => { e.target.src = "/profile.png"; }}
            />
            <div className="absolute w-[45px] h-[45px] bottom-0 right-0">
              <div className="relative w-[43px] h-[45px]">
                <div className="w-[43px] h-[43px] bg-gray-800 rounded-[21.73px] border-[5px] border-solid border-gray-900" />

                {/* Hidden file input for avatar upload */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleProfilePictureChange}
                  className="hidden"
                  accept="image/*"
                />

                <button
                  type="button" // Important: prevent form submission
                  onClick={triggerFileInput}
                  className="absolute inset-0 flex items-center justify-center font-medium text-xl [font-family:'Poppins',Helvetica] mb-1 text-white tracking-[0] leading-[normal] cursor-pointer"
                  aria-label="Change profile picture"
                >
                  📸
                </button>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveChanges} className="absolute top-[300px] left-0 w-full px-8 pb-16 space-y-6">
          <div className="w-full">
            <label
              htmlFor="firstName"
              className="block [font-family:'Poppins',Helvetica] font-medium text-neutral-400 text-[14.3px] tracking-[0] leading-[normal]"
            >
              First Name
            </label>
            <div className="relative w-full">
              <img className="w-full h-[54px]" alt="Input background" src="/editprofilebg.png" />
              <input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                className="absolute inset-0 bg-transparent px-4 py-3 text-white [font-family:'Poppins',Helvetica] text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                placeholder="Enter your first name"
                maxLength="30"
                required
              />

            </div>
            {fieldErrors.firstName && (
              <div className="mt-1 text-red-400 text-xs [font-family:'Poppins',Helvetica]">
                {fieldErrors.firstName}
              </div>
            )}
          </div>

          <div className="w-full">
            <label
              htmlFor="lastName"
              className="block [font-family:'Poppins',Helvetica] font-medium text-neutral-400 text-[14.3px] tracking-[0] leading-[normal] "
            >
              Last Name
            </label>
            <div className="relative w-full">
              <img className="w-full h-[54px]" alt="Input background" src="/editprofilebg.png" />
              <input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                className="absolute inset-0 bg-transparent px-4 py-3 text-white [font-family:'Poppins',Helvetica] text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                placeholder="Enter your last name"
                maxLength="30"
              />

            </div>
            {fieldErrors.lastName && (
              <div className="mt-1 text-red-400 text-xs [font-family:'Poppins',Helvetica]">

                {fieldErrors.lastName}
              </div>
            )}
          </div>

          <div className="w-full">
            <label
              htmlFor="emailAddress"
              className="block [font-family:'Poppins',Helvetica] font-medium text-neutral-400 text-[14.3px] tracking-[0] leading-[normal] "
            >
              Email Address
            </label>
            <div className="relative w-full">
              <img className="w-full h-[54px]" alt="Input background" src="/editprofilebg.png" />
              <input
                id="emailAddress"
                type="email"
                value={formData.email || ""}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="absolute inset-0 bg-transparent px-4 py-3 text-white [font-family:'Poppins',Helvetica] text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                placeholder="Enter your email"
                maxLength="50"
                required
              />

            </div>
            {fieldErrors.email && (
              <div className="mt-1 text-red-400 text-xs [font-family:'Poppins',Helvetica]">

                {fieldErrors.email}
              </div>
            )}
          </div>

          <div className="w-full">
            <label
              htmlFor="phoneNumber"
              className="block [font-family:'Poppins',Helvetica] font-medium text-neutral-400 text-[14.3px] tracking-[0] leading-[normal] "
            >
              Phone Number
            </label>
            <div className="relative w-full">
              <img className="w-full h-[54px]" alt="Input background" src="/editprofilebg.png" />
              <input
                id="phoneNumber"
                type="tel"
                value={formData.mobile || ""}
                onChange={(e) => handleInputChange("mobile", e.target.value)}
                className="absolute inset-0 bg-transparent px-4 py-3 text-white [font-family:'Poppins',Helvetica] text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                placeholder="Enter your phone number"
                maxLength="15"
                required
              />

            </div>
            {fieldErrors.mobile && (
              <div className="mt-1 text-red-400 text-xs [font-family:'Poppins',Helvetica]">

                {fieldErrors.mobile}
              </div>
            )}
          </div>

          <div className="w-full">
            <label
              htmlFor="socialTag"
              className="block [font-family:'Poppins',Helvetica] font-medium text-neutral-400 text-[14.3px] tracking-[0] leading-[normal] "
            >
              Social Tag
            </label>
            <div className="relative w-full">
              <img className="w-full h-[54px]" alt="Input background" src="/editprofilebg.png" />
              <input
                id="socialTag"
                type="text"
                value={formData.socialTag || ""}
                onChange={(e) => handleInputChange("socialTag", e.target.value)}
                className="absolute inset-0 bg-transparent px-4 py-3 text-white [font-family:'Poppins',Helvetica] text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                placeholder="Enter your social tag (e.g., gamerpro)"
                maxLength="20"
              />

            </div>
            {fieldErrors.socialTag && (
              <div className="mt-1 text-red-400 text-xs [font-family:'Poppins',Helvetica]">
                {fieldErrors.socialTag}
              </div>
            )}
          </div>

          {error && <p className="text-red-400 text-center text-sm -mt-2">{error}</p>}

          <div className="w-full pt-4 space-y-3">
            <button
              type="submit"
              disabled={isSaving || !isFormValid()}
              className={`w-full h-[42px] rounded-lg transition-opacity flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${isFormValid() && !isSaving
                ? 'bg-[linear-gradient(180deg,rgba(158,173,247,1)_0%,rgba(113,106,231,1)_100%)] hover:opacity-90 cursor-pointer'
                : 'bg-gray-500 cursor-not-allowed'
                }`}
            >
              <span className="[font-family:'Poppins',Helvetica] font-semibold text-white text-sm tracking-[0] leading-[normal]">
                {isSaving ? "Saving..." : "Save Changes"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="w-full  h-[42px] bg-[#2c2c2c] rounded-lg hover:bg-[#3c3c3c] transition-colors cursor-pointer flex items-center justify-center"
            >
              <span className="[font-family:'Poppins',Helvetica] font-semibold text-white text-sm tracking-[0] leading-[normal]">
                Cancel
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};