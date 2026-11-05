import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

// Verifies a Firebase ID token from a phone sign-in done in the app and returns
// the phone number Firebase confirmed. Only the project ID is needed: the token
// is checked against Google's public signing keys, no service-account secret.
let auth = null;
function firebaseAuth() {
  if (!env.firebase.projectId) throw ApiError.badRequest("Phone verification with Firebase is not set up on the server");
  if (!auth) {
    const app = getApps().find((a) => a.name === "phone") || initializeApp({ projectId: env.firebase.projectId }, "phone");
    auth = getAuth(app);
  }
  return auth;
}

export const firebasePhoneService = {
  enabled: () => Boolean(env.firebase.projectId),

  /** @returns the verified phone number, e.g. "+919876543210" */
  async verifiedPhone(idToken) {
    let decoded;
    try {
      decoded = await firebaseAuth().verifyIdToken(idToken);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw ApiError.badRequest("Phone verification expired or invalid. Please verify again");
    }
    if (decoded.firebase?.sign_in_provider !== "phone" || !decoded.phone_number) {
      throw ApiError.badRequest("This is not a phone verification");
    }
    return decoded.phone_number;
  },
};
