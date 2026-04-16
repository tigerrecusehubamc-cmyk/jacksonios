import React, { Suspense } from "react";
import { TicketSuccess } from "../components/TicketSuccess";

export default function TicketSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center w-full min-h-screen bg-black gap-4 px-6">
        <div className="w-20 h-20 rounded-full bg-gray-800 animate-pulse" />
        <div className="h-5 w-48 bg-gray-800 rounded animate-pulse" style={{animationDelay:'0.1s'}} />
        <div className="h-4 w-64 bg-gray-800 rounded animate-pulse" style={{animationDelay:'0.2s'}} />
        <div className="h-12 w-full max-w-xs bg-gray-800 rounded-full animate-pulse mt-4" style={{animationDelay:'0.3s'}} />
      </div>
    }>
      <TicketSuccess />
    </Suspense>
  );
}
