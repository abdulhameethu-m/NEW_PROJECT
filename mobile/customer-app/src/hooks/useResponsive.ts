import { useWindowDimensions } from 'react-native';
import { getDeviceClass, DeviceClass, BREAKPOINTS } from '../responsive/breakpoints';

export interface ResponsiveInfo {
  screenWidth: number;
  screenHeight: number;
  isCompact: boolean;
  isStandard: boolean;
  isExpanded: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  deviceClass: DeviceClass;
  horizontalPadding: number;
  contentMaxWidth: number;
}

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();
  
  const deviceClass = getDeviceClass(width);
  const isCompact = deviceClass === 'compact';
  const isStandard = deviceClass === 'standard';
  const isExpanded = deviceClass === 'expanded';
  
  const isPortrait = height >= width;
  const isLandscape = width > height;
  
  // Calculate horizontal padding based on screen width
  let horizontalPadding = 16; // default for compact/standard
  if (isExpanded) {
    horizontalPadding = 24;
  }
  
  // Define maximum content width to prevent stretching on large screens like tablets
  const contentMaxWidth = 600;
  
  return {
    screenWidth: width,
    screenHeight: height,
    isCompact,
    isStandard,
    isExpanded,
    isPortrait,
    isLandscape,
    deviceClass,
    horizontalPadding,
    contentMaxWidth,
  };
}
