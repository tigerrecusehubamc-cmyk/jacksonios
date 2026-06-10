import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import ServiceCard from './ServiceCard';
import { MoneyTransfer } from './MoneyTransfer';
import { Charity } from './Charity';
import { DebitTransfer } from './DebitTransfer';
import { Card } from './Card';
import { getTremendousMethods, getTremendousFundingSources, getConversionSettings } from '../../../lib/api';

const SCALE_CONFIG = [
    { minWidth: 0, scaleClass: "scale-90" },
    { minWidth: 320, scaleClass: "scale-90" },
    { minWidth: 375, scaleClass: "scale-100" },
    { minWidth: 480, scaleClass: "scale-125" },
    { minWidth: 640, scaleClass: "scale-120" },
    { minWidth: 768, scaleClass: "scale-150" },
    { minWidth: 1024, scaleClass: "scale-175" },
    { minWidth: 1280, scaleClass: "scale-200" },
    { minWidth: 1536, scaleClass: "scale-225" },
];

const SERVICE_CARDS = [
    {
        id: 1,
        innerBgColor: "bg-[#B9780E4D]",
        image: "/moeny1.png",
        title: "Money Transfer",
        description: null,
        hasDescription: true,
    },
    {
        id: 3,
        innerBgColor: "bg-gradient-to-br from-[#34a8533d] to-[#34a85324]",
        image: "/moeny2.png",
        title: "Donation and Charity",
        description: null,
        hasDescription: false,
    },
    {
        id: 4,
        innerBgColor: "bg-gradient-to-br from-[#1b47f73d] to-[#1b4ef724]",
        image: "/Money4.png",
        title: "Virtual\nDebit Card",
        description: null,
        hasDescription: false,
    },
    {
        id: 5,
        innerBgColor: "bg-gradient-to-br from-[#2666a796] to-[#581fd424]",
        image: "/moeny5.png",
        title: "Gift Card",
        description: null,
        hasDescription: false,
    },
];

export const WithdrawalOption = () => {
    // Modal state
    const [currentScaleClass, setCurrentScaleClass] = useState("scale-100");
    const [isMoneyTransferModalOpen, setIsMoneyTransferModalOpen] = useState(false);
    const [isCharityModalOpen, setIsCharityModalOpen] = useState(false);
    const [isDebitTransferModalOpen, setIsDebitTransferModalOpen] = useState(false);
    const [isCardModalOpen, setIsCardModalOpen] = useState(false);
    const [isInsufficientBalanceModalOpen, setIsInsufficientBalanceModalOpen] = useState(false);

    const [allPayoutMethods, setAllPayoutMethods] = useState([]);
    const [allFundingSources, setAllFundingSources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [token, setToken] = useState(null);
    const [minRedemption, setMinRedemption] = useState(20);

    // Scroll container ref
    const scrollContainerRef = useRef(null);

    // JS direction-lock touch handler refs (same pattern as MostPlayedGames)
    const touchStartRef = useRef({ x: 0, y: 0, scrollLeft: 0 });
    const directionRef = useRef(null);

    // Redux state
    const walletScreen = useSelector((state) => state?.walletTransactions?.walletScreen || {});

    const coinBalance = walletScreen?.wallet?.balance || 0;

    const getScaleClass = useCallback((width) => {
        for (let i = SCALE_CONFIG.length - 1; i >= 0; i--) {
            if (width >= SCALE_CONFIG[i].minWidth) {
                return SCALE_CONFIG[i].scaleClass;
            }
        }
        return "scale-100";
    }, []);

    useEffect(() => {
        const updateScale = () => {
            setCurrentScaleClass(getScaleClass(window.innerWidth));
        };
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, [getScaleClass]);

    // JS direction-lock touch handler for Android WebView
    // SERVICE_CARDS is a constant so the container is always in the DOM — [] dep is safe
    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const onTouchStart = (e) => {
            const t = e.touches[0];
            touchStartRef.current = { x: t.clientX, y: t.clientY, scrollLeft: el.scrollLeft };
            directionRef.current = null;
        };
        const onTouchMove = (e) => {
            const t = e.touches[0];
            const dx = t.clientX - touchStartRef.current.x;
            const dy = t.clientY - touchStartRef.current.y;
            if (!directionRef.current) {
                if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5) directionRef.current = 'h';
                else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 5) directionRef.current = 'v';
                else return;
            }
            if (directionRef.current === 'h') {
                e.preventDefault();
                el.scrollLeft = touchStartRef.current.scrollLeft - dx;
            }
            // 'v': do nothing — browser handles native page scroll via touch-action: pan-y
        };
        const onTouchEnd = () => { directionRef.current = null; };
        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchmove', onTouchMove, { passive: false });
        el.addEventListener('touchend', onTouchEnd, { passive: true });
        return () => {
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', onTouchEnd);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Load authentication token
    useEffect(() => {
        const authToken = localStorage.getItem('authToken');
        const fallbackToken = localStorage.getItem('token');
        const validToken = authToken || fallbackToken;

        if (validToken && validToken.length > 10) {
            setToken(validToken);
        } else {
            setError("Invalid authentication token. Please log in again.");
            setLoading(false);
        }
    }, []);

    // Load min redemption from backend
    useEffect(() => {
        const loadMinRedemption = async () => {
            try {
                const settings = await getConversionSettings();
                if (settings?.data?.defaultRule?.minRedemption) {
                    setMinRedemption(settings.data.defaultRule.minRedemption);
                }
            } catch {
                setMinRedemption(20);
            }
        };

        if (token) {
            loadMinRedemption();
        }
    }, [token]);

    // Load payout methods and funding sources with instant UI
    useEffect(() => {
        const loadPayoutData = async () => {
            if (!token) {
                setLoading(false);
                setError("Authentication required. Please log in.");
                return;
            }

            setLoading(false);
            setError(null);

            try {
                const [methodsResult, fundingResult] = await Promise.all([
                    getTremendousMethods(token),
                    getTremendousFundingSources(token)
                ]);

                if (methodsResult.success && methodsResult.data?.methods) {
                    setAllPayoutMethods(methodsResult.data.methods);
                }

                if (fundingResult.success && fundingResult.data?.funding_sources) {
                    setAllFundingSources(fundingResult.data.funding_sources);
                }

            } catch (err) {
                // Don't show error to user - let them try withdrawal options
            }
        };

        loadPayoutData();
    }, [token]);

    const handleWithdrawOption = (option) => {
        if (coinBalance < minRedemption) {
            setIsInsufficientBalanceModalOpen(true);
            return;
        }

        switch (option.id) {
            case 1:
                setIsMoneyTransferModalOpen(true);
                break;
            case 3:
                setIsCharityModalOpen(true);
                break;
            case 4:
                setIsDebitTransferModalOpen(true);
                break;
            case 5:
                setIsCardModalOpen(true);
                break;
            default:
                break;
        }
    };

    const handleCloseMoneyTransferModal = () => setIsMoneyTransferModalOpen(false);
    const handleCloseCharityModal = () => setIsCharityModalOpen(false);
    const handleCloseDebitTransferModal = () => setIsDebitTransferModalOpen(false);
    const handleCloseCardModal = () => setIsCardModalOpen(false);
    const handlePlayToEarnMore = () => setIsInsufficientBalanceModalOpen(false);
    const handleCloseInsufficientBalanceModal = () => setIsInsufficientBalanceModalOpen(false);

    const getMethodsForCategory = (category) => {
        if (!allPayoutMethods.length) return [];

        return allPayoutMethods.filter(method => {
            const isUSMethod = method.currency === 'USD' &&
                (method.countries?.includes('US') ||
                    method.countries?.includes('USA') ||
                    method.country === 'US' ||
                    method.country === 'USA' ||
                    !method.countries);

            if (!isUSMethod) return false;

            switch (category) {
                case 'cash':
                    return ['paypal', 'ach', 'venmo', 'cash_app'].includes(method.category);
                case 'charity':
                    return method.category === 'charity';
                case 'prepaid_cards':
                    return method.category === 'visa_card';
                case 'gift_cards':
                    return method.category === 'merchant_card';
                default:
                    return false;
            }
        });
    };

    return (
        <div className="flex w-full justify-center items-center ">
            <div className="w-full p-4 ">
                <div className="flex flex-col items-start justify-start w-full">
                    <h3 className="font-semibold text-[#f4f3fc] text-[16px] mb-2 w-full max-w-[335px] text-left">Withdrawal Options</h3>
                    <div className="w-full max-w-[335px] h-[53px] mb-4">
                        <div
                            className="relative w-full h-[53px] rounded-[8px] p-[1px]"
                        >
                            <div className="relative w-full h-full rounded-[8px] opacity-[100%] bg-[#1F1F1F] border border-[#3C3C3C] flex items-center px-4">
                                <div className="flex items-center gap-1 flex-1">
                                    <span className="[font-family:'Poppins',Helvetica] font-normal text-[#A4A4A4] text-[13px] tracking-[0] leading-[normal]">
                                        Withdrawal can be done {minRedemption}
                                    </span>
                                    <img
                                        className="w-[23px] h-6 aspect-[0.97]"
                                        alt="Dollar icon"
                                        src="/dollor.png"
                                        loading="eager"
                                        decoding="async"
                                        width={23}
                                        height={24}
                                    />
                                    <span className="[font-family:'Poppins',Helvetica] font-normal text-neutral-400 text-[13px] tracking-[0] leading-[normal]">
                                        above only
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Scoped styles: touch-action pan-y on container only — same as MostPlayedGames */}
                    <style dangerouslySetInnerHTML={{
                        __html: `
                            .withdrawal-options-scroll {
                                touch-action: pan-y;
                                min-width: 0;
                                -webkit-overflow-scrolling: touch;
                                overflow-x: scroll;
                                overflow-y: hidden;
                                scroll-behavior: auto;
                                overscroll-behavior-x: contain;
                                will-change: scroll-position;
                            }
                        `
                    }} />
                    {error ? (
                        <div className="flex flex-col items-center justify-center w-full h-20 text-red-400 text-sm px-4">
                            <p className="text-center">{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    ) : (
                        <div
                            ref={scrollContainerRef}
                            className={`withdrawal-options-scroll flex min-h-[120px] min-w-0 w-full max-w-[335px] items-stretch gap-3 pb-2 justify-start ${currentScaleClass}`}
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {SERVICE_CARDS.map((card) => (
                                <div
                                    key={card.id}
                                    onClick={() => handleWithdrawOption(card)}
                                    className="flex-shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:ring-opacity-50 rounded-lg"
                                    style={{ minWidth: '90px', maxWidth: '90px' }}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Select ${card.title} withdrawal option`}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleWithdrawOption(card);
                                        }
                                    }}
                                >
                                    <ServiceCard card={card} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Money Transfer Modal */}
                {token && (
                    <MoneyTransfer
                        isOpen={isMoneyTransferModalOpen}
                        onClose={handleCloseMoneyTransferModal}
                        methods={getMethodsForCategory('cash')}
                        fundingSources={allFundingSources}
                        token={token}
                    />
                )}

                {/* Charity Modal */}
                {token && (
                    <Charity
                        isOpen={isCharityModalOpen}
                        onClose={handleCloseCharityModal}
                        methods={getMethodsForCategory('charity')}
                        fundingSources={allFundingSources}
                        token={token}
                    />
                )}

                {/* Debit Transfer Modal */}
                {token && (
                    <DebitTransfer
                        isOpen={isDebitTransferModalOpen}
                        onClose={handleCloseDebitTransferModal}
                        methods={getMethodsForCategory('prepaid_cards')}
                        fundingSources={allFundingSources}
                        token={token}
                    />
                )}

                {/* Card Modal */}
                {token && (
                    <Card
                        isOpen={isCardModalOpen}
                        onClose={handleCloseCardModal}
                        methods={getMethodsForCategory('gift_cards')}
                        fundingSources={allFundingSources}
                        token={token}
                    />
                )}

                {isInsufficientBalanceModalOpen && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-md transition-all duration-300"
                        style={{ backdropFilter: 'blur(12px)' }}
                    >
                        <div className="bg-black border border-[#4A4A4A] rounded-[16px] p-6 mx-4 max-w-sm w-full shadow-2xl shadow-purple-500/20 transition-all duration-300 relative">
                            <button
                                onClick={handleCloseInsufficientBalanceModal}
                                className="absolute top-4 right-4 text-[#A4A4A4] hover:text-[#f3fcfc] transition-colors p-1"
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
                            <div className="flex flex-col items-center ">
                                <img
                                    src="/bodtdollor.png"
                                    alt=""
                                    width={240}
                                    height={240}
                                    className="mx-auto"
                                    style={{ objectFit: "contain", width: "240px", height: "200px" }}
                                    loading="eager"
                                    decoding="async"
                                />
                                <p className="text-[#A4A4A4] text-sm mt-0 mb-4 text-center">
                                    Withdrawal can be done {minRedemption} coins above only
                                </p>
                                <div className="flex w-full">
                                    <button
                                        onClick={handlePlayToEarnMore}
                                        className="w-full px-4 py-2 bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-lg hover:shadow-xl hover:shadow-purple-500/30"
                                    >
                                        Okay Got it
                                    </button>
                                </div>

                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
