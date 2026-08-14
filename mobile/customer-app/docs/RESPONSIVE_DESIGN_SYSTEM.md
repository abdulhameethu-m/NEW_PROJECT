# UCHOOSEME Responsive Design System (GRM)

This document outlines the architectural decisions and conventions used to build the responsive design system for the UCHOOSEME Customer Mobile App.

## Core Philosophy
1. **Device Agnosticism**: The app does not check `Platform.OS === 'ios'` or the physical device model. Instead, it checks the *available screen real estate* and adapts.
2. **"How much space is available?"**: This is the primary driver of layout logic.
3. **No Duplicate UI**: We do not maintain separate components for iOS vs Android, or Large vs Compact phones.

## Building Blocks

The system is built on a few core components and hooks. They must be used for **all** screen and component development.

### 1. `useResponsive()`
A React hook that provides semantic information about the current screen dimensions.
```tsx
import { useResponsive } from '../hooks/useResponsive';

const { 
  deviceClass, // 'compact' | 'standard' | 'expanded'
  horizontalPadding, // dynamic safe padding for edges
  columns, // optimal number of grid columns
  isLandscape 
} = useResponsive();
```

### 2. `SafeAreaScreen`
The universal wrapper for every screen. It automatically handles notches, dynamic islands, and system bars across both platforms.

```tsx
import { SafeAreaScreen } from '../components/layout/SafeAreaScreen';

export default function MyScreen() {
  return (
    <SafeAreaScreen className="flex-1 bg-white">
      {/* content */}
    </SafeAreaScreen>
  );
}
```
**Rules:**
- Never use React Native's built-in `SafeAreaView`.
- Never hardcode padding to dodge the notch.

### 3. `ResponsiveContainer`
The wrapper that prevents UI from stretching infinitely on large devices (tablets, foldables, large Pro Max phones) and enforces dynamic padding.

```tsx
import { ResponsiveContainer } from '../components/layout/ResponsiveContainer';

export const MySection = () => {
  return (
    <ResponsiveContainer withPadding={true}>
      <Text>This content respects max-width and dynamic side padding.</Text>
    </ResponsiveContainer>
  );
};
```

### 4. `KeyboardAwareScreen`
A wrapper that automatically handles keyboard popups consistently across iOS and Android. Use this for forms.

```tsx
import { KeyboardAwareScreen } from '../components/layout/KeyboardAwareScreen';

export default function LoginScreen() {
  return (
    <SafeAreaScreen>
      <KeyboardAwareScreen>
         {/* Form inputs here */}
      </KeyboardAwareScreen>
    </SafeAreaScreen>
  );
}
```

### 5. Breakpoints and Tailwind
We use NativeWind v4 with custom breakpoints defined in `tailwind.config.js`:
- `compact`: `0px` (small phones like iPhone SE)
- `standard`: `380px` (standard phones like iPhone 14/15)
- `expanded`: `430px` (large phones like Pro Max / Foldables)

**Example Usage:**
```tsx
<View className="w-full expanded:w-1/2 p-2">
  <Text>I take up full width on small phones, but half width on large phones!</Text>
</View>
```

### 6. Images & Aspect Ratios
Never use fixed `height` values for images (e.g., `h-40`). Always rely on width and aspect ratio so they scale perfectly.
```tsx
// ❌ BAD
<View className="w-full h-40" />

// ✅ GOOD
<View className="w-full aspect-[16/9]" />
```

## Migration Checklist
If you are migrating an older screen to this system, ensure you:
1. Replace `SafeAreaView` with `SafeAreaScreen`.
2. Wrap content or main sections in `ResponsiveContainer`.
3. Replace `KeyboardAvoidingView` + `ScrollView` with `KeyboardAwareScreen`.
4. Remove `Platform.OS` layout hacks.
5. Replace fixed dimensions on images/banners with `aspect-[]` ratios.
6. Verify NativeWind classes correctly scale using custom breakpoints.
