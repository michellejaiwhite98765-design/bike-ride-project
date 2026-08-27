import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

function normalizeRegistration(value = "") {
  return String(value).replace(/[\s-]/g, "").toUpperCase();
}

function textOf(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function classifyFailure(statusCode, payload) {
  const message = textOf(payload?.message || payload?.error || payload?.data?.message || payload?.data?.error);

  if (statusCode === 401 || statusCode === 403) {
    return { status: "PROVIDER_AUTH_ERROR", message: "Vehicle verification service authentication failed" };
  }

  if (statusCode === 429) {
    return { status: "RATE_LIMITED", message: "Vehicle verification service is temporarily busy" };
  }

  if (statusCode >= 500) {
    return { status: "PROVIDER_ERROR", message: "Vehicle verification service is temporarily unavailable" };
  }

  if (statusCode === 404 || /not found|no record|vehicle not found|record not found|does not exist/.test(message)) {
    return { status: "NOT_FOUND", message: "Vehicle was not found by the verification provider" };
  }

  if (statusCode === 400 || statusCode === 422 || /invalid registration|invalid rc|invalid vehicle|bad request/.test(message)) {
    return { status: "INVALID", message: payload?.message || "Vehicle registration number is invalid" };
  }

  return { status: "UNVERIFIED", message: payload?.message || "Vehicle could not be verified" };
}

export const way2ApiService = {
  async verifyRc({ registrationNumber, chassisNumber, engineNumber } = {}) {
    if (!env.way2Api.apiKey) {
      throw ApiError.badRequest("WAY2API_API_KEY is not configured");
    }

    const rcNumber = normalizeRegistration(registrationNumber);

    if (!rcNumber) {
      throw ApiError.badRequest("Registration number is required");
    }

    const body = { rc_number: rcNumber };

    if (chassisNumber) body.chassis_number = String(chassisNumber).trim();
    if (engineNumber) body.engine_number = String(engineNumber).trim();

    let response;

    try {
      response = await fetch(env.way2Api.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.way2Api.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(env.way2Api.timeoutMs),
      });
    } catch (error) {
      if (error?.name === "TimeoutError" || error?.name === "AbortError") {
        return {
          status: "TIMEOUT",
          message: "Vehicle verification service timed out",
          orderId: null,
          result: null,
          raw: null,
        };
      }

      return {
        status: "PROVIDER_ERROR",
        message: "Unable to connect to vehicle verification service",
        orderId: null,
        result: null,
        raw: null,
      };
    }

    let payload;

    try {
      payload = await response.json();
    } catch {
      return {
        status: "PROVIDER_ERROR",
        message: `Vehicle verification service returned an invalid response (${response.status})`,
        orderId: null,
        result: null,
        raw: null,
      };
    }

    if (!response.ok || payload?.success !== true) {
      const failure = classifyFailure(response.status, payload);
      return {
        ...failure,
        orderId: payload?.order_id || null,
        result: payload?.data?.result || null,
        raw: payload,
      };
    }

    const result = payload?.data?.result;

    if (!result || typeof result !== "object") {
      return {
        status: "UNVERIFIED",
        message: "Vehicle verification service returned no vehicle data",
        orderId: payload?.order_id || null,
        result: null,
        raw: payload,
      };
    }

    const providerRegistration = normalizeRegistration(
      result.rc_number || result.registration_number || result.registrationNumber
    );

    if (!providerRegistration) {
      return {
        status: "UNVERIFIED",
        message: "Vehicle verification response did not contain a registration number",
        orderId: payload?.order_id || null,
        result,
        raw: payload,
      };
    }

    if (providerRegistration !== rcNumber) {
      return {
        status: "UNVERIFIED",
        message: "Vehicle verification response does not match the submitted registration number",
        orderId: payload?.order_id || null,
        result,
        raw: payload,
      };
    }

    return {
      status: "VERIFIED",
      message: "Vehicle verified successfully",
      orderId: payload?.order_id || result.order_id || null,
      result,
      raw: payload,
    };
  },
};
