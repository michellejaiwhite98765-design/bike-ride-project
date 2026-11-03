import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Sends sign-up OTPs by SMS.
 *
 * SMS_PROVIDER=2factor (2Factor.in): uses their OTP API, which texts the code
 * with 2Factor's own pre-approved template, so no DLT template of our own is
 * needed. Needs TWOFACTOR_API_KEY; TWOFACTOR_TEMPLATE optionally names a
 * custom template approved in the 2Factor dashboard.
 *
 * No provider: with OTP_DEV_MODE=true (the default outside production) the
 * code is only logged and `{ devMode: true }` is returned so the app can show
 * it for testing; otherwise sending fails with 503.
 */
async function sendVia2Factor(phone, otp) {
  const { apiKey, template, baseUrl, timeoutMs } = env.sms.twoFactor;
  if (!apiKey) throw new ApiError(503, "SMS is not set up yet (missing TWOFACTOR_API_KEY)");
  // 2Factor wants the number with country code; we store Indian numbers as 10 digits.
  const to = phone.length === 10 ? `91${phone}` : phone;
  const url = `${baseUrl}/${encodeURIComponent(apiKey)}/SMS/${to}/${otp}${template ? `/${encodeURIComponent(template)}` : ""}`;

  let body;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    body = await res.json().catch(() => ({}));
    if (!res.ok || body.Status !== "Success") throw new Error(body.Details || `HTTP ${res.status}`);
  } catch (err) {
    // Never log the URL: it contains the API key.
    logger.warn(`2Factor OTP to ${to.slice(0, 4)}****${to.slice(-2)} failed: ${err.message}`);
    throw new ApiError(502, "We couldn't send the code to this number right now. Please try again in a minute.");
  }
  return { delivered: true, providerRef: body.Details };
}

export const smsService = {
  async sendOtp(phone, otp) {
    switch (env.sms.provider) {
      case "2factor":
        return sendVia2Factor(phone, otp);
      case "":
        if (env.sms.otpDevMode) {
          logger.info(`[SMS dev mode] OTP for ${phone}: ${otp}`);
          return { delivered: false, devMode: true };
        }
        throw new ApiError(503, "SMS is not set up yet, so we can't send a verification code. Please try again later.");
      default:
        throw new ApiError(503, `SMS provider "${env.sms.provider}" is not supported`);
    }
  },
};
