#!/bin/bash
# Firebase Auth Setup — Run this in a terminal WITH a browser
# After approval, this script auto-runs all Firebase checks

set -e

echo "🔐 Step 1: Authenticating Firebase CLI..."
echo "   (A browser tab will open — approve with bailey@contentco-op.com)"
echo ""

# Login interactively
firebase login

# Link the project
firebase use astrobot-487905

# Create the default Firestore database if missing
echo ""
echo "📦 Step 2: Checking Firestore database..."
DBS=$(firebase firestore:databases:list --json 2>/dev/null || echo "[]")
if echo "$DBS" | grep -q "(default)"; then
  echo "   ✅ Default Firestore database exists"
else
  echo "   ⚠️  Default Firestore database missing!"
  echo "   Create it at: https://console.firebase.google.com/project/astrobot-487905/firestore"
fi

# Run Firebase checks
echo ""
echo "🔍 Step 3: Running Firebase health checks..."
echo ""

echo "--- Projects ---"
firebase projects:list

echo ""
echo "--- Firestore Databases ---"
firebase firestore:databases:list

echo ""
echo "--- Hosting Sites ---"
firebase hosting:sites:list 2>/dev/null || echo "   (no hosting configured)"

echo ""
echo "--- Functions ---"
firebase functions:list 2>/dev/null || echo "   (no functions deployed)"

echo ""
echo "✅ Firebase checks complete!"
echo ""
echo "Next: Switch-over analysis is in SWITCHOVER-REPORT.md"
