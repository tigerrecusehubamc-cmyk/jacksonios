"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword, verifyResetToken } from "@/lib/api";

const ResetPasswordComponent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const [showPassword1, setShowPassword1] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  // ✅ Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // ✅ Read token
  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    if (!tokenFromUrl) {
      setMessage("Invalid or missing reset token. Please request a new link.");
      setIsError(true);
      setIsTokenValid(false);
      setIsVerifying(false);
      return;
    }

    let cancelled = false;
    setToken(tokenFromUrl);
    setIsVerifying(true);

    verifyResetToken(tokenFromUrl)
      .then(() => {
        if (cancelled) return;
        setIsTokenValid(true);
        setMessage("");
        setIsError(false);
      })
      .catch((error) => {
        if (cancelled) return;
        setIsTokenValid(false);
        setMessage(
          error.message ||
            "This reset link is invalid or expired. Please request a new one.",
        );
        setIsError(true);
      })
      .finally(() => {
        if (!cancelled) setIsVerifying(false);
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  // ✅ Validation logic
  const validatePasswords = (pw = newPassword, cpw = confirmPassword) => {
    const errs = {};

    if (!pw) errs.newPassword = "New password is required";
    if (!cpw) errs.confirmPassword = "Confirm password is required";

    if (pw && pw.length < 8)
      errs.newPassword = "Password must be at least 8 characters";
    if (pw && !/[A-Z]/.test(pw))
      errs.newPassword = "Must include at least 1 uppercase letter";
    if (pw && !/[a-z]/.test(pw))
      errs.newPassword = "Must include at least 1 lowercase letter";
    if (pw && !/[0-9]/.test(pw))
      errs.newPassword = "Must include at least 1 number";
    if (pw && !/[!@#$%^&*(),.?\":{}|<>]/.test(pw))
      errs.newPassword = "Must include at least 1 special character";

    if (pw && cpw && pw !== cpw)
      errs.confirmPassword = "Passwords do not match";

    return errs;
  };

  useEffect(() => {
    const errs = validatePasswords(newPassword, confirmPassword);
    setErrors(errs);
  }, [newPassword, confirmPassword]);

  const isFormValid =
    token &&
    isTokenValid &&
    newPassword &&
    confirmPassword &&
    Object.keys(errors).length === 0;

  // ✅ Submit handler
  const handleResetPassword = async (e) => {
    e.preventDefault();

    const errs = validatePasswords();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsLoading(true);
    setMessage("");
    setIsError(false);

    try {
      await resetPassword(token, newPassword);

      // ✅ Show success modal (NO auto redirect)
      setShowSuccessModal(true);

    } catch (error) {
      setMessage(error.message || "Failed to reset password.");
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#272052] flex h-screen justify-center w-full relative overflow-hidden">
      <div className="bg-[#272052] w-full max-w-[375px] relative">
        <div className="absolute w-[358px] h-[358px] top-0 left-[9px] bg-[#af7de6] rounded-[179px] blur-[250px]" />
        <div className="absolute inset-0 bg-[#20202033] backdrop-blur-[5px]" />

        <div className="absolute w-[280px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[15px] p-4 [background:radial-gradient(50%_50%_at_50%_50%,rgba(134,47,148,1)_0%,rgba(6,9,78,1)_100%)]">

          <div className="text-white text-[64px] flex justify-center mt-3">🔑</div>

          <h1 className="text-center text-[#efefef] text-2xl font-extrabold mt-3">
            Reset Password
          </h1>

          <form onSubmit={handleResetPassword} className="mt-4 px-2">
            <p className="text-white text-[13px] text-center mb-4">
              Enter your new password below to finish resetting.
            </p>

            {/* ✅ NEW PASSWORD */}
            <div className="mb-3">
              <label className="text-neutral-400 text-[14px]">New Password</label>

              <div className="relative w-full h-[45px] bg-white/10 rounded-lg border border-white/20 flex items-center">
                <input
                  disabled={isVerifying || !isTokenValid}
                  type={showPassword1 ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-full px-4 bg-transparent text-white outline-none"
                  placeholder="Enter new password"
                />

                {/* ✅ SVG ICONS */}
                <span
                  className="absolute right-4 w-5 h-5 cursor-pointer flex items-center justify-center"
                  onClick={() => setShowPassword1(!showPassword1)}
                >
                  {showPassword1 ? (
                    // 👁️ SHOW PASSWORD
                    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
                      <path d="M10 12c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" stroke="#d3d3d3" strokeWidth="1.2" />
                      <path d="M10 4C5.5 4 1.73 7.11 1 10c.73 2.89 4.5 6 9 6s8.27-3.11 9-6c -.73-2.89-4.5-6-9-6z" stroke="#d3d3d3" strokeWidth="1.2" />
                    </svg>
                  ) : (
                    // 👁️‍🗨️ HIDE PASSWORD
                    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
                      <path d="M10 12c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" stroke="#d3d3d3" strokeWidth="1.2" />
                      <path d="M10 4C5.5 4 1.73 7.11 1 10c .73 2.89 4.5 6 9 6s8.27-3.11 9-6c-.73 -2.89-4.5-6-9-6z" stroke="#d3d3d3" strokeWidth="1.2" />
                      <line x1="3" y1="3" x2="17" y2="17" stroke="#d3d3d3" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  )}
                </span>
              </div>

              {errors.newPassword && (
                <p className="text-red-400 text-xs mt-1">{errors.newPassword}</p>
              )}
            </div>

            {/* ✅ CONFIRM PASSWORD */}
            <div className="mb-3">
              <label className="text-neutral-400 text-[14px]">Confirm Password</label>

              <div className="relative w-full h-[45px] bg-white/10 rounded-lg border border-white/20 flex items-center">
                <input
                  disabled={isVerifying || !isTokenValid}
                  type={showPassword2 ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-full px-4 bg-transparent text-white outline-none"
                  placeholder="Confirm password"
                />

                {/* ✅ SVG ICONS */}
                <span
                  className="absolute right-4 w-5 h-5 cursor-pointer flex items-center justify-center"
                  onClick={() => setShowPassword2(!showPassword2)}
                >
                  {showPassword2 ? (
                    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
                      <path d="M10 12c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" stroke="#d3d3d3" strokeWidth="1.2" />
                      <path d="M10 4C5.5 4 1.73 7.11 1 10c .73 2.89 4.5 6 9 6s8.27-3.11 9-6c -.73-2.89-4.5-6-9-6z" stroke="#d3d3d3" strokeWidth="1.2" />
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
                      <path d="M10 12c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" stroke="#d3d3d3" strokeWidth="1.2" />
                      <path d="M10 4C5.5 4 1.73 7.11 1 10c .73 2.89 4.5 6 9 6s8.27-3.11 9-6c -.73-2.89-4.5-6-9-6z" stroke="#d3d3d3" strokeWidth="1.2" />
                      <line x1="3" y1="3" x2="17" y2="17" stroke="#d3d3d3" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  )}
                </span>
              </div>

              {errors.confirmPassword && (
                <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {message && (
              <p
                className={`text-center text-xs mt-2 ${
                  isError ? "text-red-400" : "text-green-400"
                }`}
              >
                {message}
              </p>
            )}

            {isVerifying && (
              <p className="text-center text-xs mt-2 text-neutral-300">
                Verifying reset link...
              </p>
            )}

            <button
              type="submit"
              disabled={!isFormValid || isLoading || isVerifying}
              className={`w-full h-[40px] mt-4 rounded-lg text-white font-semibold transition ${
                isFormValid && !isLoading
                  ? "bg-gradient-to-b from-[#9eadf7] to-[#716ae7] hover:opacity-90"
                  : "bg-gray-500 opacity-50 cursor-not-allowed"
              }`}
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          <button
            onClick={() => router.push("/login")}
            className="text-neutral-400 text-center w-full mt-3"
          >
            Back to Login
          </button>
        </div>
      </div>

      {/* ✅ SUCCESS MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 flex justify-center items-center bg-black/40 backdrop-blur-sm">
          <div className="w-[280px] rounded-[15px] p-4 [background:radial-gradient(50%_50%_at_50%_50%,rgba(140,227,140,1)_0%,rgba(6,9,78,1)_100%)]">
            <div className="text-white text-[64px] flex justify-center">✅</div>

            <h2 className="text-center text-white text-xl font-bold mt-2">
              Password Reset Successful!
            </h2>

            <p className="text-center text-white/80 text-sm mt-2">
              Your password has been updated. Please log in to continue.
            </p>

            <button
              onClick={() => router.push("/login")}
              className="w-full h-[40px] bg-gradient-to-b from-[#9eadf7] to-[#716ae7] text-white rounded-lg mt-4 font-semibold"
            >
              Go to Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ResetPassword = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <ResetPasswordComponent />
  </Suspense>
);

export default ResetPassword;
