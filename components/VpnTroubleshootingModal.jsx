"use client";
import React, { useState, useEffect } from 'react';

const VpnTroubleshootingModal = ({ isVisible, onClose }) => {
    const [vpnDetection, setVpnDetection] = useState(null);
    const [networkQuality, setNetworkQuality] = useState(null);

    useEffect(() => {
        if (isVisible) {
            // Import and run VPN detection
            import('../lib/vpnUtils').then(({ detectVpnUsage, assessNetworkQuality }) => {
                setVpnDetection(detectVpnUsage());
                setNetworkQuality(assessNetworkQuality());
            });
        }
    }, [isVisible]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-white text-lg font-semibold">🔧 VPN Troubleshooting</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-xl"
                    >
                        ×
                    </button>
                </div>

                {vpnDetection && (
                    <div className="space-y-4">
                        {/* VPN Detection Status */}
                        <div className="bg-blue-900/30 rounded-lg p-4">
                            <h3 className="text-blue-400 font-semibold mb-2">🔍 VPN Detection</h3>
                            <div className="text-sm text-gray-300">
                                <p>Status: {vpnDetection.isVpnLikely ? '🟡 VPN Detected' : '🟢 No VPN'}</p>
                                <p>Confidence: {vpnDetection.confidence}%</p>
                                {vpnDetection.reasons.length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-yellow-400">Reasons:</p>
                                        <ul className="list-disc list-inside ml-2">
                                            {vpnDetection.reasons.map((reason, index) => (
                                                <li key={index} className="text-xs">{reason}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Network Quality */}
                        {networkQuality && (
                            <div className="bg-green-900/30 rounded-lg p-4">
                                <h3 className="text-green-400 font-semibold mb-2">📊 Network Quality</h3>
                                <div className="text-sm text-gray-300">
                                    <p>Quality: {networkQuality.quality === 'good' ? '🟢 Good' :
                                        networkQuality.quality === 'fair' ? '🟡 Fair' : '🔴 Poor'}</p>
                                    {networkQuality.rtt && <p>Latency: {networkQuality.rtt}ms</p>}
                                    {networkQuality.downlink && <p>Speed: {networkQuality.downlink} Mbps</p>}
                                </div>
                            </div>
                        )}

                        {/* Troubleshooting Steps */}
                        <div className="bg-yellow-900/30 rounded-lg p-4">
                            <h3 className="text-yellow-400 font-semibold mb-2">🛠️ Troubleshooting Steps</h3>
                            <div className="text-sm text-gray-300 space-y-2">
                                <div className="flex items-start">
                                    <span className="text-yellow-400 mr-2">1.</span>
                                    <span>Try switching to a VPN server closer to India</span>
                                </div>
                                <div className="flex items-start">
                                    <span className="text-yellow-400 mr-2">2.</span>
                                    <span>Use WireGuard protocol instead of OpenVPN</span>
                                </div>
                                <div className="flex items-start">
                                    <span className="text-yellow-400 mr-2">3.</span>
                                    <span>Temporarily disable VPN for game downloads</span>
                                </div>
                                <div className="flex items-start">
                                    <span className="text-yellow-400 mr-2">4.</span>
                                    <span>Check if your VPN blocks the Besitos API</span>
                                </div>
                                <div className="flex items-start">
                                    <span className="text-yellow-400 mr-2">5.</span>
                                    <span>Try a different VPN provider or server</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-purple-900/30 rounded-lg p-4">
                            <h3 className="text-purple-400 font-semibold mb-2">⚡ Quick Actions</h3>
                            <div className="space-y-2">
                                <button
                                    onClick={() => {
                                        // Force refresh progress data
                                        window.dispatchEvent(new CustomEvent('forceRefreshProgress'));
                                        onClose();
                                    }}
                                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 text-sm"
                                >
                                    🔄 Force Refresh Progress
                                </button>
                                <button
                                    onClick={() => {
                                        // Clear cache and retry
                                        localStorage.removeItem('gameProgressCache');
                                        window.location.reload();
                                    }}
                                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 text-sm"
                                >
                                    🗑️ Clear Cache & Retry
                                </button>
                            </div>
                        </div>

                        {/* API Status Check */}
                        <div className="bg-red-900/30 rounded-lg p-4">
                            <h3 className="text-red-400 font-semibold mb-2">🌐 API Status</h3>
                            <div className="text-sm text-gray-300">
                                <p>Base URL: https://rewardsuatapi.hireagent.co</p>
                                <p>Besitos API: https://api.besitoscorp.com/</p>
                                <button
                                    onClick={async () => {
                                        try {
                                            const response = await fetch('https://rewardsuatapi.hireagent.co/api/health', {
                                                method: 'GET',
                                                timeout: 10000
                                            });
                                            alert(`API Status: ${response.ok ? '✅ Online' : '❌ Offline'}`);
                                        } catch (error) {
                                            alert(`API Status: ❌ Error - ${error.message}`);
                                        }
                                    }}
                                    className="mt-2 bg-red-600 text-white py-1 px-3 rounded text-xs hover:bg-red-700"
                                >
                                    Test API Connection
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VpnTroubleshootingModal;
