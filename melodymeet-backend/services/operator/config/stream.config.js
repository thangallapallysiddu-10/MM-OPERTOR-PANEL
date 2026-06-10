// Audio bitrate presets and stream quality settings

const AUDIO_QUALITY = {
  MAXIMUM: { bitrate: 320, sampleRate: 48000, label: 'Maximum (320kbps)' },
  HIGH: { bitrate: 192, sampleRate: 44100, label: 'High Quality (192kbps)' },
  BALANCED: { bitrate: 128, sampleRate: 44100, label: 'Balanced (128kbps)' },
  LOSSLESS: { bitrate: 320, sampleRate: 96000, label: 'Lossless (96kHz)' },
};

const STREAM_CONFIG = {
  MAX_UPLOAD_SIZE_MB: 100,
  ALLOWED_FORMATS: ['mp3', 'wav', 'ogg', 'aac', 'flac'],
  DEFAULT_BITRATE: 128,
  MAX_LISTENERS: 10000,
};

module.exports = { AUDIO_QUALITY, STREAM_CONFIG };
