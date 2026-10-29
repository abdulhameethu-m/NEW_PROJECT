const fs = require('fs');
const path = require('path');

const targetPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-notifications',
  'build',
  'TopicSubscriptionModule.android.js'
);

const patchedContent = `import { requireOptionalNativeModule } from 'expo-modules-core';

let nativeModule = null;
try {
  if (typeof requireOptionalNativeModule === 'function') {
    nativeModule = requireOptionalNativeModule('ExpoTopicSubscriptionModule');
  }
} catch {
  nativeModule = null;
}

const fallback = {
  addListener: () => {},
  removeListeners: () => {},
  subscribeToTopicAsync: () => Promise.resolve(null),
  unsubscribeFromTopicAsync: () => Promise.resolve(null),
};

export default nativeModule || fallback;
`;

try {
  if (fs.existsSync(targetPath)) {
    fs.writeFileSync(targetPath, patchedContent, 'utf8');
    console.log('[patch-expo-notifications] Successfully applied ExpoTopicSubscriptionModule fallback patch.');
  }

  // Remove rogue tsconfig.json shipped inside expo-notifications npm package
  const rogueTsConfig = path.join(__dirname, '..', 'node_modules', 'expo-notifications', 'tsconfig.json');
  if (fs.existsSync(rogueTsConfig)) {
    fs.unlinkSync(rogueTsConfig);
    console.log('[patch-expo-notifications] Removed rogue tsconfig.json in expo-notifications.');
  }
} catch (err) {
  console.warn('[patch-expo-notifications] Could not patch TopicSubscriptionModule.android.js:', err.message);
}

