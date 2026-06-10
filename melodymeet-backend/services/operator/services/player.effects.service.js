/**
 * Player Audio Effects Service
 * Manages real audio effects processing for each player
 * - Filters (High-Pass, Low-Pass)
 * - EQ (5-band equalizer)
 * - Echo/Delay
 * - Reverb
 * - Flanger/Phaser
 */

const { RjStudio } = require('../models/rj.model');
const { notFound, badRequest } = require('../utils/errors');
const { DEFAULT_PLAYER_FX } = require('./rj.defaults');

const normalizeStudioId = (studioId) => {
  const id = String(studioId || '').trim();
  if (!id) throw badRequest('studioId is required');
  return id;
};

const validatePlayerName = (playerName) => {
  if (!['A', 'B'].includes(playerName)) {
    throw badRequest('playerName must be "A" or "B"');
  }
  return playerName;
};

const EFFECT_VALIDATORS = {
  highPassFilter: { min: 20, max: 20000, type: 'number' },
  lowPassFilter: { min: 20, max: 20000, type: 'number' },
  eqBass: { min: 0, max: 100, type: 'number' },
  eqTreble: { min: 0, max: 100, type: 'number' },
  echoDelay: { min: 0, max: 2000, type: 'number' },
  echoWetDry: { min: 0, max: 100, type: 'number' },
  reverb: { min: 0, max: 100, type: 'number' },
  reverbDecay: { min: 0.1, max: 10, type: 'number' },
  flanger: { min: 0, max: 100, type: 'number' },
  flangerRate: { min: 0.1, max: 5, type: 'number' },
  phaser: { min: 0, max: 100, type: 'number' },
  phaserRate: { min: 0.1, max: 5, type: 'number' },
};

/**
 * Validate effect value against defined ranges
 */
const validateEffectValue = (effectName, value) => {
  const validator = EFFECT_VALIDATORS[effectName];

  if (!validator) {
    throw badRequest(`Unknown effect: ${effectName}`);
  }

  if (typeof value !== validator.type) {
    throw badRequest(`Effect ${effectName} must be a ${validator.type}`);
  }

  if (value < validator.min || value > validator.max) {
    throw badRequest(
      `Effect ${effectName} must be between ${validator.min} and ${validator.max}, got ${value}`
    );
  }

  return value;
};

/**
 * Get all effects for a player
 */
const getPlayerEffects = async (studioId, playerName) => {
  const id = normalizeStudioId(studioId);
  const player = validatePlayerName(playerName);

  const studio = await RjStudio.findByPk(id);
  if (!studio) throw notFound(`Studio ${id} not found`);

  const playerKey = `player${player}`;
  const playerData = studio.dualPlayer?.[playerKey];

  if (!playerData) {
    return { ...DEFAULT_PLAYER_FX };
  }

  return playerData.fx || { ...DEFAULT_PLAYER_FX };
};

/**
 * Update single effect value with validation
 */
const updatePlayerEffect = async (studioId, playerName, effectName, value) => {
  const id = normalizeStudioId(studioId);
  const player = validatePlayerName(playerName);

  // Validate effect value
  validateEffectValue(effectName, value);

  const studio = await RjStudio.findByPk(id);
  if (!studio) throw notFound(`Studio ${id} not found`);

  const playerKey = `player${player}`;
  const dualPlayer = studio.dualPlayer || {};

  if (!dualPlayer[playerKey]) {
    dualPlayer[playerKey] = {
      track: null,
      volume: 75,
      fx: { ...DEFAULT_PLAYER_FX },
    };
  }

  if (!dualPlayer[playerKey].fx) {
    dualPlayer[playerKey].fx = { ...DEFAULT_PLAYER_FX };
  }

  dualPlayer[playerKey].fx[effectName] = value;
  studio.dualPlayer = dualPlayer;

  await studio.save();
  return dualPlayer[playerKey].fx;
};

/**
 * Update multiple effects at once
 */
const updatePlayerEffects = async (studioId, playerName, fxValues) => {
  const id = normalizeStudioId(studioId);
  const player = validatePlayerName(playerName);

  if (!fxValues || typeof fxValues !== 'object') {
    throw badRequest('fxValues must be an object');
  }

  // Validate all effect values
  Object.entries(fxValues).forEach(([effectName, value]) => {
    validateEffectValue(effectName, value);
  });

  const studio = await RjStudio.findByPk(id);
  if (!studio) throw notFound(`Studio ${id} not found`);

  const playerKey = `player${player}`;
  const dualPlayer = studio.dualPlayer || {};

  if (!dualPlayer[playerKey]) {
    dualPlayer[playerKey] = {
      track: null,
      volume: 75,
      fx: { ...DEFAULT_PLAYER_FX },
    };
  }

  if (!dualPlayer[playerKey].fx) {
    dualPlayer[playerKey].fx = { ...DEFAULT_PLAYER_FX };
  }

  // Update all provided effects
  Object.entries(fxValues).forEach(([effectName, value]) => {
    dualPlayer[playerKey].fx[effectName] = value;
  });

  studio.dualPlayer = dualPlayer;
  await studio.save();
  return dualPlayer[playerKey].fx;
};

/**
 * Update player volume
 */
const updatePlayerVolume = async (studioId, playerName, volume) => {
  const id = normalizeStudioId(studioId);
  const player = validatePlayerName(playerName);

  if (typeof volume !== 'number' || volume < 0 || volume > 100) {
    throw badRequest('Volume must be a number between 0 and 100');
  }

  const studio = await RjStudio.findByPk(id);
  if (!studio) throw notFound(`Studio ${id} not found`);

  const playerKey = `player${player}`;
  const dualPlayer = studio.dualPlayer || {};

  if (!dualPlayer[playerKey]) {
    dualPlayer[playerKey] = {
      track: null,
      volume: 75,
      fx: { ...DEFAULT_PLAYER_FX },
    };
  }

  dualPlayer[playerKey].volume = Math.round(volume);
  studio.dualPlayer = dualPlayer;

  await studio.save();
  return {
    volume: dualPlayer[playerKey].volume,
  };
};

/**
 * Get complete player settings (volume + effects)
 */
const getPlayerSettings = async (studioId, playerName) => {
  const id = normalizeStudioId(studioId);
  const player = validatePlayerName(playerName);

  const studio = await RjStudio.findByPk(id);
  if (!studio) throw notFound(`Studio ${id} not found`);

  const playerKey = `player${player}`;
  const playerData = studio.dualPlayer?.[playerKey];

  if (!playerData) {
    return {
      volume: 75,
      fx: { ...DEFAULT_PLAYER_FX },
    };
  }

  return {
    volume: playerData.volume || 75,
    fx: playerData.fx || { ...DEFAULT_PLAYER_FX },
  };
};

/**
 * Reset all effects to defaults
 */
const resetPlayerEffects = async (studioId, playerName) => {
  const id = normalizeStudioId(studioId);
  const player = validatePlayerName(playerName);

  const studio = await RjStudio.findByPk(id);
  if (!studio) throw notFound(`Studio ${id} not found`);

  const playerKey = `player${player}`;
  const dualPlayer = studio.dualPlayer || {};

  if (!dualPlayer[playerKey]) {
    dualPlayer[playerKey] = {
      track: null,
      volume: 75,
      fx: { ...DEFAULT_PLAYER_FX },
    };
  }

  dualPlayer[playerKey].fx = { ...DEFAULT_PLAYER_FX };
  studio.dualPlayer = dualPlayer;

  await studio.save();
  return dualPlayer[playerKey].fx;
};

/**
 * Get effect metadata (min/max ranges for UI)
 */
const getEffectMetadata = () => {
  const metadata = {};

  Object.entries(EFFECT_VALIDATORS).forEach(([effectName, validator]) => {
    metadata[effectName] = {
      min: validator.min,
      max: validator.max,
      type: validator.type,
    };
  });

  return metadata;
};

module.exports = {
  getPlayerEffects,
  updatePlayerEffect,
  updatePlayerEffects,
  updatePlayerVolume,
  getPlayerSettings,
  resetPlayerEffects,
  getEffectMetadata,
  validateEffectValue,
};
