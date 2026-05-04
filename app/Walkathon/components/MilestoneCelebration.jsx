"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Milestone Celebration Component - iOS Native Style
 * Beautiful celebration animation with confetti effect
 */
export const MilestoneCelebration = ({ milestones = [], onClose }) => {
    const [visibleMilestones, setVisibleMilestones] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (milestones && milestones.length > 0) {
            setVisibleMilestones(milestones);
            setCurrentIndex(0);

            // Auto-close after showing all milestones
            const timer = setTimeout(() => {
                onClose?.();
            }, milestones.length * 4000); // 4 seconds per milestone

            return () => clearTimeout(timer);
        }
    }, [milestones, onClose]);

    if (!visibleMilestones || visibleMilestones.length === 0) {
        return null;
    }

    const currentMilestone = visibleMilestones[currentIndex];

    return (
        <AnimatePresence>
            {currentMilestone && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4"
                    onClick={() => {
                        if (currentIndex < visibleMilestones.length - 1) {
                            setCurrentIndex(currentIndex + 1);
                        } else {
                            onClose?.();
                        }
                    }}
                >
                        {/* Confetti Particles */}
                    {[...Array(30)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-3 h-3 rounded-full"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                backgroundColor: ['#f97316', '#fbbf24', '#fb923c', '#fdba74', '#7c3aed'][Math.floor(Math.random() * 5)],
                            }}
                            animate={{
                                y: [0, -100, 200],
                                opacity: [1, 1, 0],
                                rotate: [0, 360],
                                scale: [1, 1.5, 0.5],
                            }}
                            transition={{
                                duration: 2 + Math.random() * 2,
                                repeat: Infinity,
                                delay: Math.random() * 2,
                                ease: "easeOut",
                            }}
                        />
                    ))}

                    {/* Celebration Card */}
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, y: 50 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.5, opacity: 0, y: 50 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="relative w-full max-w-sm bg-black/90 backdrop-blur-xl border border-orange-500/30 rounded-3xl p-8 shadow-2xl shadow-orange-500/20 overflow-hidden"
                    >
                        {/* Glow Effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-transparent rounded-3xl" />
                        
                        {/* Content */}
                        <div className="relative z-10 text-center">
                            {/* Animated Trophy/Star */}
                            <motion.div
                                animate={{
                                    scale: [1, 1.2, 1],
                                    rotate: [0, 15, -15, 0],
                                }}
                                transition={{
                                    duration: 0.8,
                                    repeat: Infinity,
                                    repeatDelay: 1,
                                }}
                                className="relative inline-block mb-6"
                            >
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center shadow-2xl shadow-yellow-500/50 mx-auto">
                                    <motion.span
                                        animate={{ 
                                            rotate: [0, 360],
                                        }}
                                        transition={{
                                            duration: 20,
                                            repeat: Infinity,
                                            ease: "linear",
                                        }}
                                        className="text-5xl"
                                    >
                                        ⭐
                                    </motion.span>
                                </div>
                                {/* Pulse Rings */}
                                <motion.div
                                    className="absolute inset-0 rounded-full border-4 border-yellow-400"
                                    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                            </motion.div>

                            {/* Title */}
                            <motion.h2
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-white text-3xl font-black mb-2 tracking-tight"
                            >
                                Milestone Unlocked!
                            </motion.h2>

                            {/* Milestone Steps */}
                            <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-white/90 text-xl font-bold mb-1"
                            >
                                {currentMilestone.description || `${(currentMilestone.stepMilestone || 0).toLocaleString()} Steps`}
                            </motion.p>

                            <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.35 }}
                                className="text-white/60 text-sm mb-6"
                            >
                                {(currentMilestone.stepMilestone || 0).toLocaleString()} steps reached
                            </motion.p>

                            {/* XP Reward Card */}
                             <motion.div
                                 initial={{ scale: 0, rotateX: 90 }}
                                 animate={{ scale: 1, rotateX: 0 }}
                                 transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                                 className="bg-black/60 backdrop-blur-xl rounded-2xl p-5 mb-6 border border-orange-500/30 shadow-lg shadow-orange-500/10"
                             >
                                <p className="text-white/80 text-sm font-medium mb-1">Reward Earned</p>
                                <motion.div
                                    animate={{ 
                                        scale: [1, 1.1, 1],
                                    }}
                                    transition={{ duration: 1, repeat: 2 }}
                                    className="flex items-center justify-center gap-3"
                                >
                                    <div className="text-center">
                                        <span className="text-4xl font-black text-white">
                                            +{currentMilestone.xpReward || 0}
                                        </span>
                                        <span className="text-xl font-bold text-yellow-300 block">XP</span>
                                    </div>
                                    {currentMilestone.coinReward > 0 && (
                                        <div className="text-center">
                                            <span className="text-4xl font-black text-white">
                                                +{currentMilestone.coinReward || 0}
                                            </span>
                                            <span className="text-xl font-bold text-yellow-600 block">💰</span>
                                        </div>
                                    )}
                                </motion.div>
                            </motion.div>

                            {/* Progress Dots */}
                            {visibleMilestones.length > 1 && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.6 }}
                                    className="flex justify-center gap-2 mb-4"
                                >
                                    {visibleMilestones.map((_, i) => (
                                        <motion.div
                                            key={i}
                                            animate={{ 
                                                scale: i === currentIndex ? 1.3 : 1,
                                                backgroundColor: i === currentIndex ? '#fbbf24' : 'rgba(255,255,255,0.3)'
                                            }}
                                            className="w-2 h-2 rounded-full"
                                        />
                                    ))}
                                </motion.div>
                            )}

                            {/* Tap Hint */}
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                                className="text-white/60 text-sm"
                            >
                                Tap to {currentIndex < visibleMilestones.length - 1 ? "see next" : "continue"}
                            </motion.p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
