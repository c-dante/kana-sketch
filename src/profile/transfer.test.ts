import { describe, expect, it } from "vitest";
import { LESSON_ORDER } from "../data/kana";
import type { Profile } from "./profile";
import { decodeProfile, encodeProfile, importCodeFrom } from "./transfer";

const MINUTE = 60_000;

const fullProfile = (): Profile => {
  const profile: Profile = { deck: {}, stats: {} };
  LESSON_ORDER.forEach((char, i) => {
    profile.deck[char] = { box: (i % 5) + 1, due: (29_000_000 + i * 1371) * MINUTE };
    profile.stats[char] = {
      drawn: 40 + i,
      clean: 30 + i,
      mistakes: { order: i, direction: 2 * i, position: 3, shape: 100 + i },
      reviews: 50 + i,
      remembered: 45,
      lastPracticed: (29_000_000 + i) * MINUTE,
    };
  });
  return profile;
};

describe("profile transfer code", () => {
  it("round-trips a full profile", async () => {
    const profile = fullProfile();
    expect(await decodeProfile(await encodeProfile(profile))).toEqual(profile);
  });

  it("keeps a fully learned profile small enough for a phone-scannable QR code", async () => {
    expect((await encodeProfile(fullProfile())).length).toBeLessThan(1200);
  });

  it("round-trips stats for a character that was never practised", async () => {
    const profile: Profile = {
      deck: { あ: { box: 1, due: 5 * MINUTE } },
      stats: {
        あ: { drawn: 0, clean: 0, mistakes: { order: 0, direction: 0, position: 0, shape: 0 }, reviews: 0, remembered: 0, lastPracticed: null },
      },
    };
    expect(await decodeProfile(await encodeProfile(profile))).toEqual(profile);
  });

  it("rejects a truncated code with a message that says to export again", async () => {
    const code = await encodeProfile(fullProfile());
    await expect(decodeProfile(code.slice(0, 40))).rejects.toThrow(/export it again/);
  });

  it("refuses to export data for characters the app does not know", async () => {
    await expect(encodeProfile({ deck: { X: { box: 1, due: 0 } }, stats: {} })).rejects.toThrow(/"X"/);
  });

  it("round-trips an empty profile", async () => {
    expect(await decodeProfile(await encodeProfile({ deck: {}, stats: {} }))).toEqual({ deck: {}, stats: {} });
  });

  it("pulls the code out of a pasted import URL or accepts a bare code", () => {
    expect(importCodeFrom("http://cachy-box.local:5173/#import=abc_-1")).toBe("abc_-1");
    expect(importCodeFrom("  abc_-1 \n")).toBe("abc_-1");
    expect(importCodeFrom("http://cachy-box.local:5173/")).toBeNull();
  });
});
