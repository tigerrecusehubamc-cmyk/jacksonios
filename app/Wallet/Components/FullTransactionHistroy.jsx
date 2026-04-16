"use client";
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { fetchFullWalletTransactions } from '@/lib/redux/slice/walletTransactionsSlice';
import { useAuth } from '@/contexts/AuthContext';
import { HighestTransctionCard } from './HighestTransctionCard';

const ITEMS_PER_PAGE = 10;

const FullTransactionHistroy = () => {
    const dispatch = useDispatch();
    const router = useRouter();
    const { token } = useAuth();
    const [currentPage, setCurrentPage] = useState(1);

    // Get full transactions from Redux store
    const { fullTransactions, fullTransactionsStatus, pagination } = useSelector((state) => state.walletTransactions);

    // Fetch full transactions on mount and when page changes
    useEffect(() => {
        if (!token) return;

        // Only fetch if status is idle (not already loading/fetched)
        // The stale-while-revalidate pattern in the slice will handle cache checking
        if (fullTransactionsStatus === 'idle') {
            dispatch(fetchFullWalletTransactions({
                token,
                page: currentPage,
                limit: ITEMS_PER_PAGE,
                type: "all"
            }));
        } else if (fullTransactionsStatus === 'succeeded' && fullTransactions.length > 0) {
            // If we have cached data, trigger background refresh to get latest
            setTimeout(() => {
                dispatch(fetchFullWalletTransactions({
                    token,
                    page: currentPage,
                    limit: ITEMS_PER_PAGE,
                    type: "all",
                    background: true
                }));
            }, 100);
        }
    }, [token, fullTransactionsStatus, dispatch, currentPage]);

    // Auto-refresh transactions when app comes to foreground (in background, non-blocking)
    useEffect(() => {
        if (!token) return;

        const handleFocus = () => {
            // Refresh in background when user returns to app
            dispatch(fetchFullWalletTransactions({
                token,
                page: currentPage,
                limit: ITEMS_PER_PAGE,
                type: "all",
                background: true
            }));
        };

        window.addEventListener("focus", handleFocus);

        return () => {
            window.removeEventListener("focus", handleFocus);
        };
    }, [token, dispatch, currentPage]);

    const handleBack = () => {
        router.back();
    };

    // Calculate total pages from pagination data
    const totalPages = pagination?.totalPages || Math.ceil((pagination?.total || 0) / ITEMS_PER_PAGE) || 1;

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
            // Scroll to top when page changes
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
            // Scroll to top when page changes
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handlePageClick = (page) => {
        setCurrentPage(page);
        // Scroll to top when page changes
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Generate page numbers to display (show 5 pages max, centered around current page)
    const getPageNumbers = () => {
        const pages = [];
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);

        // Adjust startPage if we're near the end
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    };

    return (
        <div className="min-h-screen bg-black flex flex-col">
            <section className="flex flex-col items-center p-3 w-full max-w-[335px] mx-auto">
                {/* App Version */}
                <div className="w-full max-w-[335px] mx-auto px-2   mb-1    flex flex-col">
                    <span className="[font-family:'Poppins',Helvetica] font-normal text-[#A4A4A4] text-[10px] tracking-[0] leading-3 whitespace-nowrap">
                        App Version: {process.env.NEXT_PUBLIC_APP_VERSION || "V0.1.1"}
                    </span>
                </div>
                <div className="flex flex-col gap-2 items-center w-full">
                    <header className="flex flex-col w-full items-start gap-2 px-0 py-3 mb-4 mt-4">
                        <div className="flex items-center justify-between gap-4 w-full">
                            <div className="flex items-center gap-4">
                                <button
                                    className="flex items-center justify-center w-6 h-6 flex-shrink-0"
                                    aria-label="Go back"
                                    onClick={handleBack}
                                >
                                    <svg
                                        className="w-6 h-6 text-white cursor-pointer transition-transform duration-150 active:scale-95"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <path
                                            d="M15 18L9 12L15 6"
                                            stroke="currentColor"
                                            strokeWidth={2}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </button>

                                <h1 className="font-semibold text-white text-xl leading-5">
                                    Full Transaction History
                                </h1>
                            </div>
                        </div>
                    </header>
                    <div className="w-full flex flex-col items-center gap-4">
                        {fullTransactions.length > 0 ? (
                            <>
                                {fullTransactions.map((data) => (
                                    <HighestTransctionCard
                                        key={data.id}
                                        {...data}
                                    />
                                ))}
                            </>
                        ) : (
                            <div className="text-center text-gray-400 mt-8">
                                <p>No transactions found</p>
                            </div>
                        )}
                    </div>

                    {/* Pagination Controls */}
                    {fullTransactions.length > 0 && totalPages > 1 && (
                        <div className="w-full flex flex-col items-center gap-4 mt-8 py-6 border-t border-[#333333]">
                            {/* Page Info */}
                            <div className="text-center text-[#A4A4A4] text-sm">
                                Page {currentPage} of {totalPages}
                            </div>

                            {/* Page Number Buttons */}
                            <div className="flex items-center justify-center gap-2">
                                {/* Previous Button */}
                                <button
                                    onClick={handlePrevPage}
                                    disabled={currentPage === 1}
                                    className={`px-3 py-2 rounded-[8px] text-sm font-medium transition-all duration-200 ${currentPage === 1
                                            ? 'bg-[#1E1E1E] text-[#666666] cursor-not-allowed'
                                            : 'bg-[#7046D7] text-white hover:bg-[#6035c0] active:scale-95'
                                        }`}
                                    aria-label="Previous page"
                                >
                                    ← Prev
                                </button>

                                {/* Page Numbers */}
                                <div className="flex gap-1">
                                    {getPageNumbers().map((page) => (
                                        <button
                                            key={page}
                                            onClick={() => handlePageClick(page)}
                                            className={`w-9 h-9 rounded-[8px] text-sm font-medium transition-all duration-200 ${page === currentPage
                                                    ? 'bg-[#7046D7] text-white'
                                                    : 'bg-[#1E1E1E] text-[#A4A4A4] hover:bg-[#2E2E2E] active:scale-95'
                                                }`}
                                            aria-label={`Go to page ${page}`}
                                            aria-current={page === currentPage ? 'page' : undefined}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>

                                {/* Next Button */}
                                <button
                                    onClick={handleNextPage}
                                    disabled={currentPage === totalPages}
                                    className={`px-3 py-2 rounded-[8px] text-sm font-medium transition-all duration-200 ${currentPage === totalPages
                                            ? 'bg-[#1E1E1E] text-[#666666] cursor-not-allowed'
                                            : 'bg-[#7046D7] text-white hover:bg-[#6035c0] active:scale-95'
                                        }`}
                                    aria-label="Next page"
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default FullTransactionHistroy
