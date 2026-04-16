"use client";
import React from "react";

const NotificationBanner = ({ notification, onDismiss }) => {
    if (!notification) return null;

    const getNotificationStyle = (type) => {
        switch (type) {
            case "success":
                return {
                    borderColor: "#10b981",
                    color: "#ffffff",
                };
            case "warning":
                return {
                    borderColor: "#f59e0b",
                    color: "#ffffff",
                };
            case "error":
                return {
                    borderColor: "#ef4444",
                    color: "#ffffff",
                };
            case "info":
            default:
                return {
                    borderColor: "#3b82f6",
                    color: "#ffffff",
                };
        }
    };

    const style = getNotificationStyle(notification.type);

    return (
        <div
            className="fixed top-4 left-1/2 z-[9999] w-[min(100%,650px)] -translate-x-1/2 px-4 py-3 shadow-2xl backdrop-blur-xl bg-slate-900/95 border border-slate-700/80 rounded-2xl"
            style={{ borderLeftWidth: 4, borderLeftStyle: 'solid', borderLeftColor: style.borderColor }}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div
                        className="flex h-9 w-9 items-center justify-center rounded-2xl"
                        style={{ backgroundColor: style.borderColor + '22' }}
                    >
                        <span className="text-sm font-semibold text-white">!</span>
                    </div>
                    <p
                        className="text-sm font-medium text-white leading-5"
                        style={{ color: style.color }}
                    >
                        {notification.message}
                    </p>
                </div>
                <button
                    onClick={() => onDismiss(notification._id)}
                    className="flex-shrink-0 rounded-full p-2 text-white transition hover:bg-white/10"
                    aria-label="Close notification"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default NotificationBanner;

