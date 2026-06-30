const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const env = { ...process.env };

// Set up path and environment variables for Windows stability
if (process.platform === 'win32') {
  const winDir = env.SystemRoot || env.windir || 'C:\\Windows';
  const system32 = path.join(winDir, 'System32');
  const pathVal = env.PATH || env.Path || '';
  if (!pathVal.toLowerCase().includes('system32')) {
    env.PATH = `${system32};${pathVal}`;
  }
}

const shell = process.platform === 'win32'
  ? (fs.existsSync('C:\\Windows\\System32\\cmd.exe') ? 'C:\\Windows\\System32\\cmd.exe' : 'cmd.exe')
  : '/bin/sh';

const argsPrefix = process.platform === 'win32' ? ['/c'] : ['-c'];

console.log('--- Starting Expo Dev Server ---');
const devServer = spawn(shell, [...argsPrefix, 'npm run dev'], {
  env,
  stdio: 'inherit'
});

devServer.on('error', (err) => {
  console.error('Error starting Expo Dev Server:', err);
});

console.log('--- Waiting for localhost:8081 and launching Electron ---');
const electronProcess = spawn(shell, [...argsPrefix, 'npx wait-on http://localhost:8081 && npx electron electron/main.js'], {
  env,
  stdio: 'inherit'
});

electronProcess.on('error', (err) => {
  console.error('Error starting wait-on / Electron launcher:', err);
});

// Clean up processes on exit
const cleanUp = () => {
  try { devServer.kill(); } catch (e) {}
  try { electronProcess.kill(); } catch (e) {}
};

process.on('SIGINT', () => {
  cleanUp();
  process.exit();
});

process.on('SIGTERM', () => {
  cleanUp();
  process.exit();
});

process.on('exit', () => {
  cleanUp();
});
