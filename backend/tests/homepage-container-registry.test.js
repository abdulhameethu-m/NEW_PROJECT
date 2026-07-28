/* global describe, expect, it, require */
const { getContainerTypeSchema } = require("../src/config/homepageContainerRegistry");

describe("homepage container BANNER schema", () => {
  it("keeps device banner images inside banner media items", () => {
    const schema = getContainerTypeSchema("BANNER");
    const fields = new Map(schema.typeFields.map((field) => [field.name, field]));

    expect(fields.get("bannerMedia")).toMatchObject({
      label: "Banner Media",
      type: "array",
      defaultValue: [],
    });
    expect(fields.has("desktopBannerImage")).toBe(false);
    expect(fields.has("mobileBannerImage")).toBe(false);
  });

  it("exposes banner carousel as a media-driven container type", () => {
    const schema = getContainerTypeSchema("BANNER_CAROUSEL");
    const fields = new Map(schema.typeFields.map((field) => [field.name, field]));

    expect(schema).toMatchObject({
      type: "BANNER_CAROUSEL",
      label: "Banner Carousel",
      supportsProducts: false,
    });
    expect(fields.get("bannerMedia")).toMatchObject({
      label: "Banner Carousel Media",
      type: "array",
      defaultValue: [],
    });
  });
});
