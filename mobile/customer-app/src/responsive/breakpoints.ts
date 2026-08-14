export const BREAKPOINTS = {
  compact: 0,     // up to 379px (e.g., iPhone SE)
  standard: 380,  // 380px to 429px (e.g., iPhone 13, 14, 15, Pixel)
  expanded: 430,  // 430px+ (e.g., iPhone 14 Plus, Pro Max, large Androids)
};

export type DeviceClass = 'compact' | 'standard' | 'expanded';

export const getDeviceClass = (width: number): DeviceClass => {
  if (width >= BREAKPOINTS.expanded) return 'expanded';
  if (width >= BREAKPOINTS.standard) return 'standard';
  return 'compact';
};
