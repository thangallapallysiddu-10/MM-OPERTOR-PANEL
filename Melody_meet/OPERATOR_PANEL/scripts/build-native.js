const { execSync } = require('child_process');
const path = require('path');

try {
  // Determine Electron runtime version automatically
  const electronVersion = require('electron/package.json').version;
  console.log(`[build-native] Target Electron version: ${electronVersion}`);

  // Resolve absolute path to the vcpkg toolchain to avoid CMake relative path issues
  const toolchainPath = path.resolve(__dirname, '../../../melodymeet-audio-engine/vcpkg/scripts/buildsystems/vcpkg.cmake');
  console.log(`[build-native] CMake Toolchain Path: ${toolchainPath}`);

  // Execute cmake-js with the correct runtime and toolchain
  const command = `npx cmake-js rebuild --runtime=electron --runtime-version=${electronVersion} --directory electron/native --CDCMAKE_TOOLCHAIN_FILE="${toolchainPath}"`;
  
  console.log(`[build-native] Executing: ${command}`);
  
  execSync(command, { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
} catch (error) {
  console.error('[build-native] Failed to build native addon:', error.message);
  process.exit(1);
}
