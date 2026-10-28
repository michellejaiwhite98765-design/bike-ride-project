import { describe, it, expect } from "@jest/globals";
import { visibleLocations } from "../src/realtime/visibility.js";

const all = {
  rider1: { userId: "rider1", userType: "rider" },
  pax1: { userId: "pax1", userType: "passenger" },
  pax2: { userId: "pax2", userType: "passenger" },
};

describe("live location visibility", () => {
  it("the rider sees every passenger", () => {
    expect(Object.keys(visibleLocations(all, { userId: "rider1", isOwner: true })).sort()).toEqual(["pax1", "pax2", "rider1"]);
  });

  it("a passenger sees the rider and themselves only", () => {
    expect(Object.keys(visibleLocations(all, { userId: "pax1", isOwner: false })).sort()).toEqual(["pax1", "rider1"]);
  });

  it("copes with no locations", () => {
    expect(visibleLocations(undefined, { userId: "pax1", isOwner: false })).toEqual({});
  });
});
