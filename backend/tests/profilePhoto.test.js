import { describe, it, expect } from "@jest/globals";
import sharp from "sharp";
import { request, app, registerUser } from "./helpers.js";

const picture = (format, width = 3000, height = 2000) =>
  sharp({ create: { width, height, channels: 3, background: { r: 40, g: 180, b: 160 } } })[format]().toBuffer();
const upload = (user, buffer, filename, contentType) =>
  request(app).put("/api/users/me/photo").set("Authorization", `Bearer ${user.token}`).attach("photo", buffer, { filename, contentType });

describe("Profile photo", () => {
  it("accepts a large photo and stores a small square copy, shown on the user", async () => {
    const user = await registerUser();
    const big = await picture("png", 4000, 3000);
    const res = await upload(user, big, "big.png", "image/png");
    expect(res.status).toBe(200);
    expect(res.body.data.profileImage).toMatch(/^data:image\/webp;base64,/);

    const stored = Buffer.from(res.body.data.profileImage.split(",")[1], "base64");
    const meta = await sharp(stored).metadata();
    expect([meta.width, meta.height]).toEqual([400, 400]);
    expect(stored.length).toBeLessThan(100 * 1024);

    const me = await request(app).get("/api/users/me").set("Authorization", `Bearer ${user.token}`);
    expect(me.body.data.profileImage).toBe(res.body.data.profileImage);
  });

  it("accepts other picture formats too", async () => {
    const user = await registerUser();
    for (const [format, type] of [["jpeg", "image/jpeg"], ["webp", "image/webp"], ["gif", "image/gif"]]) {
      const res = await upload(user, await picture(format, 800, 1200), `p.${format}`, type);
      expect(res.status).toBe(200);
    }
  });

  it("refuses something that isn't a picture", async () => {
    const user = await registerUser();
    expect((await upload(user, Buffer.from("%PDF-1.4 hello"), "doc.pdf", "application/pdf")).status).toBe(400);
    expect((await upload(user, Buffer.from("not really an image"), "fake.jpg", "image/jpeg")).status).toBe(400);
  });

  it("removes the photo", async () => {
    const user = await registerUser();
    await upload(user, await picture("jpeg", 500, 500), "p.jpg", "image/jpeg");
    const res = await request(app).delete("/api/users/me/photo").set("Authorization", `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.profileImage).toBeNull();
  });
});
