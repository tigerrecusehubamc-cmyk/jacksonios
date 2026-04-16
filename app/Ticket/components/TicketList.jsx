"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import {
    fetchUserTickets,
    fetchTicketStats,
    updateFilters,
    clearErrors,
    selectTickets,
    selectTicketStats,
    selectTicketFilters,
    selectTicketLoadingState,
    selectTicketErrors,
    selectPaginatedTickets
} from "@/lib/redux/slice/ticketSlice";
import {
    LoadingSkeleton,
    FilteringIndicator,
    ErrorRetryButton
} from "@/components/AndroidOptimizedLoader";
import { FilterNavigation } from "@/components/InstantFilter";

// ============================================================================
// CONSTANTS
// ============================================================================
/** Dedupe tickets fetch: avoid double hit when effect runs twice (e.g. Strict Mode remount) */
const TICKETS_FETCH_DEBOUNCE_MS = 3000;
let lastTicketsFetchTime = 0;
let initialFetchDone = false;

const FILTER_OPTIONS = [
    { id: "all", label: "All" },
    { id: "in_progress", label: "In Progress" },
    { id: "completed", label: "Completed" },
];

const STATUS_COLORS = {
    pending: "#ffa500",
    in_progress: "#8b92de",
    completed: "#b6d846",
    closed: "#666666"
};

// ============================================================================
// REUSABLE COMPONENTS
// ============================================================================
const TicketCard = React.memo(({ ticket, onClick }) => {
    const statusColor = STATUS_COLORS[ticket.status] || "#666666";
    const statusLabel = ticket.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

    const handleClick = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(ticket.id);
    }, [onClick, ticket.id]);

    // Format ticket ID to show full ID
    const formatTicketId = (id) => {
        if (!id) return 'N/A';
        return String(id);
    };

    return (
        <article
            className="flex w-full items-start justify-between pt-3 pb-4 px-0 border-b border-[#4d4d4d] cursor-pointer hover:bg-gray-800/20 transition-all"
            onClick={handleClick}
            style={{
                // Hardware acceleration for smooth interactions
                transform: 'translateZ(0)',
                willChange: 'background-color',
                // Touch-friendly sizing
                minHeight: '80px',
            }}
        >
            <div className="flex flex-1 items-start gap-3 relative min-w-0 pr-3">
                <div className="flex flex-col items-start relative flex-1 grow min-w-0">
                    {/* Ticket ID */}
                    <div className="relative w-full mb-2">
                        <p className="[font-family:'Poppins',Helvetica] font-normal text-white text-sm tracking-[0.02px] leading-[20px] break-words">
                            <span className="tracking-[0] text-gray-400">Ticket ID: </span>
                            <span className="font-semibold tracking-[0] text-white break-all">
                                {formatTicketId(ticket.ticketId || ticket.id || 'N/A')}
                            </span>
                        </p>
                    </div>

                    {/* Description Preview */}
                    <div className="relative w-full mt-1">
                        <p className="[font-family:'Poppins',Helvetica] font-normal text-[#bdbdbd] text-[13px] tracking-[0] leading-[18px] line-clamp-2 overflow-hidden break-words">
                            {(() => {
                                const desc = ticket.descriptionPreview || ticket.fullDescription || ticket.description || 'No description available';
                                // Truncate very long descriptions for preview
                                return desc.length > 120 ? desc.substring(0, 120) + '...' : desc;
                            })()}
                        </p>
                    </div>
                </div>
            </div>

            <div className="inline-flex items-center gap-1.5 relative flex-[0_0_auto] ml-2 mt-1">
                <div
                    className="relative w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: statusColor }}
                />

                <div className="relative w-fit [font-family:'Poppins',Helvetica] font-medium text-white text-sm text-right tracking-[0] leading-5 whitespace-nowrap">
                    {statusLabel}
                </div>
            </div>
        </article>
    );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const TicketList = () => {
    // ============================================================================
    // REDUX STATE
    // ============================================================================
    const dispatch = useDispatch();
    const stats = useSelector(selectTicketStats);
    const filters = useSelector(selectTicketFilters);
    const loadingState = useSelector(selectTicketLoadingState);
    const errors = useSelector(selectTicketErrors);
    const paginatedData = useSelector(selectPaginatedTickets);
    const allTickets = useSelector(selectTickets);

    // ============================================================================
    // LOCAL STATE
    // ============================================================================
    const [retryCount, setRetryCount] = useState(0);

    // ============================================================================
    // ROUTER
    // ============================================================================
    const router = useRouter();

    // ============================================================================
    // EFFECTS
    // ============================================================================
    // Load tickets and stats once on mount; time-based dedupe so Strict Mode remount doesn't double-hit
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        // Check if tickets are already loaded (prefetched from TicketForm)
        if (allTickets.length > 0) {
            return;
        }

        const now = Date.now();
        if (initialFetchDone && now - lastTicketsFetchTime < TICKETS_FETCH_DEBOUNCE_MS) return;
        initialFetchDone = true;
        lastTicketsFetchTime = now;

        dispatch(fetchUserTickets({ filters: { page: 1, limit: 100 }, token }));
        dispatch(fetchTicketStats({ token }));

        return () => {
            const t = setTimeout(() => { initialFetchDone = false; }, 500);
            return () => clearTimeout(t);
        };
    }, [dispatch]);

    // Clear errors on component mount
    useEffect(() => {
        dispatch(clearErrors());
    }, [dispatch]);

    // ============================================================================
    // HANDLERS
    // ============================================================================
    const handleFilterChange = useCallback((filterValue) => {
        // Only update the filter state locally, no API call needed
        dispatch(updateFilters({
            status: filterValue,
            page: 1 // Reset to first page when changing filters
        }));
    }, [dispatch]);

    const handlePageChange = useCallback((page) => {
        // Client-side pagination - no API call needed
        dispatch(updateFilters({ page }));
    }, [dispatch]);

    // ============================================================================
    // NAVIGATION HANDLERS
    // ============================================================================
    const handleGoBack = useCallback(() => {
        router.back();
    }, [router]);

    const handleRaiseTicket = useCallback(() => {
        router.push("/Ticket");
    }, [router]);

    const handleTicketClick = useCallback((ticketId) => {
        // Ticket details page removed - no action needed
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
            console.log('Ticket clicked:', ticketId);
        }
    }, []);

    const handleRetry = useCallback(() => {
        setRetryCount(prev => prev + 1);
        const token = localStorage.getItem('authToken');
        if (token) {
            // Retry loading tickets and stats
            dispatch(fetchUserTickets({
                filters: { page: 1, limit: 100 },
                token
            }));
            dispatch(fetchTicketStats({ token }));
        }
    }, [dispatch]);

    // ============================================================================
    // COMPUTED VALUES
    // ============================================================================
    const { isLoading, isFiltering } = loadingState;
    const error = errors.tickets;
    // Only show initial loading if no tickets are loaded at all (not just filtered to empty)
    const isInitialLoading = isLoading && allTickets.length === 0;

    return (
        <div className="flex flex-col w-full h-screen bg-black overflow-x-hidden">
            {/* App Version */}
            <div className="px-5 ml-2 [font-family:'Poppins',Helvetica] font-normal mt-[8px]     text-[#A4A4A4] text-[10px] tracking-[0] leading-3">
                App Version: V0.0.1
            </div>

            {/* Header */}
            <header className="flex flex-col w-full items-start gap-2  mt-[34px] px-5 pb-3 ">
                <div className="flex items-center gap-4 relative self-stretch w-full flex-[0_0_auto] rounded-[32px]">
                    <button
                        type="button"
                        onClick={handleGoBack}
                        className="relative w-6 h-6 cursor-pointer"
                        aria-label="Go back"
                    >
                        <svg
                            className="w-full h-full text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <h1 className="relative flex-1 [font-family:'Poppins',Helvetica] font-semibold text-white text-xl tracking-[0] leading-5  ml-3">
                        Tickets
                    </h1>
                </div>
            </header>

            {/* Filter Navigation */}
            <div className="px-5 py-3">
                <FilterNavigation
                    filters={FILTER_OPTIONS}
                    activeFilter={filters.status}
                    onFilterChange={handleFilterChange}
                />
            </div>

            {/* Raise Ticket Button */}
            <div className="px-5 pb-3">
                <button
                    type="button"
                    onClick={handleRaiseTicket}
                    className="w-full inline-flex items-center justify-center p-3 rounded-lg overflow-hidden bg-[linear-gradient(180deg,rgba(158,173,247,1)_0%,rgba(113,106,231,1)_100%)]"
                >
                    <span className="relative [font-family:'Poppins',Helvetica] font-semibold text-white text-[13px] text-center tracking-[0] leading-[normal]">
                        Raise a Ticket
                    </span>
                </button>
            </div>

            {/* Tickets List */}
            <main className="flex-1 px-5 pb-2 overflow-y-auto scrollbar-hide">
                {isInitialLoading && <LoadingSkeleton count={3} />}

                <ErrorRetryButton
                    error={error}
                    onRetry={handleRetry}
                    retryCount={retryCount}
                />

                {!isInitialLoading && !error && (
                    <div className="flex flex-col gap-4 transition-all duration-300">
                        {paginatedData.tickets.length > 0 ? (
                            paginatedData.tickets.map((ticket, index) => (
                                <TicketCard
                                    key={`${ticket.id}-${index}`}
                                    ticket={ticket}
                                    onClick={handleTicketClick}
                                />
                            ))
                        ) : (
                            <div className="flex items-center justify-center py-8">
                                <p className="text-gray-400 text-center font-poppins">No tickets found</p>
                            </div>
                        )}

                        {/* Pagination Controls - Client-side pagination */}
                        {paginatedData.totalPages > 1 && (
                            <div className="flex items-center justify-center gap-4 mt-6">
                                <button
                                    onClick={() => handlePageChange(paginatedData.currentPage - 1)}
                                    disabled={paginatedData.currentPage <= 1}
                                    className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                                    style={{
                                        minHeight: '44px', // Touch-friendly for Android
                                        transform: 'translateZ(0)', // Hardware acceleration
                                    }}
                                >
                                    Previous
                                </button>

                                <span className="text-white font-poppins">
                                    Page {paginatedData.currentPage} of {paginatedData.totalPages}
                                </span>

                                <button
                                    onClick={() => handlePageChange(paginatedData.currentPage + 1)}
                                    disabled={paginatedData.currentPage >= paginatedData.totalPages}
                                    className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                                    style={{
                                        minHeight: '44px', // Touch-friendly for Android
                                        transform: 'translateZ(0)', // Hardware acceleration
                                    }}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};
