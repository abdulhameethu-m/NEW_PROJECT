import { describe, expect, it } from "vitest";
import { resolveBannerImageSources, resolveBannerVideoSources } from "../DynamicHomepageRenderer.jsx";

describe("resolveBannerImageSources", () => {
  it("prefers per-banner desktop and mobile images for their devices", () => {
    expect(
      resolveBannerImageSources(
        {
          desktopBannerImage: "/uploads/global-desktop.webp",
          mobileBannerImage: "/uploads/global-mobile.webp",
          bannerImage: "/uploads/legacy.webp",
        },
        {
          type: "image",
          desktopImage: "/uploads/desktop.webp",
          mobileImage: "/uploads/mobile.webp",
        }
      )
    ).toEqual({
      desktop: "/uploads/desktop.webp",
      mobile: "/uploads/mobile.webp",
    });
  });

  it("falls back to a banner item's desktop image on mobile when its mobile image is missing", () => {
    expect(
      resolveBannerImageSources(
        {
          bannerImage: "/uploads/legacy.webp",
        },
        {
          type: "image",
          desktopImage: "/uploads/desktop.webp",
        }
      )
    ).toEqual({
      desktop: "/uploads/desktop.webp",
      mobile: "/uploads/desktop.webp",
    });
  });

  it("keeps global device fields as fallback for any existing records", () => {
    expect(
      resolveBannerImageSources({
        desktopBannerImage: "/uploads/desktop.webp",
        mobileBannerImage: "/uploads/mobile.webp",
        bannerImage: "/uploads/legacy.webp",
      })
    ).toEqual({
      desktop: "/uploads/desktop.webp",
      mobile: "/uploads/mobile.webp",
    });
  });

  it("falls back to global desktop on mobile when item and global mobile images are missing", () => {
    expect(
      resolveBannerImageSources({
        desktopBannerImage: "/uploads/desktop.webp",
        bannerImage: "/uploads/legacy.webp",
      })
    ).toEqual({
      desktop: "/uploads/desktop.webp",
      mobile: "/uploads/desktop.webp",
    });
  });

  it("keeps legacy banner media rendering for old records", () => {
    expect(resolveBannerImageSources({ bannerImage: "/uploads/legacy.webp" })).toEqual({
      desktop: "/uploads/legacy.webp",
      mobile: "/uploads/legacy.webp",
    });
  });

  it("uses the active banner media item as the legacy fallback", () => {
    expect(resolveBannerImageSources({}, { type: "image", url: "/uploads/slide.webp" })).toEqual({
      desktop: "/uploads/slide.webp",
      mobile: "/uploads/slide.webp",
    });
  });
});

describe("resolveBannerVideoSources", () => {
  it("prefers per-banner desktop and mobile videos for their devices", () => {
    expect(
      resolveBannerVideoSources(
        {},
        {
          type: "video",
          desktopVideo: "/uploads/desktop.mp4",
          mobileVideo: "/uploads/mobile.mp4",
          url: "/uploads/legacy.mp4",
        }
      )
    ).toEqual({
      desktop: "/uploads/desktop.mp4",
      mobile: "/uploads/mobile.mp4",
    });
  });

  it("falls back to desktop video on mobile when mobile video is missing", () => {
    expect(
      resolveBannerVideoSources(
        {},
        {
          type: "video",
          desktopVideo: "/uploads/desktop.mp4",
          url: "/uploads/legacy.mp4",
        }
      )
    ).toEqual({
      desktop: "/uploads/desktop.mp4",
      mobile: "/uploads/desktop.mp4",
    });
  });

  it("keeps legacy single video media rendering for old records", () => {
    expect(resolveBannerVideoSources({}, { type: "video", url: "/uploads/legacy.mp4" })).toEqual({
      desktop: "/uploads/legacy.mp4",
      mobile: "/uploads/legacy.mp4",
    });
  });
});
