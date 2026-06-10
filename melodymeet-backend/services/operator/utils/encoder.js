// encoder.js
// Utility for FFmpeg-based audio encoding helpers
// Requires: npm install fluent-ffmpeg

let ffmpeg;
try {
  ffmpeg = require('fluent-ffmpeg');
} catch {
  ffmpeg = null;
}

/**
 * Get audio file metadata (duration, bitrate, format)
 * @param {string} filePath - Absolute path to audio file
 * @returns {Promise<object>} - Metadata object
 */
const getAudioMetadata = (filePath) => {
  return new Promise((resolve, reject) => {
    if (!ffmpeg) {
      return resolve({ duration: 'N/A', bitrate: 'N/A', format: 'N/A' });
    }

    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const stream = metadata.streams.find((s) => s.codec_type === 'audio');
      resolve({
        duration: metadata.format.duration
          ? `${Math.floor(metadata.format.duration / 60)}:${String(Math.floor(metadata.format.duration % 60)).padStart(2, '0')}`
          : 'N/A',
        bitrate: metadata.format.bit_rate
          ? `${Math.round(metadata.format.bit_rate / 1000)} kbps`
          : 'N/A',
        format: metadata.format.format_name || 'N/A',
        sampleRate: stream?.sample_rate || 'N/A',
      });
    });
  });
};

/**
 * Trim audio file between start and end timestamps
 * @param {string} inputPath - Input file path
 * @param {string} outputPath - Output file path
 * @param {number} startTime - Start in seconds
 * @param {number} duration - Duration in seconds
 */
const trimAudio = (inputPath, outputPath, startTime, duration) => {
  return new Promise((resolve, reject) => {
    if (!ffmpeg) return reject(new Error('FFmpeg not installed. Run: npm install fluent-ffmpeg ffmpeg-static'));

    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .output(outputPath)
      .on('end', () => resolve({ success: true, outputPath }))
      .on('error', (err) => reject(err))
      .run();
  });
};

module.exports = { getAudioMetadata, trimAudio };
