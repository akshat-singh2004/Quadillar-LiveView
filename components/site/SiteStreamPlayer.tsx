'use client';

import React, { useState, useEffect } from 'react';
import { VideoOff, RefreshCw, Layers, ShieldAlert, Cpu, Terminal, Radio } from 'lucide-react';

export interface CameraSource {
    id: string;
    name: string;
    location: string;
    protocol: 'RTSP_OVER_WHEP' | 'RTSP_TCP' | 'HLS_STREAM';
    targetUri: string;
    port: number;
}

const CONFIGURED_CAMERAS: CameraSource[] = [
    {
        id: 'CAM-01-CRANE',
        name: 'Tower Crane 01 (PTZ Slew)',
        location: 'Grid B-4 / Elevation +45.0m',
        protocol: 'RTSP_OVER_WHEP',
        targetUri: 'rtsp://192.168.10.42:554/live/ch01',
        port: 554,
    },
    {
        id: 'CAM-02-GATE',
        name: 'Gate 1 Material Weighbridge',
        location: 'North Perimeter Ingress',
        protocol: 'RTSP_OVER_WHEP',
        targetUri: 'rtsp://192.168.10.43:554/live/ch01',
        port: 554,
    },
    {
        id: 'CAM-03-BATCH',
        name: 'Batching Plant & Silos',
        location: 'South-East Yard / RMC Staging',
        protocol: 'RTSP_OVER_WHEP',
        targetUri: 'rtsp://192.168.10.44:554/live/ch01',
        port: 554,
    },
];

export const SiteStreamPlayer: React.FC = () => {
    const [selectedCam, setSelectedCam] = useState<CameraSource>(CONFIGURED_CAMERAS[0]);
    const [isAttemptingHandshake, setIsAttemptingHandshake] = useState(false);
    const [pingLatencyMs, setPingLatencyMs] = useState<number | null>(null);
    const [timestamp, setTimestamp] = useState('');

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setTimestamp(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleRetryHandshake = () => {
        setIsAttemptingHandshake(true);
        setPingLatencyMs(null);
        setTimeout(() => {
            setIsAttemptingHandshake(false);
            setPingLatencyMs(null); // Hardware physically unreachable
        }, 1200);
    };

    return (
        <div className="relative w-full h-[500px] bg-black border border-neutral-800 rounded-lg overflow-hidden flex flex-col font-mono select-none">
            {/* Telemetry OSD Header */}
            <div className="h-10 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-4 z-20">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-xs font-bold text-neutral-200">STANDBY • NOT CONNECTED</span>
                    </div>
                    <span className="text-neutral-600 text-xs">|</span>
                    <span className="text-xs text-neutral-300 font-semibold">{selectedCam.name}</span>
                    <span className="text-[10px] text-neutral-500">[{selectedCam.location}]</span>
                </div>

                <div className="flex items-center gap-4 text-xs text-neutral-400">
                    <span>PORT: <strong className="text-neutral-200">{selectedCam.port}</strong></span>
                    <span>PROTOCOL: <strong className="text-neutral-200">{selectedCam.protocol}</strong></span>
                    <span>PING: <strong className="text-rose-400">{pingLatencyMs !== null ? `${pingLatencyMs}ms` : 'TIMEOUT'}</strong></span>
                </div>
            </div>

            {/* Main Diagnostic Terminal Viewport */}
            <div className="relative flex-1 bg-gradient-to-b from-neutral-950 via-black to-neutral-950 flex flex-col items-center justify-center p-6 text-center space-y-4">
                {/* Subtle grid pattern background */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center">
                    <div className="h-14 w-14 rounded-full border border-neutral-800 bg-neutral-900/60 flex items-center justify-center text-neutral-500 mb-3">
                        <VideoOff className="w-6 h-6 text-neutral-500" />
                    </div>

                    <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                        <span>EDGE INGRESS OFFLINE</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-neutral-900 border border-neutral-700 text-neutral-400 rounded">
                            HARDWARE UNPAIRED
                        </span>
                    </h3>

                    <p className="text-xs text-neutral-500 max-w-md mt-2 font-sans leading-relaxed">
                        No active RTSP or WebRTC (WHEP) ingress received at target socket endpoint{' '}
                        <code className="text-neutral-300 bg-neutral-900 px-1 py-0.5 rounded text-[11px] font-mono">
                            {selectedCam.targetUri}
                        </code>
                        . Connect on-site edge encoder (MediaMTX / Cloudflare Stream) to publish reality feed.
                    </p>

                    <div className="mt-5 flex items-center gap-3">
                        <button
                            onClick={handleRetryHandshake}
                            disabled={isAttemptingHandshake}
                            className="px-4 py-1.5 bg-neutral-900 border border-neutral-700 hover:border-emerald-500/60 text-neutral-200 hover:text-white text-xs font-semibold rounded transition flex items-center gap-2"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isAttemptingHandshake ? 'animate-spin text-emerald-400' : 'text-neutral-400'}`} />
                            <span>{isAttemptingHandshake ? 'Probing Gateway...' : 'Probe RTSP Gateway'}</span>
                        </button>
                    </div>
                </div>

                {/* Diagnostic Watermark / Crosshair */}
                <div className="pointer-events-none absolute inset-0 p-4 flex flex-col justify-between z-10 text-[10px] text-neutral-600">
                    <div className="flex justify-between">
                        <span>SYSTEM: QUADILLAR EDGE BRIDGE v3.2</span>
                        <span>TIME: {timestamp}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>SECTION 65B TELEMETRY: READY</span>
                        <span>ENCODER CHANNELS: 0 / 3 COMMITTED</span>
                    </div>
                </div>
            </div>

            {/* Switcher Footer */}
            <div className="h-12 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between px-4 z-20">
                <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-neutral-500" />
                    <span className="text-xs text-neutral-400 uppercase">Configured Video Channels:</span>
                </div>

                <div className="flex gap-2">
                    {CONFIGURED_CAMERAS.map((cam) => (
                        <button
                            key={cam.id}
                            onClick={() => setSelectedCam(cam)}
                            className={`px-3 py-1 text-xs rounded transition-all flex items-center gap-2 font-mono ${selectedCam.id === cam.id
                                    ? 'bg-neutral-800 text-neutral-200 border border-neutral-600'
                                    : 'bg-neutral-950 text-neutral-500 border border-neutral-850 hover:text-neutral-300'
                                }`}
                        >
                            <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
                            {cam.name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SiteStreamPlayer;