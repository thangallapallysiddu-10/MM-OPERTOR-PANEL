const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Extend existing blockList if it exists, otherwise initialize it
const existingBlockList = config.resolver.blockList || [];
const exclusionRE = [
  /[/\\]electron[/\\].*/,
  /.*\.node$/,
];
config.resolver.blockList = Array.isArray(existingBlockList)
  ? [...existingBlockList, ...exclusionRE]
  : exclusionRE;

module.exports = withNativeWind(config, {
  input: "./global.css",
})