"use client";
import React, { useState } from "react";

export default function OTPPage() {
  // OTP functionality commented out
  // const [otpValues, setOtpValues] = useState(["", "", "", ""]);

  // const handleOtpChange = (index, value) => {
  //   if (value.length <= 1 && /^\d*$/.test(value)) {
  //     const newOtpValues = [...otpValues];
  //     newOtpValues[index] = value;
  //     setOtpValues(newOtpValues);

  //     // Auto-focus next input
  //     if (value && index < 3) {
  //       const nextInput = document.getElementById(`otp-${index + 1}`);
  //       if (nextInput) nextInput.focus();
  //     }
  //   }
  // };

  // const handleKeyDown = (index, e) => {
  //   if (e.key === "Backspace" && !otpValues[index] && index > 0) {
  //     const prevInput = document.getElementById(`otp-${index - 1}`);
  //     if (prevInput) prevInput.focus();
  //   }
  // };

  // const handleVerify = () => {
  //   const otpCode = otpValues.join("");
  //   console.log("OTP Code:", otpCode);
  //   // Add verification logic here
  // };

  return (
    <div className="bg-[#272052] w-screen min-h-screen flex flex-col relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute w-[300px] h-[300px] top-[-100px] left-[-50px] bg-[#af7de6] rounded-full blur-[150px] opacity-60"></div>
      <div className="absolute w-[200px] h-[200px] top-[200px] right-[-60px] bg-[#c45647] rounded-full blur-[100px] opacity-40"></div>
      <div className="absolute w-[250px] h-[250px] bottom-[100px] left-[-80px] bg-[#b379df] rounded-full blur-[120px] opacity-50"></div>

      {/* Main content */}
      {/* OTP UI commented out */}
      {/* <div className="flex-1 flex flex-col justify-center items-center px-8 py-12 relative z-10"> */}
        {/* Header */}
        {/* <div className="text-center mb-16"> */}
          {/* <h1 className="text-white text-3xl font-normal mb-8 leading-relaxed [font-family:'Poppins',Helvetica]"> */}
            {/* We have sent<br /> */}
            {/* verification code to<br /> */}
            {/* your phone number */}
          {/* </h1> */}
          {/* <p className="text-white text-base font-light [font-family:'Poppins',Helvetica]"> */}
            {/* Verify it's you */}
          {/* </p> */}
        {/* </div> */}

        {/* OTP Input */}
        {/* <div className="w-full max-w-[280px] mb-16"> */}
          {/* <div className="flex items-center justify-center gap-4" role="group" aria-label="OTP verification code input"> */}
            {/* {otpValues.map((value, index) => ( */}
              {/* <div key={index} className="w-[60px] h-[60px]"> */}
                {/* <input */}
                  {/* id={`otp-${index}`} */}
                  {/* type="text" */}
                  {/* inputMode="numeric" */}
                  {/* maxLength={1} */}
                  {/* value={value} */}
                  {/* onChange={(e) => handleOtpChange(index, e.target.value)} */}
                  {/* onKeyDown={(e) => handleKeyDown(index, e)} */}
                  {/* className="w-full h-full bg-white/10 border border-white/20 rounded-xl text-white text-2xl font-medium text-center outline-none focus:border-white/40 focus:bg-white/15 transition-all duration-200 [font-family:'Poppins',Helvetica]" */}
                  {/* aria-label={`OTP digit ${index + 1}`} */}
                  {/* placeholder="0" */}
                {/* /> */}
              {/* </div> */}
            {/* ))} */}
          {/* </div> */}
        {/* </div> */}

        {/* Verify Button */}
        {/* <div className="w-full max-w-[340px]"> */}
          {/* <button */}
            {/* onClick={handleVerify} */}
            {/* className="w-full h-14 bg-gradient-to-b from-[#9eadf7] to-[#716ae7] rounded-xl text-white text-lg font-semibold [font-family:'Poppins',Helvetica] hover:opacity-90 active:opacity-80 transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-white/30" */}
            {/* aria-label="Verify OTP code" */}
          {/* > */}
            {/* Verify */}
          {/* </button> */}
        {/* </div> */}

        {/* Resend code option */}
        {/* <div className="mt-8 text-center"> */}
          {/* <p className="text-neutral-400 text-sm [font-family:'Poppins',Helvetica]"> */}
            {/* Didn't receive the code?{" "} */}
            {/* <button className="text-white underline hover:text-white/80 transition-colors"> */}
              {/* Resend */}
            {/* </button> */}
          {/* </p> */}
        {/* </div> */}
      {/* </div> */}

      {/* Bottom indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="w-32 h-1 bg-white/30 rounded-full"></div>
      </div>
    </div>
  );
}
