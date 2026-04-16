"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function BlockedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    const reasonParam = searchParams.get("reason");
    const messageParam = searchParams.get("message");

    if (reasonParam) setReason(reasonParam);
    if (messageParam) setMessage(decodeURIComponent(messageParam));
  }, [searchParams]);

  // COMMENTED OUT - User must disable VPN to use app
  // const handleTryAgain = () => {
  //   try {
  //     localStorage.setItem("vpn_blocked", "false");
  //     localStorage.setItem("vpn_blocked_recent", "false");
  //     localStorage.removeItem("vpn_reason");
  //     localStorage.removeItem("vpn_message");
  //   } catch (e) {}
  //   router.replace("/welcome");
  // };

  const getIcon = () => {
    if (reason === "vpn_detected") return "🔒";
    if (reason === "proxy_detected") return "🛡️";
    if (reason === "tor_detected") return "🌐";
    if (reason === "high_risk_decision") return "⚠️";
    return "🚫";
  };

  const getTitle = () => {
    if (reason === "vpn_detected") return "VPN Detected";
    if (reason === "proxy_detected") return "Proxy Detected";
    if (reason === "tor_detected") return "Tor Network Detected";
    if (reason === "high_risk_decision") return "Access Blocked";
    return "Access Blocked";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ fontSize: "64px", marginBottom: "24px" }}>{getIcon()}</div>

      <h1
        style={{
          fontSize: "28px",
          fontWeight: "bold",
          color: "#fff",
          marginBottom: "16px",
          textAlign: "center",
        }}
      >
        {getTitle()}
      </h1>

      <p
        style={{
          color: "#9ca3af",
          textAlign: "center",
          marginBottom: "32px",
          fontSize: "14px",
          lineHeight: "1.6",
        }}
      >
        {message ||
          "For security purposes, VPN, Proxy, and Tor connections are not allowed on this app."}
      </p>

      <div
        style={{
          backgroundColor: "#111",
          padding: "16px",
          borderRadius: "8px",
          width: "100%",
          maxWidth: "320px",
          marginBottom: "24px",
        }}
      >
        <p
          style={{
            color: "#6b7280",
            fontSize: "12px",
            textAlign: "center",
          }}
        >
          If you believe this is an error, please contact our support team.
        </p>
      </div>

      {/* Try Again button commented out - user must disable VPN */}
      {/* 
      <button
        onClick={handleTryAgain}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        style={{
          width: "100%",
          maxWidth: "320px",
          padding: "14px 20px",
          background: "linear-gradient(180deg, rgba(158,173,247,1) 0%, rgba(113,106,231,1) 100%)",
          color: "#fff",
          fontWeight: "600",
          borderRadius: "8px",
          border: "none",
          cursor: "pointer",
          fontSize: "16px",
          transform: isPressed ? "scale(0.95)" : "scale(1)",
          transition: "transform 150ms ease",
          boxShadow: "none",
        }}
      >
        Try Again
      </button>
      */}
    </div>
  );
}

export default function BlockedPage() {
  return (
    <Suspense fallback={null}>
      <BlockedContent />
    </Suspense>
  );
}
