/**
 * Playlist session engine — duration-based session timer + per-track playhead.
 */
const { parseDurationSeconds } = require('./rj.defaults');

const msSince = (date) => (date ? Date.now() - new Date(date).getTime() : 0);

const getTrackElapsedMs = (studio) => {
  const paused = studio.playlistTrackElapsedMs || 0;
  if (studio.isPlaylistPaused || !studio.playlistTrackStartedAt) return paused;
  return paused + msSince(studio.playlistTrackStartedAt);
};

const resetTrackPlayhead = (studio) => {
  studio.playlistTrackStartedAt = new Date();
  studio.playlistTrackElapsedMs = 0;
};

const pauseTrackPlayhead = (studio) => {
  if (!studio.isPlaylistPaused) {
    studio.playlistTrackElapsedMs = getTrackElapsedMs(studio);
    studio.playlistTrackStartedAt = null;
  }
};

const resumeTrackPlayhead = (studio) => {
  if (studio.isPlaylistActive && !studio.playlistTrackStartedAt) {
    studio.playlistTrackStartedAt = new Date();
  }
};

/** Decrement session minutes at most once per 60s */
const tickSessionMinutes = (studio) => {
  if (!studio.isPlaylistActive || studio.isPlaylistPaused) return false;
  if (studio.playlistTimerRemaining <= 0) return false;

  const now = Date.now();
  const last = studio.playlistSessionLastTickAt
    ? new Date(studio.playlistSessionLastTickAt).getTime()
    : 0;
  if (last && now - last < 55_000) return false;

  studio.playlistSessionLastTickAt = new Date();
  studio.playlistTimerRemaining = Math.max(0, (studio.playlistTimerRemaining || 0) - 1);
  return studio.playlistTimerRemaining <= 0;
};

const shouldAdvanceTrack = (studio, currentItem) => {
  if (!studio.isPlaylistActive || studio.isPlaylistPaused || !currentItem) return false;
  const songMs = parseDurationSeconds(currentItem.duration) * 1000;
  if (songMs < 1000) return false;
  return getTrackElapsedMs(studio) >= songMs;
};

module.exports = {
  getTrackElapsedMs,
  resetTrackPlayhead,
  pauseTrackPlayhead,
  resumeTrackPlayhead,
  tickSessionMinutes,
  shouldAdvanceTrack,
};
