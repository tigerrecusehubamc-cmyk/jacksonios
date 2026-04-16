"use client";


import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

export const NavigationGuard = ({ children }) => {
    const router = useRouter();

    // localStorage is synchronous — read token immediately, no loading state needed
    const token = typeof window !== "undefined" ? localStorage.getItem('authToken') : null;

    useEffect(() => {
        if (!token) {
            router.push('/login');
        }
    }, [token, router]);

    if (!token) return null;

    return <>{children}</>;
};
