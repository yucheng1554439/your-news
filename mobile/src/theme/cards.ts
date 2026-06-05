/** Standardized story card dimensions — image + body, no overlap. */
export const CARD_LAYOUT = {
  large: {
    minHeight: 480,
    imageHeight: 260,
    headlineLines: 3,
    summaryLines: 2,
  },
  medium: {
    minHeight: 340,
    imageHeight: 180,
    headlineLines: 2,
    summaryLines: 2,
  },
  small: {
    minHeight: 250,
    imageHeight: 120,
    headlineLines: 2,
    summaryLines: 2,
  },
} as const;
