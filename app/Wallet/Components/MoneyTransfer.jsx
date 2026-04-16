import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from 'react-redux';
import { createTremendousPayout } from '../../../lib/api';
import { fetchWalletTransactions, fetchFullWalletTransactions, fetchWalletScreen } from '../../../lib/redux/slice/walletTransactionsSlice';
import { onCashWithdrawal } from '../../../lib/adjustService';
import { incrementAndGet } from '../../../lib/adjustCounters';

export const MoneyTransfer = ({ isOpen, onClose, methods, fundingSources, token }) => {
    const dispatch = useDispatch();
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
    const [startY, setStartY] = useState(0);
    const [currentY, setCurrentY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [formData, setFormData] = useState({
        amount: '',
        recipientName: '',
        recipientEmail: ''
    });
    const formContainerRef = React.useRef(null);
    const submitButtonRef = React.useRef(null);

    // Function to refetch wallet data after successful payout
    const refetchWalletData = async () => {
        try {

            // Fetch wallet screen data for real-time balance updates
            await dispatch(fetchWalletScreen(token));

            // Fetch both wallet transactions and full wallet transactions with force: true
            // This ensures we get fresh data after withdrawal, bypassing cache
            await dispatch(fetchWalletTransactions({ token, limit: 5, force: true }));
            await dispatch(fetchFullWalletTransactions({ token, page: 1, limit: 20, type: "all", force: true }));

        } catch (error) {
            // Error refetching wallet data
        }
    };

    const profile = useSelector((state) => state?.profile?.profile ?? null);
    const walletScreen = useSelector((state) => state?.walletTransactions?.walletScreen ?? null);

    const coinBalance = walletScreen?.wallet?.balance || 1000; // Set to 1000 coins = $100 USD for testing
    const balanceInUSD = Math.floor(coinBalance / 10);

    useEffect(() => {
        if (!isOpen) {
            // Reset state when modal closes
            setShowPaymentForm(false);
            setSelectedPaymentMethod(null);
            setError(null);
            setSuccess(null);
            setShowSuccessModal(false);
            setFieldErrors({});
            setFormData({ amount: '', recipientName: '', recipientEmail: '' });
        }
    }, [isOpen]);

    const handlePaymentMethodClick = (method) => {
        setSelectedPaymentMethod(method);
        setShowPaymentForm(true);
        setFormData(prev => ({
            ...prev,
            recipientName: profile?.name || '',
            recipientEmail: profile?.email || ''
        }));
    };

    // ✅ FIX: Better keyboard handling - ensure button stays visible with 3x more scroll
    const handleInputFocus = () => {
        // Use multiple timeouts to handle different keyboard animation speeds
        setTimeout(() => {
            if (submitButtonRef.current && formContainerRef.current) {
                // Scroll the button into view with proper padding - 3x more aggressive
                submitButtonRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'end',
                    inline: 'nearest'
                });
                // Also ensure the form container scrolls to show button - 3x more scroll
                if (formContainerRef.current) {
                    const buttonRect = submitButtonRef.current.getBoundingClientRect();
                    const containerRect = formContainerRef.current.getBoundingClientRect();
                    const viewportHeight = window.innerHeight;
                    const keyboardHeight = viewportHeight - containerRect.bottom;

                    // If button is below visible area, scroll container - 3x more scroll
                    const scrollAmount = (buttonRect.bottom - viewportHeight + 150) * 3;
                    if (buttonRect.bottom > viewportHeight - 100) {
                        formContainerRef.current.scrollTop += scrollAmount;
                    }
                }
            }
        }, 100);
        setTimeout(() => {
            if (submitButtonRef.current && formContainerRef.current) {
                // Second scroll attempt - 3x more aggressive
                submitButtonRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'end',
                    inline: 'nearest'
                });
                if (formContainerRef.current) {
                    const buttonRect = submitButtonRef.current.getBoundingClientRect();
                    const viewportHeight = window.innerHeight;
                    if (buttonRect.bottom > viewportHeight - 100) {
                        const scrollAmount = (buttonRect.bottom - viewportHeight + 200) * 3;
                        formContainerRef.current.scrollTop += scrollAmount;
                    }
                }
            }
        }, 500);
    };


    const handleSubmitPayout = async () => {
        // CRITICAL FIX: Prevent double submission
        if (isSubmitting) {
            return;
        }

        // Clear previous errors
        setError(null);
        setFieldErrors({});

        const amount = parseFloat(formData.amount);
        const newFieldErrors = {};

        // Validate required fields
        if (!formData.amount.trim()) {
            newFieldErrors.amount = 'Amount is required';
        } else if (!amount || isNaN(amount)) {
            newFieldErrors.amount = 'Please enter a valid amount';
        } else if (amount < 5) {
            newFieldErrors.amount = 'Minimum withdrawal amount is $5.';
        } else if (amount > coinBalance) {
            newFieldErrors.amount = 'Amount exceeds available balance';
        }

        if (!formData.recipientName.trim()) {
            newFieldErrors.recipientName = 'Recipient name is required';
        } else if (!/^[a-zA-Z\s'-]+$/.test(formData.recipientName.trim())) {
            newFieldErrors.recipientName = 'Recipient name can only contain letters, spaces, hyphens, and apostrophes';
        } else if (formData.recipientName.trim().length < 2) {
            newFieldErrors.recipientName = 'Recipient name must be at least 2 characters long';
        }

        if (!formData.recipientEmail.trim()) {
            newFieldErrors.recipientEmail = 'Recipient email is required';
        } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.recipientEmail.trim())) {
            newFieldErrors.recipientEmail = 'Please enter a valid email address (e.g., user@example.com)';
        }

        // Check for system errors
        if (!selectedPaymentMethod || !fundingSources.length) {
            setError('System error: Funding source not available.');
            return;
        }

        // If there are field errors, show them and stop
        if (Object.keys(newFieldErrors).length > 0) {
            setFieldErrors(newFieldErrors);
            return;
        }

        setIsSubmitting(true);
        setSuccess(null);

        // Format data according to Tremendous API structure
        const payoutData = {
            external_id: `money_transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            payment: {
                funding_source_id: fundingSources[0].id
            },
            reward: {
                value: {
                    denomination: amount,
                    currency_code: 'USD'
                },
                delivery: {
                    method: 'EMAIL'
                },
                recipient: {
                    name: formData.recipientName,
                    email: formData.recipientEmail
                },
                products: [selectedPaymentMethod.id]
            }
        };

        try {
            const result = await createTremendousPayout(payoutData, token);

            if (result.success) {
                setSuccess('Money transfer request submitted successfully!');
                setIsSubmitting(false);
                // Track withdrawal milestone (Adjust) — counter seeded from server at login
                try { onCashWithdrawal(incrementAndGet("withdrawal")); } catch { /* never block withdrawal flow */ }

                // Show success modal
                setShowSuccessModal(true);

                // Close success modal and main modal after 4 seconds
                setTimeout(() => {
                    setShowSuccessModal(false);
                    onClose();
                }, 4000);

                // Refetch wallet data in background (don't await - let it run in parallel)
                refetchWalletData().catch(err => {
                    // Background wallet refetch error
                });
            } else {
                // Handle different types of errors with user-friendly messages
                let errorMessage = 'Failed to process money transfer.';

                if (result.error) {
                    if (result.error.includes('400') || result.error.includes('Bad Request')) {
                        errorMessage = 'Invalid recipient information. Please check the recipient name and email address.';
                    } else if (result.error.includes('401') || result.error.includes('Unauthorized')) {
                        errorMessage = 'Authentication error. Please log in again.';
                    } else if (result.error.includes('403') || result.error.includes('Forbidden')) {
                        errorMessage = 'You do not have permission to perform this action.';
                    } else if (result.error.includes('404') || result.error.includes('Not Found')) {
                        errorMessage = 'Service temporarily unavailable. Please try again later.';
                    } else if (result.error.includes('500') || result.error.includes('Internal Server Error')) {
                        errorMessage = 'Server error. Please try again later.';
                    } else if (result.error.includes('email') || result.error.includes('Email')) {
                        errorMessage = 'Invalid email address. Please enter a valid email.';
                    } else if (result.error.includes('recipient') || result.error.includes('name')) {
                        errorMessage = 'Invalid recipient name. Please use only letters, spaces, hyphens, and apostrophes.';
                    } else {
                        errorMessage = result.error;
                    }
                }

                setError(errorMessage);
            }
        } catch (err) {
            let errorMessage = 'An unexpected error occurred.';

            if (err.message) {
                if (err.message.includes('400')) {
                    errorMessage = 'Invalid recipient information. Please check the recipient name and email address.';
                } else if (err.message.includes('network') || err.message.includes('fetch')) {
                    errorMessage = 'Network error. Please check your internet connection and try again.';
                } else {
                    errorMessage = err.message;
                }
            }

            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddNewClick = () => {
        // TODO: Implement add new payment method functionality
    };

    // Handle swipe-to-close functionality
    const handleTouchStart = (e) => {
        setStartY(e.touches[0].clientY);
        setIsDragging(true);
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;
        setCurrentY(e.touches[0].clientY);
    };

    const handleTouchEnd = () => {
        if (!isDragging) return;

        const deltaY = currentY - startY;
        const threshold = 100;

        if (deltaY > threshold) {
            onClose();
        }

        setIsDragging(false);
        setStartY(0);
        setCurrentY(0);
    };

    // Handle escape key and body scroll lock
    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
            <div
                className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-md transition-all duration-300"
                onClick={onClose}
                style={{ backdropFilter: 'blur(12px)' }}
            />

            <section
                className={`flex flex-col w-full max-h-[90vh] ${showPaymentForm ? 'h-[min(88vh,640px)]' : 'h-[490px]'} items-start gap-2.5 pt-5 pb-8 px-2 relative bg-black border border-[#333] shadow-2xl shadow-purple-500/20 rounded-[20px_20px_0px_0px] overflow-y-auto`}
                role="region"
                aria-label="Money Transfer Options"
                aria-modal="true"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                    paddingBottom: 'env(safe-area-inset-bottom, 1rem)',
                    maxHeight: 'calc(100vh - env(keyboard-height, 0px))'
                }}
            >
                <div className="relative w-full h-[11px] flex justify-center">
                    <div className="relative w-[135px] h-[5px] top-[-11px] bg-[#ffffff80] rounded-[100px]" />
                </div>

                {!showPaymentForm ? (
                    <>
                        <header className="flex items-start justify-between pt-2 pb-5 px-4 relative self-stretch w-full flex-[0_0_auto]">
                            <h1 className="relative w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-semibold text-[#f3fcfc] text-[16px] opacity-[100%] tracking-[0] leading-[normal]">
                                Money Transfer
                            </h1>
                            <button
                                onClick={onClose}
                                className="text-[#A4A4A4] hover:text-[#f3fcfc] transition-colors p-1 -mt-1"
                                aria-label="Close modal"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </header>

                        <nav role="list" className="w-full flex-1 overflow-y-auto">
                            {methods?.length === 0 ? (
                                <div className="flex items-center justify-center w-full h-20 text-[#f4f3fc]">
                                    <p className="text-[#A4A4A4] text-sm">No money transfer options available.</p>
                                </div>
                            ) : (
                                methods?.map((method, index) => (
                                    <button
                                        key={method.id}
                                        className={`items-center flex h-14 pt-3 pb-3 px-4 relative self-stretch w-full cursor-pointer hover:bg-[#1a1a1a] transition-colors ${index < methods.length - 1
                                            ? "border-b [border-bottom-style:solid] border-[#454545] mb-1"
                                            : ""
                                            } ${selectedPaymentMethod?.id === method.id ? "bg-[#1a1a1a]" : ""}`}
                                        onClick={() => handlePaymentMethodClick(method)}
                                        role="listitem"
                                        aria-label={`Select ${method.name} for money transfer`}
                                    >
                                        <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                                            <div className="w-8 h-8 bg-[#8B5CF6] rounded-full flex items-center justify-center">
                                                <span className="text-white text-lg">
                                                    {method.icon || method.name?.charAt(0) || 'P'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex-1 ml-2">
                                            <span className="relative w-fit [font-family:'Poppins',Helvetica] font-semibold text-[#f4f3fc] opacity-[100%] text-[16px] tracking-[0] leading-[normal] block">
                                                {method.name}
                                            </span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[#A4A4A4] text-xs">
                                                    ${method.minAmount || 5} - ${method.maxAmount || 1000}
                                                </span>
                                                <span className="text-[#8B5CF6] text-xs">
                                                    {method.processingTime || '1-24 hours'}
                                                </span>
                                                <span className="text-[#A4A4A4] text-xs">
                                                    Fee: ${method.fees || 0}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </nav>
                    </>
                ) : (
                    <div className="w-full px-4 pb-4">
                        <header className="flex items-center justify-between mb-4">
                            <button
                                onClick={() => setShowPaymentForm(false)}
                                className="text-[#8b92de] hover:opacity-80 transition-opacity"
                            >
                                ← Back
                            </button>
                            <h1 className="[font-family:'Poppins',Helvetica] font-semibold text-[#f3fcfc] text-[16px]">
                                {selectedPaymentMethod?.name} Transfer
                            </h1>
                            <button
                                onClick={onClose}
                                className="text-[#A4A4A4] hover:text-[#f3fcfc] transition-colors p-1"
                                aria-label="Close modal"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </header>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}


                        <div className="space-y-4" ref={formContainerRef}>
                            <div>
                                <label className="block text-[#f4f3fc] text-sm font-medium mb-2">
                                    Transfer Amount (USD)
                                </label>
                                <input
                                    type="number"
                                    placeholder="Enter a Amount"
                                    min={selectedPaymentMethod?.minAmount || 5}
                                    max={selectedPaymentMethod?.maxAmount || 1000}
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={(e) => {
                                        setFormData(prev => ({ ...prev, amount: e.target.value }));
                                        // Clear field error when user starts typing
                                        if (fieldErrors.amount) {
                                            setFieldErrors(prev => ({ ...prev, amount: null }));
                                        }
                                    }}
                                    onFocus={handleInputFocus}
                                    className={`w-full px-3 py-2 bg-[#2A2A2A] border rounded-lg text-[#f4f3fc] placeholder-[#A4A4A4] focus:outline-none ${fieldErrors.amount
                                        ? 'border-red-500 focus:border-red-500'
                                        : 'border-[#3C3C3C] focus:border-[#8b92de]'
                                        }`}
                                />
                                {fieldErrors.amount ? (
                                    <p className="text-red-400 text-xs mt-1">{fieldErrors.amount}</p>
                                ) : (
                                    <p className="text-[#A4A4A4] text-xs mt-1">Minimum: ${selectedPaymentMethod?.minAmount || 5}.00</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-[#f4f3fc] text-sm font-medium mb-2">
                                    Recipient Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter recipient name (letters only)"
                                    value={formData.recipientName}
                                    onChange={(e) => {
                                        setFormData(prev => ({ ...prev, recipientName: e.target.value }));
                                        // Clear field error when user starts typing
                                        if (fieldErrors.recipientName) {
                                            setFieldErrors(prev => ({ ...prev, recipientName: null }));
                                        }
                                    }}
                                    onFocus={handleInputFocus}
                                    className={`w-full px-3 py-2 bg-[#2A2A2A] border rounded-lg text-[#f4f3fc] placeholder-[#A4A4A4] focus:outline-none ${fieldErrors.recipientName
                                        ? 'border-red-500 focus:border-red-500'
                                        : 'border-[#3C3C3C] focus:border-[#8b92de]'
                                        }`}
                                />
                                {fieldErrors.recipientName ? (
                                    <p className="text-red-400 text-xs mt-1">{fieldErrors.recipientName}</p>
                                ) : (
                                    <p className="text-[#A4A4A4] text-xs mt-1">Use only letters, spaces, hyphens, and apostrophes</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-[#f4f3fc] text-sm font-medium mb-2">
                                    Recipient Email
                                </label>
                                <input
                                    type="email"
                                    placeholder="recipient@example.com"
                                    value={formData.recipientEmail}
                                    onChange={(e) => {
                                        setFormData(prev => ({ ...prev, recipientEmail: e.target.value }));
                                        // Clear field error when user starts typing
                                        if (fieldErrors.recipientEmail) {
                                            setFieldErrors(prev => ({ ...prev, recipientEmail: null }));
                                        }
                                    }}
                                    onFocus={handleInputFocus}
                                    className={`w-full px-3 py-2 bg-[#2A2A2A] border rounded-lg text-[#f4f3fc] placeholder-[#A4A4A4] focus:outline-none ${fieldErrors.recipientEmail
                                        ? 'border-red-500 focus:border-red-500'
                                        : 'border-[#3C3C3C] focus:border-[#8b92de]'
                                        }`}
                                />
                                {fieldErrors.recipientEmail && (
                                    <p className="text-red-400 text-xs mt-1">{fieldErrors.recipientEmail}</p>
                                )}
                            </div>

                            <div ref={submitButtonRef} className="pb-6 pt-2">
                                <button
                                    onClick={handleSubmitPayout}
                                    disabled={isSubmitting || !!success}
                                    className="w-full bg-[#8B5CF6] text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                                >
                                    {isSubmitting ? (
                                        success ? (
                                            'Transfer Now'
                                        ) : (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Processing...
                                            </span>
                                        )
                                    ) : 'Transfer Now'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* Success Modal */}
            {showSuccessModal && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-md transition-all duration-300"
                    style={{ backdropFilter: 'blur(12px)' }}
                >
                    <div className="bg-black border border-[#4A4A4A] rounded-[16px] p-6 mx-4 max-w-sm w-full shadow-2xl shadow-purple-500/20 transition-all duration-300 relative">
                        <div className="flex flex-col items-center ">
                            {/* Success Icon */}
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-10 w-10 text-green-500"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-[#f4f3fc] text-lg font-semibold mb-2 text-center">
                                Success!
                            </p>
                            <p className="text-[#A4A4A4] text-sm mb-2 text-center">
                                {success}
                            </p>
                            <p className="text-[#8B92DF] text-xs text-center">
                                Your payout request will reflect within a few seconds in transaction log
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
