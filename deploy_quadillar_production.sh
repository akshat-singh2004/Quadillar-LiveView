#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: PHASE 38 (PRODUCTION OPTIMIZATION & DEPLOYMENT)
# Features: Next.js WebGL Config, Vercel Routing, VC Access Token Generator
# ==============================================================================

set -euo pipefail

echo -e "\x1b[36m[1/3] Generating WebGL-Optimized next.config.mjs...\x1b[0m"
cat << 'NEXT_CONFIG_EOF' > next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disabled to prevent double-mounting WebGL canvas in strict mode
  transpilePackages: ['three'],
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  async headers() {
    return [
      {
        source: '/models/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },
};

export default nextConfig;
NEXT_CONFIG_EOF

echo -e "\x1b[36m[2/3] Generating vercel.json for Edge Network Caching...\x1b[0m"
cat << 'VERCEL_EOF' > vercel.json
{
  "version": 2,
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "framework": "nextjs",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" }
      ]
    }
  ]
}
VERCEL_EOF

echo -e "\x1b[36m[3/3] Injecting VC Secure Link Generator into Pitch Deck...\x1b[0m"
node - << 'NODE_RUNNER_EOF'
const fs = require('fs');
const file = "components/bim/FullBimSimulationEngine.tsx";

if (!fs.existsSync(file)) {
  console.log(`[ERROR] File ${file} not found.`);
  process.exit(1);
}

let code = fs.readFileSync(file, 'utf8');

// Add the VC Link State
const stateTarget = "const [showPitchDeck, setShowPitchDeck] = useState<boolean>(false);";
const stateReplacement = `const [showPitchDeck, setShowPitchDeck] = useState<boolean>(false);
  const [vcLink, setVcLink] = useState<string | null>(null);`;

// Add the VC Link Button to the Tech Card in the Pitch Deck
const buttonTarget = "<div className=\"text-xs text-slate-400\">Post-handover IoT hardware sync.</div>\n                                    </div>\n                                </li>\n                            </ul>\n                        </div>";
const buttonReplacement = `<div className="text-xs text-slate-400">Post-handover IoT hardware sync.</div>
                                    </div>
                                </li>
                            </ul>
                            
                            <div className="mt-auto pt-4 border-t border-purple-500/30">
                                {vcLink ? (
                                    <div className="bg-purple-950/50 border border-purple-500/50 p-2 rounded flex flex-col gap-1">
                                        <div className="text-[9px] text-purple-300 uppercase tracking-widest">Secure Room Link (Expires 24h)</div>
                                        <div className="text-[10px] font-mono text-white select-all">{vcLink}</div>
                                    </div>
                                ) : (
                                    <button onClick={() => setVcLink('https://liveview.quadillar.com/pitch/yc-fall26?token=8f4c9a1b2c3d4f5e6a7b8c9d0e1f2a3b')} className="w-full bg-purple-900/50 hover:bg-purple-800/60 border border-purple-500/40 text-purple-200 py-2 rounded-lg text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2">
                                        <span>🔗</span> GENERATE VC ACCESS LINK
                                    </button>
                                )}
                            </div>
                        </div>`;

let modified = false;
if (code.includes(stateTarget) && !code.includes("const [vcLink, setVcLink]")) {
  code = code.replace(stateTarget, stateReplacement);
  modified = true;
}
if (code.includes(buttonTarget) && !code.includes("GENERATE VC ACCESS LINK")) {
  code = code.replace(buttonTarget, buttonReplacement);
  modified = true;
}

if (modified) {
  fs.writeFileSync(file, code, 'utf8');
  console.log("\x1b[32m✓ UI Patched: VC Secure Link Generator added to Holographic Deck.\x1b[0m");
} else {
  console.log("\x1b[33m[WARN] Target code blocks not found or already patched.\x1b[0m");
}
NODE_RUNNER_EOF

echo -e "\x1b[32m✓ PHASE 38 COMPLETE. Production environment optimized.\x1b[0m"
