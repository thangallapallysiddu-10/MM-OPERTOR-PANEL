// compressor.js
// Utility for audio compression using FFmpeg presets
// Requires: npm install fluent-ffmpeg ffmpeg-static

let ffmpeg;
try {
  ffmpeg = require('fluent-ffmpeg');
} catch {
  ffmpeg = null;
}

const { AUDIO_QUALITY } = require('../config/stream.config');

/**
 * Compress an audio file to a specific quality preset
 * @param {string} inputPath - Source audio file
 * @param {string} outputPath - Destination for compressed file
 * @param {string} preset - One of: MAXIMUM, HIGH, BALANCED, LOSSLESS
 */
const compressAudio = (inputPath, outputPath, preset = 'BALANCED') => {
  return new Promise((resolve, reject) => {
    if (!ffmpeg) {
      return reject(new Error('FFmpeg not installed. Run: npm install fluent-ffmpeg ffmpeg-static'));
    }

    const quality = AUDIO_QUALITY[preset] || AUDIO_QUALITY.BALANCED;

    ffmpeg(inputPath)
      .audioBitrate(quality.bitrate)
      .audioFrequency(quality.sampleRate)
      .audioChannels(2)
      .format('mp3')
      .output(outputPath)
      .on('end', () => resolve({ success: true, outputPath, quality: quality.label }))
      .on('error', (err) => reject(err))
      .run();
  });
};

module.exports = { compressAudio };
