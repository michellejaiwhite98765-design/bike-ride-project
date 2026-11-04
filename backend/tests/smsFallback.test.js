import { describe, it, expect, afterEach, jest } from "@jest/globals";
import { env } from "../src/config/env.js";
import { smsService } from "../src/services/sms.service.js";

const original = { ...env.sms, fast2sms: { ...env.sms.fast2sms } };
afterEach(() => {
  Object.assign(env.sms, original);
  env.sms.fast2sms = { ...original.fast2sms };
  jest.restoreAllMocks();
});

describe("Fast2SMS sending", () => {
  it("shows the code in the app when Fast2SMS refuses and dev mode is on", async () => {
    Object.assign(env.sms, { provider: "fast2sms", otpDevMode: true });
    env.sms.fast2sms.apiKey = "test-key";
    jest.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, json: async () => ({ return: false, status_code: 996, message: "complete website verification" }) });
    expect(await smsService.sendOtp("9025696583", "123456")).toEqual({ delivered: false, devMode: true });
  });

  it("still fails when Fast2SMS refuses and dev mode is off", async () => {
    Object.assign(env.sms, { provider: "fast2sms", otpDevMode: false });
    env.sms.fast2sms.apiKey = "test-key";
    jest.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, json: async () => ({ return: false, status_code: 996, message: "x" }) });
    await expect(smsService.sendOtp("9025696583", "123456")).rejects.toMatchObject({ statusCode: 502 });
  });

  it("reports delivered when Fast2SMS accepts", async () => {
    Object.assign(env.sms, { provider: "fast2sms", otpDevMode: true });
    env.sms.fast2sms.apiKey = "test-key";
    jest.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, json: async () => ({ return: true, request_id: "abc" }) });
    expect(await smsService.sendOtp("9025696583", "123456")).toMatchObject({ delivered: true, devMode: true });
  });
});
