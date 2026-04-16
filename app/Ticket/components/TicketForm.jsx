"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { createTicket, fetchUserGames, clearErrors, clearSuccessStates, fetchUserTickets, fetchTicketStats } from "@/lib/redux/slice/ticketSlice";
import { fetchUserData } from "@/lib/redux/slice/gameSlice";
import { useAuth } from "@/contexts/AuthContext";
import { getUserId } from "@/lib/gameDownloadUtils";

// ============================================================================
// CONSTANTS
// ============================================================================
const CATEGORY_OPTIONS = [
    { value: "bug", label: "Bug Report" },
    { value: "payment", label: "Payment Issue" },
    { value: "task_not_credited", label: "Task Not Credited" },
    { value: "game_issue", label: "Game Issue" },
    { value: "account", label: "Account Issue" },
    { value: "other", label: "Other" },
];

const FILE_VALIDATION = {
    MAX_SIZE: 2 * 1024 * 1024, // 2MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png'],
    MAX_FILES: 3
};

const FORM_VALIDATION = {
    MAX_WORDS: 200
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const RaiseATicket = () => {
    // ============================================================================
    // STATE MANAGEMENT
    // ============================================================================
    const [selectedGame, setSelectedGame] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("");
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [gameOptions, setGameOptions] = useState([]);
    const [loadingGames, setLoadingGames] = useState(true);

    // ============================================================================
    // KEYBOARD HANDLING
    // ============================================================================

    // ============================================================================
    // REFS & ROUTER
    // ============================================================================
    const dropdownRef = useRef(null);
    const router = useRouter();
    const dispatch = useDispatch();
    const { token } = useAuth();

    // ============================================================================
    // REDUX STATE ACCESS
    // ============================================================================
    const { inProgressGames, userDataStatus, available, completed } = useSelector((state) => state.games);
    const { userGames, loading, errors: ticketErrors } = useSelector((state) => state.tickets);
    const profile = useSelector((state) => state.profile.details);

    // ============================================================================
    // EFFECTS
    // ============================================================================
    useEffect(() => {
        // Load user data if not already loaded
        if (userDataStatus === "idle") {
            const userId = getUserId();
            if (userId) {
                dispatch(fetchUserData({ userId, token }));
            }
        }
    }, [dispatch, userDataStatus]);

    // Load user games from Redux - use the same data source as main app
    useEffect(() => {
        if (token && userDataStatus === 'idle') {
            // Use the main game data instead of separate ticket games API
            const userId = getUserId();
            if (userId) {
                dispatch(fetchUserData({ userId, token }));
            }
        }
    }, [dispatch, token, userDataStatus]);

    // Transform games into dropdown options - use all user games (available, in-progress, completed)
    useEffect(() => {
        // Combine all user games from different categories
        const allUserGames = [
            ...(available || []),
            ...(inProgressGames || []),
            ...(completed || [])
        ];

        if (allUserGames.length > 0) {
            const transformedGames = allUserGames.map((game) => ({
                id: game.id || game._id,
                name: game.title || game.name || game.game_title,
            }));
            setGameOptions(transformedGames);
            setLoadingGames(false);
        } else if (userDataStatus === 'fulfilled' && allUserGames.length === 0) {
            setGameOptions([]);
            setLoadingGames(false);
        }
    }, [available, inProgressGames, completed, userDataStatus]);

    // Clear errors on component mount
    useEffect(() => {
        dispatch(clearErrors());
        return () => {
            dispatch(clearSuccessStates());
        };
    }, [dispatch]);

    // Prefetch tickets on component mount to avoid loading when user clicks "View All"
    useEffect(() => {
        if (token) {
            // Fetch tickets in background so they're ready when user navigates to ticket list
            dispatch(fetchUserTickets({ filters: { page: 1, limit: 100 }, token }));
            dispatch(fetchTicketStats({ token }));
        }
    }, [dispatch, token]);

    // ============================================================================
    // API FUNCTIONS - COMMENTED OUT TO USE REDUX STORE INSTEAD
    // ============================================================================
    // const loadUserGames = async () => {
    //     try {
    //         setLoadingGames(true);
    //         const token = localStorage.getItem('authToken');
    //         if (!token) {
    //             setErrors({ auth: "Please log in to raise a ticket" });
    //             return;
    //         }

    //         const response = await getUserGamesList(token);
    //         if (response && response.games) {
    //             setGameOptions(response.games);
    //         }
    //     } catch (error) {
    //         console.error("Failed to load games:", error);
    //         setErrors({ games: "Failed to load games. Please try again." });
    //     } finally {
    //         setLoadingGames(false);
    //     }
    // };

    // ============================================================================
    // NAVIGATION HANDLERS
    // ============================================================================
    const handleGoBack = () => {
        router.back();
    };

    // Validation functions
    const validateForm = () => {
        const newErrors = {};

        if (!description.trim()) {
            newErrors.description = "Please describe the issue";
        } else if (getWordCount() > 200) {
            newErrors.description = "Description must be 200 words or less";
        }

        // Validate uploaded files
        uploadedFiles.forEach((file, index) => {
            if (file.size > 2 * 1024 * 1024) { // 2MB
                newErrors[`file_${index}`] = "File size must be less than 2MB";
            }
            if (!['image/jpeg', 'image/png'].includes(file.type)) {
                newErrors[`file_${index}`] = "Only JPG and PNG files are allowed";
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateFile = (file) => {
        const maxSize = 2 * 1024 * 1024; // 2MB
        const allowedTypes = ['image/jpeg', 'image/png'];

        if (file.size > maxSize) {
            return "File size must be less than 2MB";
        }

        if (!allowedTypes.includes(file.type)) {
            return "Only JPG and PNG files are allowed";
        }

        return null;
    };

    const handleGameSelect = (gameValue) => {
        setSelectedGame(gameValue);
        setIsDropdownOpen(false);
    };

    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen]);

    const handleFileUpload = (event) => {
        const files = Array.from(event.target.files);
        const newErrors = { ...errors };
        const validFiles = [];

        files.forEach((file, index) => {
            const error = validateFile(file);
            if (error) {
                newErrors[`file_${uploadedFiles.length + index}`] = error;
            } else {
                validFiles.push(file);
            }
        });

        if (uploadedFiles.length + validFiles.length > 3) {
            newErrors.fileLimit = "Maximum 3 files allowed";
        } else {
            setUploadedFiles([...uploadedFiles, ...validFiles]);
        }

        setErrors(newErrors);
    };

    const removeFile = (index) => {
        const newFiles = uploadedFiles.filter((_, i) => i !== index);
        setUploadedFiles(newFiles);

        // Clear related errors
        const newErrors = { ...errors };
        delete newErrors[`file_${index}`];
        setErrors(newErrors);
    };

    const handleDescriptionChange = (event) => {
        const text = event.target.value;
        const wordCount = text
            .trim()
            .split(/\s+/)
            .filter((word) => word.length > 0).length;
        if (wordCount <= 200) {
            setDescription(text);
        }
    };

    const getWordCount = useCallback(() => {
        if (!description.trim()) return 0;
        return description
            .trim()
            .split(/\s+/)
            .filter((word) => word.length > 0).length;
    }, [description]);

    const handleSubmit = useCallback(async () => {
        if (!validateForm() || isSubmitting) return;

        setIsSubmitting(true);
        setErrors({});

        try {
            if (!token) {
                setErrors({ auth: "Please log in to raise a ticket" });
                return;
            }

            // Optimized ticket data preparation
            const ticketData = {
                gameId: selectedGame,
                description: description.trim(),
                category: category || 'other',
                images: uploadedFiles,
                deviceInfo: {
                    platform: navigator.platform || 'unknown',
                    userAgent: navigator.userAgent,
                    appVersion: '1.0.0'
                }
            };

            const resultAction = await dispatch(createTicket({ ticketData, token, profile }));

            if (createTicket.fulfilled.match(resultAction)) {
                // Refetch tickets to show the newly created ticket in the list
                dispatch(fetchUserTickets({ filters: { page: 1, limit: 100 }, token }));
                dispatch(fetchTicketStats({ token }));

                // Fast redirect on success
                router.push(`/Ticket/success?ticketId=${resultAction.payload.ticketId}`);
            } else {
                throw new Error(resultAction.payload || "Failed to create ticket");
            }

        } catch (error) {
            setErrors({ submit: error.message || "Failed to submit ticket. Please try again." });
        } finally {
            setIsSubmitting(false);
        }
    }, [validateForm, isSubmitting, selectedGame, description, category, uploadedFiles, router, dispatch, token]);

    const isFormValid = useMemo(() => {
        return description.trim().length > 0 && getWordCount() <= 200;
    }, [description, getWordCount]);

    return (
        <div className="flex flex-col w-full h-screen bg-black">

            {/* App Version */}
            <div className="px-5 ml-1   [font-family:'Poppins',Helvetica] font-normal text-[#A4A4A4] text-[10px] mt-[8px] tracking-[0] leading-3">
                App Version: V0.0.1
            </div>

            {/* Header */}
            <header className="flex flex-col w-full items-start gap-2 px-5 pb-6 mt-[28px]">
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

                    <h1 className="relative flex-1 [font-family:'Poppins',Helvetica] font-semibold text-white text-xl tracking-[0] leading-5 ">
                        Raise a ticket
                    </h1>

                    <button
                        type="button"
                        onClick={() => router.push("/Ticket/list")}
                        className="relative px-3 py-1 rounded-lg bg-[#2a2a2a] border border-[#4d4d4d] cursor-pointer hover:bg-[#3a3a3a] transition-colors"
                        aria-label="View all tickets"
                    >
                        <span className="[font-family:'Poppins',Helvetica] font-medium text-white text-sm tracking-[0] leading-[normal]">
                            View All
                        </span>
                    </button>
                </div>
            </header>



            {/* Main Form */}
            <form className="flex flex-col w-full items-start gap-3 px-5 flex-1">
                {/* Game Selection */}
                <div className="flex flex-col items-start gap-1 w-full">
                    <label className="[font-family:'Poppins',Helvetica] font-medium text-neutral-400 text-sm tracking-[0] leading-[normal]">
                        Game
                    </label>

                    <div className="relative w-full" ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={toggleDropdown}
                            className="w-full h-[54px] px-4 pr-4 [font-family:'Poppins',Helvetica] font-normal text-neutral-400 text-[13px] tracking-[0] leading-[normal] bg-[#1a1a1a] border border-[#4d4d4d] rounded-lg cursor-pointer flex items-center justify-between hover:border-[#716ae7] transition-colors"
                            aria-label="Select Game"
                        >
                            <span className={selectedGame ? "text-white" : "text-neutral-400"}>
                                {selectedGame
                                    ? gameOptions.find(option => option.id === selectedGame)?.name
                                        ?.replace(/\s*Android\s*/gi, '') // Removes "Android"
                                        .replace(/-/g, ' ')             // Replaces all hyphens with a space
                                        .trim()
                                    : "Select Game"}
                            </span>
                            <svg
                                className={`w-4 h-4 text-neutral-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#4d4d4d] rounded-lg shadow-lg z-50">
                                {loadingGames ? (
                                    <div className="w-full px-4 py-3 text-center text-neutral-400 text-sm">
                                        Loading games...
                                    </div>
                                ) : gameOptions.length > 0 ? (
                                    gameOptions.map((option) => (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => handleGameSelect(option.id)}
                                            className={`w-full px-4 py-3 text-left [font-family:'Poppins',Helvetica] text-sm hover:bg-[#2a2a2a] transition-colors first:rounded-t-lg last:rounded-b-lg ${selectedGame === option.id ? 'text-[#716ae7] bg-[#2a2a2a]' : 'text-neutral-400'
                                                }`}
                                        >
                                            {option.name
                                                .replace(/\s*Android\s*/gi, '') // Removes "Android"
                                                .replace(/-/g, ' ')             // Replaces all hyphens with a space
                                                .trim()
                                            }
                                        </button>
                                    ))
                                ) : (
                                    <div className="w-full px-4 py-3 text-center text-neutral-400 text-sm">
                                        No games available
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    {errors.game && (
                        <p className="text-red-400 text-xs mt-1 [font-family:'Poppins',Helvetica]">
                            {errors.game}
                        </p>
                    )}
                    {ticketErrors.games && (
                        <p className="text-red-400 text-xs mt-1 [font-family:'Poppins',Helvetica]">
                            {ticketErrors.games}
                        </p>
                    )}
                    {errors.auth && (
                        <p className="text-red-400 text-xs mt-1 [font-family:'Poppins',Helvetica]">
                            {errors.auth}
                        </p>
                    )}
                </div>

                {/* Photo Upload */}
                <div className="flex flex-col items-start gap-1.5 w-full">
                    <label
                        htmlFor="photo-upload"
                        className="font-medium text-neutral-400 text-sm [font-family:'Poppins',Helvetica] tracking-[0] leading-[normal]"
                    >
                        Upload Photos <span className="text-gray-500">(Optional)</span>
                    </label>

                    {/* File Previews */}
                    {uploadedFiles.length > 0 && (
                        <div className="w-full grid grid-cols-2 gap-2 mb-2">
                            {uploadedFiles.map((file, index) => (
                                <div key={index} className="relative bg-[#1a1a1a] border border-[#4d4d4d] rounded-lg p-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-[#2a2a2a] rounded flex items-center justify-center">
                                            <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-xs truncate [font-family:'Poppins',Helvetica]">
                                                {file.name}
                                            </p>
                                            <p className="text-neutral-400 text-xs [font-family:'Poppins',Helvetica]">
                                                {(file.size / 1024 / 1024).toFixed(1)}MB
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(index)}
                                            className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
                                        >
                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                    {errors[`file_${index}`] && (
                                        <p className="text-red-400 text-xs mt-1 [font-family:'Poppins',Helvetica]">
                                            {errors[`file_${index}`]}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="relative w-full h-[210px] border-2 border-dashed border-[#4d4d4d] rounded-lg bg-[#1a1a1a] flex flex-col items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 flex items-center justify-center">
                                <svg className="w-12 h-12 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <p className="text-neutral-400 text-sm [font-family:'Poppins',Helvetica] text-center">
                                MAX SIZE: 2MB<br />
                                FORMAT: jpg/png<br />
                                MAX FILES: 3
                            </p>
                        </div>

                        <input
                            type="file"
                            id="photo-upload"
                            accept="image/jpeg,image/png"
                            multiple
                            onChange={handleFileUpload}
                            className="hidden"
                            aria-label="Upload photos"
                            disabled={uploadedFiles.length >= 3}
                        />

                        <label
                            htmlFor="photo-upload"
                            className={`mt-3 inline-flex items-center justify-center px-6 py-2 rounded-lg cursor-pointer transition-opacity ${uploadedFiles.length >= 3
                                ? 'bg-gray-600 cursor-not-allowed opacity-50'
                                : 'bg-[linear-gradient(180deg,rgba(158,173,247,1)_0%,rgba(113,106,231,1)_100%)] hover:opacity-90'
                                }`}
                        >
                            <span className="font-semibold text-white text-[13px] [font-family:'Poppins',Helvetica] tracking-[0] leading-[normal]">
                                {uploadedFiles.length >= 3 ? 'Max Files Reached' : 'Upload'}
                            </span>
                        </label>
                    </div>

                    {errors.fileLimit && (
                        <p className="text-red-400 text-xs mt-1 [font-family:'Poppins',Helvetica]">
                            {errors.fileLimit}
                        </p>
                    )}
                </div>

                {/* Description */}
                <div className="flex flex-col items-start gap-1 w-full">
                    <div className="w-full flex justify-between items-center">
                        <label htmlFor="description-textarea" className="font-medium text-neutral-400 text-sm [font-family:'Poppins',Helvetica] tracking-[0] leading-[normal]">
                            Description <span className="text-red-400">*</span>
                        </label>
                        <span className={`font-light text-[13px] ${getWordCount() > 200 ? 'text-red-400' : 'text-neutral-400'}`}>
                            {getWordCount()}/200 words
                        </span>
                    </div>

                    <div className="w-full">
                        <textarea
                            id="description-textarea"
                            value={description}
                            onChange={handleDescriptionChange}
                            placeholder="Please explain the issue here..."
                            className={`w-full h-[145px] px-4 py-4 [font-family:'Poppins',Helvetica] font-normal text-neutral-400 text-[13px] tracking-[0] leading-[normal] bg-[#1a1a1a] border rounded-lg resize-none focus:outline-none ${errors.description ? 'border-red-400' : 'border-[#4d4d4d] focus:border-[#716ae7]'
                                }`}
                            aria-label="Description"
                        />
                    </div>
                    {errors.description && (
                        <p className="text-red-400 text-xs mt-1 [font-family:'Poppins',Helvetica]">
                            {errors.description}
                        </p>
                    )}
                </div>
            </form>

            {/* Submit Button */}
            <div className="flex flex-col w-full items-start gap-2 px-5 py-3 bg-black">
                {errors.submit && (
                    <div className="w-full bg-red-900/20 border border-red-500 rounded-lg p-3 mb-2">
                        <p className="text-red-400 text-sm [font-family:'Poppins',Helvetica] text-center">
                            {errors.submit}
                        </p>
                    </div>
                )}

                <div className="flex w-full items-center">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!isFormValid || isSubmitting}
                        className={`flex-1 h-[55px] rounded-[12.97px] flex items-center justify-center transition-all ${isFormValid && !isSubmitting
                            ? "bg-[linear-gradient(180deg,rgba(158,173,247,1)_0%,rgba(113,106,231,1)_100%)] cursor-pointer hover:opacity-90"
                            : "bg-[#7e7e7e] cursor-not-allowed"
                            }`}
                        aria-label="Submit ticket"
                    >
                        {isSubmitting ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span className="[font-family:'Poppins',Helvetica] font-semibold text-base text-white">
                                    Submitting...
                                </span>
                            </div>
                        ) : (
                            <span className="[font-family:'Poppins',Helvetica] font-semibold text-base text-center tracking-[0] leading-[normal] text-white">
                                Submit
                            </span>
                        )}
                    </button>
                </div>
            </div>


        </div>
    );
};
