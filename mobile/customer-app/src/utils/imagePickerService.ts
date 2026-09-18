import { Alert, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import * as SecureStore from 'expo-secure-store';

// ─── Storage keys ─────────────────────────────────────────────────────────────
const PENDING_PHOTO_KEY = 'CAMERA_PENDING_PHOTO_URI';
const CAMERA_SESSION_KEY = 'CAMERA_SESSION_ACTIVE';

interface ImageAsset {
  uri: string;
  width?: number;
  height?: number;
  fileName?: string;
  fileSize?: number;
}

interface PickerResult {
  canceled: boolean;
  assets?: ImageAsset[] | null;
}

/**
 * Safely access the native ExponentImagePicker module if compiled into the current binary.
 */
function getNativeImagePicker(): any {
  try {
    return requireOptionalNativeModule('ExponentImagePicker');
  } catch {
    return null;
  }
}

/**
 * Check if the native camera/gallery module is available in the current client.
 */
export function isNativePickerAvailable(): boolean {
  return !!getNativeImagePicker();
}

// ─── Persistence helpers (expo-secure-store — always available in dev build) ──

/** Save photo URI so it survives Android process death. */
async function savePendingPhoto(uri: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(PENDING_PHOTO_KEY, uri);
  } catch (e) {
    console.warn('[ImagePicker] Could not persist photo URI:', e);
  }
}

/** Mark that a camera session is about to begin (survives process death). */
async function markCameraSessionStart(): Promise<void> {
  try {
    await SecureStore.setItemAsync(CAMERA_SESSION_KEY, '1');
  } catch (e) {
    console.warn('[ImagePicker] Could not mark camera session:', e);
  }
}

/** Clear both session flags once we've successfully consumed the photo. */
export async function clearPendingPhoto(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PENDING_PHOTO_KEY);
    await SecureStore.deleteItemAsync(CAMERA_SESSION_KEY);
  } catch (e) {
    console.warn('[ImagePicker] Could not clear pending photo:', e);
  }
}

/**
 * Retrieve any pending image result after Android process death.
 *
 * Strategy (in order):
 *  1. Try SecureStore (most reliable — survives full process death)
 *  2. Try native getPendingResultAsync (works when MainActivity just restarted)
 */
export async function getPendingImage(): Promise<string | null> {
  // ── Layer 1: SecureStore (written immediately after camera returns) ──
  try {
    const storedUri = await SecureStore.getItemAsync(PENDING_PHOTO_KEY);
    if (storedUri) {
      return storedUri;
    }
  } catch (e) {
    console.warn('[ImagePicker] SecureStore read error:', e);
  }

  // ── Layer 2: Native module fallback ──────────────────────────────────
  const nativePicker = getNativeImagePicker();
  if (nativePicker && typeof nativePicker.getPendingResultAsync === 'function') {
    try {
      const result: PickerResult = await nativePicker.getPendingResultAsync();
      if (result && !result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        await savePendingPhoto(uri);
        return uri;
      }
    } catch (error) {
      console.warn('[ImagePicker] getPendingResultAsync error:', error);
    }
  }

  return null;
}

/**
 * Check if a camera session was started (used in _layout to decide
 * whether to redirect back to edit screen on process restart).
 */
export async function wasCameraSessionActive(): Promise<boolean> {
  try {
    const flag = await SecureStore.getItemAsync(CAMERA_SESSION_KEY);
    return flag === '1';
  } catch {
    return false;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Launch camera to snap a new photo instantly.
 *
 * On Android, allowsEditing is disabled because the crop activity
 * is a known trigger for low-memory Activity recreation / OS process death.
 *
 * Before launching: marks CAMERA_SESSION_ACTIVE in SecureStore.
 * After returning:  saves the photo URI to SecureStore immediately.
 */
export async function takePhoto(): Promise<string | null> {
  const nativePicker = getNativeImagePicker();

  if (!nativePicker) {
    Alert.alert(
      'Camera Build Required',
      'Taking photos directly requires camera native support in the app build or running with Expo Go (press "s" in Metro).\n\nYou can also select a curated avatar or paste an image URL below.',
      [{ text: 'OK' }]
    );
    return null;
  }

  try {
    // Request Camera permissions
    if (typeof nativePicker.requestCameraPermissionsAsync === 'function') {
      const permission = await nativePicker.requestCameraPermissionsAsync();
      if (permission && permission.status !== 'granted') {
        Alert.alert(
          'Camera Permission Denied',
          'Please allow camera access in your device settings to take a photo.',
          [{ text: 'OK' }]
        );
        return null;
      }
    }

    // Mark session BEFORE launching camera (survives LMK process kill)
    await markCameraSessionStart();

    const result: PickerResult = await nativePicker.launchCameraAsync({
      mediaTypes: ['images'],
      // Crop activity on Android causes low-memory process kills — keep disabled.
      allowsEditing: Platform.OS === 'ios',
      quality: 0.7,
    });

    // Clear session flag (camera returned normally — no LMK kill happened)
    await SecureStore.deleteItemAsync(CAMERA_SESSION_KEY);

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      // Persist URI immediately so it survives any subsequent process restart
      await savePendingPhoto(uri);
      return uri;
    }

    return null;
  } catch (error: any) {
    // DO NOT clear session flag here — if Android killed the process, we need it
    console.warn('[ImagePicker] Error taking photo:', error);
    Alert.alert('Camera Error', error?.message || 'Could not open camera.');
    return null;
  }
}

/**
 * Open device gallery / photo library to choose any photo.
 */
export async function pickFromGallery(): Promise<string | null> {
  const nativePicker = getNativeImagePicker();

  if (!nativePicker) {
    Alert.alert(
      'Gallery Build Required',
      'Choosing from gallery requires photo library native support in the app build or running with Expo Go (press "s" in Metro).\n\nYou can also select a curated avatar or paste an image URL below.',
      [{ text: 'OK' }]
    );
    return null;
  }

  try {
    if (typeof nativePicker.requestMediaLibraryPermissionsAsync === 'function') {
      const permission = await nativePicker.requestMediaLibraryPermissionsAsync(false);
      if (permission && permission.status !== 'granted') {
        Alert.alert(
          'Photo Library Permission Denied',
          'Please allow photo library access in your device settings to pick a photo.',
          [{ text: 'OK' }]
        );
        return null;
      }
    }

    const result: PickerResult = await nativePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: Platform.OS === 'ios',
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      await savePendingPhoto(uri);
      return uri;
    }

    return null;
  } catch (error: any) {
    console.warn('[ImagePicker] Error picking from gallery:', error);
    Alert.alert('Gallery Error', error?.message || 'Could not open photo library.');
    return null;
  }
}
