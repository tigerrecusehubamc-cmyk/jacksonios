"use client";
import React, { useState } from "react";

export default function PhoneLoginPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  // const [countryCode, setCountryCode] = useState("+33");

  const handleProceed = () => {
    // OTP functionality commented out
    // console.log("Proceeding with phone number:", countryCode + phoneNumber);
    console.log("Phone number entered:", phoneNumber);
  };

  const handlePhoneChange = (e) => {
    // Allow only digits
    const digits = e.target.value.replace(/\D/g, "");
    setPhoneNumber(digits);
  };

  return (
    <div className="bg-[#272052] w-screen min-h-screen flex flex-col relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute w-[200px] h-[200px] top-[-50px] left-[-50px] bg-[#af7de6] rounded-full blur-[100px] opacity-60"></div>
      <div className="absolute w-[150px] h-[150px] top-[100px] right-[-30px] bg-[#c45647] rounded-full blur-[80px] opacity-40"></div>
      <div className="absolute w-[180px] h-[180px] bottom-[200px] left-[-60px] bg-[#b379df] rounded-full blur-[90px] opacity-50"></div>

      {/* Decorative images */}
      <img
        className="absolute w-[80px] h-[80px] top-[50px] left-[30px] object-cover"
        alt="Coins decoration"
        src="https://c.animaapp.com/TCUof8k2/img/coins-1@2x.png"
      />

      <img
        className="absolute w-[120px] h-[100px] top-[80px] right-[20px] object-cover"
        alt="Treasure chest decoration"
        src="https://c.animaapp.com/TCUof8k2/img/2211-w030-n003-510b-p1-510--converted--02-2@2x.png"
      />

      <img
        className="absolute w-[50px] h-[40px] top-[200px] right-[40px]"
        alt="Gem decoration"
        src="https://c.animaapp.com/TCUof8k2/img/gem-1@2x.png"
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-white text-3xl font-semibold mb-4 [font-family:'Poppins',Helvetica]">
            One Last Thing
          </h1>
          <p className="text-neutral-400 text-base [font-family:'Poppins',Helvetica]">
            We need your mobile number to verify your identity
          </p>
        </div>

        {/* Form */}
        <div className="w-full max-w-[340px] space-y-6">
          <div>
            <label
              htmlFor="phone-input"
              className="block text-neutral-400 text-sm mb-3 [font-family:'Poppins',Helvetica]"
            >
              Mobile Number
            </label>

            <div className="relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="mr-3">
                  <path
                    d="M3.5 2C2.67 2 2 2.67 2 3.5V14.5C2 15.33 2.67 16 3.5 16H14.5C15.33 16 16 15.33 16 14.5V3.5C16 2.67 15.33 2 14.5 2H3.5Z"
                    stroke="#d3d3d3"
                    strokeWidth="1.5"
                    fill="none"
                  />
                </svg>
              </div>

              <input
                id="phone-input"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                value={phoneNumber}
                onChange={handlePhoneChange}
                className="w-full h-14 pl-16 pr-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-neutral-400 text-base [font-family:'Poppins',Helvetica] focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all duration-200"
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <button
            onClick={handleProceed}
            className="w-full h-14 bg-gradient-to-b from-[#9eadf7] to-[#716ae7] rounded-xl text-white text-lg font-semibold [font-family:'Poppins',Helvetica] hover:opacity-90 active:opacity-80 transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-white/30"
          >
            Proceed
          </button>
        </div>
      </div>

      {/* Bottom indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="w-32 h-1 bg-white/30 rounded-full"></div>
      </div>
    </div>
  );
}
