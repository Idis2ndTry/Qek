const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite laeuft im Browser ueber WebAssembly. Metro muss die .wasm-Datei
// als Asset mitnehmen, sonst bricht der Web-Build ab. Auf Android und iOS
// aendert das nichts.
config.resolver.assetExts.push('wasm');

module.exports = config;
