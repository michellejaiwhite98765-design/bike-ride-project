import { initializeApp, getApps } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, signOut } from "firebase/auth";

// Firebase Phone Auth: Firebase sends the SMS and checks the code; the app then
// gives the backend Firebase's ID token, which proves the number was verified.
// These web config values are public by design (they identify the project).
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCpJJ7izyKlJ_V6NmPG4iWCHu4vwLl-zdE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "liftshare-e8dcf.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "liftshare-e8dcf",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:558211241055:web:ccedba58c4dd014199f7ea",
};

// VITE_FIREBASE_PHONE=false switches back to the server-sent code.
export const firebasePhoneEnabled = import.meta.env.VITE_FIREBASE_PHONE !== "false" && Boolean(config.apiKey);

let auth = null;
function firebaseAuth() {
  if (!auth) {
    const app = getApps()[0] || initializeApp(config);
    auth = getAuth(app);
    auth.languageCode = "en";
    // Local development only: skip the reCAPTCHA check. Works only with the
    // test numbers set in Firebase (no real SMS); never on the live site.
    if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_SKIP_RECAPTCHA === "true") {
      auth.settings.appVerificationDisabledForTesting = true;
    }
  }
  return auth;
}

let verifier = null;
function recaptcha() {
  // Invisible "I'm not a robot" check Firebase requires before sending an SMS.
  if (verifier) return verifier;
  let box = document.getElementById("firebase-recaptcha");
  if (!box) {
    box = document.createElement("div");
    box.id = "firebase-recaptcha";
    document.body.appendChild(box);
  }
  verifier = new RecaptchaVerifier(firebaseAuth(), box, { size: "invisible" });
  return verifier;
}

const toE164 = (phone) => {
  const digits = String(phone).replace(/\D/g, "").replace(/^(91)?0?(\d{10})$/, "$2");
  return `+91${digits}`;
};

function friendly(err) {
  const code = err?.code || "";
  if (code.includes("invalid-phone-number")) return "Enter a valid 10-digit mobile number";
  if (code.includes("too-many-requests") || code.includes("quota-exceeded")) return "Too many attempts. Please try again later";
  if (code.includes("invalid-verification-code")) return "Incorrect code. Please check and try again";
  if (code.includes("code-expired")) return "This code has expired. Please request a new one";
  if (code.includes("operation-not-allowed")) return "SMS to this country isn't enabled yet. Please contact support";
  if (code.includes("billing-not-enabled")) return "SMS sending isn't enabled yet. Please try again later";
  return "We couldn't send or check the code right now. Please try again";
}

// One pending SMS per phone number (sign-up and change-number can overlap).
const pending = new Map();

export const firebasePhone = {
  /** True once a code was sent by Firebase for this phone (so verify goes through Firebase). */
  isPending: (phone) => pending.has(toE164(phone)),

  async send(phone) {
    const e164 = toE164(phone);
    try {
      const confirmation = await signInWithPhoneNumber(firebaseAuth(), e164, recaptcha());
      pending.set(e164, confirmation);
      return { smsSent: true, resendAfterSeconds: 30 };
    } catch (err) {
      // A used/failed reCAPTCHA can't be reused: start fresh next time.
      try { verifier?.clear(); } catch { /* already cleared */ }
      verifier = null;
      const error = new Error(friendly(err));
      // Firebase can't send real SMS on this project (no billing yet): callers fall back.
      error.fallback = /billing-not-enabled|operation-not-allowed|quota-exceeded/.test(err?.code || "");
      throw error;
    }
  },

  /** Checks the code with Firebase and returns its ID token for the backend. */
  async confirm(phone, code) {
    const confirmation = pending.get(toE164(phone));
    if (!confirmation) throw new Error("Request a verification code first");
    try {
      const result = await confirmation.confirm(code);
      const idToken = await result.user.getIdToken();
      pending.delete(toE164(phone));
      // The app has its own login; don't stay signed in to Firebase.
      signOut(firebaseAuth()).catch(() => {});
      return idToken;
    } catch (err) {
      throw new Error(friendly(err));
    }
  },
};

/**
 * Sends the code both ways at once: a real SMS through Firebase, and the
 * server's own code (shown on screen while OTP_DEV_MODE is on). Either code
 * works when verifying. Fails only if neither could be sent.
 */
export async function sendBoth(phone, viaServer) {
  const [sms, server] = await Promise.allSettled([firebasePhone.send(phone), viaServer()]);
  // The server also checks e.g. "already registered" - that error must win.
  if (server.status === "rejected" && server.reason?.status && server.reason.status < 500) throw server.reason;
  if (sms.status === "rejected" && server.status === "rejected") throw sms.reason;
  const serverData = server.status === "fulfilled" ? server.value : {};
  return {
    ...serverData,
    smsSent: sms.status === "fulfilled" || Boolean(serverData.smsSent),
    resendAfterSeconds: serverData.resendAfterSeconds || 30,
  };
}

/** Tries the SMS (Firebase) code first, then the server's on-screen code. */
export async function verifyEither(phone, otp, withFirebaseToken, withServerCode) {
  if (firebasePhone.isPending(phone)) {
    try {
      return await withFirebaseToken(await firebasePhone.confirm(phone, otp));
    } catch (smsErr) {
      try {
        return await withServerCode();
      } catch {
        throw smsErr;
      }
    }
  }
  return withServerCode();
}
