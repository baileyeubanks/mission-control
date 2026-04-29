#!/usr/bin/env node
/**
 * OAuth 2.0 Device Authorization Grant for Firebase CLI
 * Uses the gcloud installed client to get a refresh token for bailey@contentco-op.com
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const CLIENT_ID = "32555940559.apps.googleusercontent.com";
const CLIENT_SECRET = "ZmssLNjJy2998hD4CTg2ejr2";
const SCOPE = "openid https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase";

async function requestDeviceCode() {
  const res = await fetch("https://oauth2.googleapis.com/device/code", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CLIENT_ID, scope: SCOPE }),
  });
  return res.json();
}

async function pollForToken(deviceCode, interval) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    device_code: deviceCode,
    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
  });

  while (true) {
    await sleep(interval * 1000);
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await res.json();
    if (data.error === "authorization_pending") {
      console.log("⏳ Waiting for approval...");
      continue;
    }
    if (data.error) {
      throw new Error(`OAuth error: ${data.error} - ${data.error_description}`);
    }
    return data;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("🔐 Starting OAuth device flow for Firebase CLI...\n");

  const device = await requestDeviceCode();
  if (device.error) {
    console.error("❌ Failed to request device code:", device);
    process.exit(1);
  }

  console.log("┌─────────────────────────────────────────────────────────────┐");
  console.log("│  OPEN THIS URL IN YOUR BROWSER:                             │");
  console.log("│                                                             │");
  console.log(`│  ${device.verification_url.padEnd(57, " ")}│`);
  console.log("│                                                             │");
  console.log("│  ENTER THIS CODE:                                           │");
  console.log("│                                                             │");
  console.log(`│  ${device.user_code.padEnd(57, " ")}│`);
  console.log("└─────────────────────────────────────────────────────────────┘\n");

  console.log("⏳ Polling for token every", device.interval, "seconds...");
  console.log("   (Press Ctrl+C if you want to cancel)\n");

  const token = await pollForToken(device.device_code, device.interval);

  console.log("✅ Token received!\n");

  // Save as Firebase CLI token
  const tokenPath = path.join(process.cwd(), ".firebase-token");
  writeFileSync(tokenPath, token.refresh_token);
  console.log(`💾 Refresh token saved to: ${tokenPath}`);

  // Save as application default credentials
  const adc = {
    account: "bailey@contentco-op.com",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: token.refresh_token,
    type: "authorized_user",
    universe_domain: "googleapis.com",
  };
  const adcPath = path.join(
    process.env.HOME || process.env.USERPROFILE,
    ".config/gcloud/application_default_credentials.json"
  );
  writeFileSync(adcPath, JSON.stringify(adc, null, 2));
  console.log(`💾 ADC saved to: ${adcPath}`);

  // Print access token for immediate use
  console.log("\n🚀 You can now use:");
  console.log(`   firebase projects:list --token ${token.access_token}`);
  console.log("   export GOOGLE_APPLICATION_CREDENTIALS=" + adcPath);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
