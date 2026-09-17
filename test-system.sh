#!/usr/bin/env bash
echo -e "\n🔍 ===== QUADILLAR LIVEVIEW SYSTEM HEALTH DIAGNOSTIC =====\n"

# 1. Environment & Keys Check
echo -e "👉 [1/4] Checking Environment Variables (.env.local)..."
if [ -f .env.local ]; then
  grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local && echo "  ✅ NEXT_PUBLIC_SUPABASE_URL found" || echo "  ❌ MISSING: NEXT_PUBLIC_SUPABASE_URL"
  grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local && echo "  ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY found" || echo "  ❌ MISSING: NEXT_PUBLIC_SUPABASE_ANON_KEY"
else
  echo "  ❌ MISSING .env.local file in root directory!"
fi

# 2. TypeScript Compilation Check
echo -e "\n👉 [2/4] Running TypeScript Strict Type Checker..."
npx tsc --noEmit --pretty
if [ $? -eq 0 ]; then
  echo "  ✅ TypeScript: 0 errors detected."
else
  echo "  ❌ TypeScript compilation failed (see file lines above)."
fi

# 3. Next.js Production Build Validation
echo -e "\n👉 [3/4] Testing Next.js Turbopack / Webpack Build..."
npm run build
if [ $? -eq 0 ]; then
  echo "  ✅ Next.js Build: Clean exit code 0."
else
  echo "  ❌ Build broke during prerendering/routing."
fi

# 4. Dependency Health Check
echo -e "\n👉 [4/4] Verifying Core Dependencies..."
npm list @supabase/ssr @supabase/supabase-js lucide-react recharts > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "  ✅ All core UI & Supabase packages installed."
else
  echo "  ⚠️ Missing required packages. Running 'npm install' recommended."
fi

echo -e "\n🏁 ===== DIAGNOSTIC COMPLETE =====\n"
