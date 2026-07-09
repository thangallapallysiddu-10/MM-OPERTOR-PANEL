const addon = require('./electron/native/build/Release/melodymeet_audio_engine.node');
addon.initialize();
console.log('Devices:', addon.getAvailableInputDevices());
