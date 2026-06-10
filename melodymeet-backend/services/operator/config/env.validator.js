// config/env.validator.js - Validate critical environment variables on startup

const isProduction = process.env.NODE_ENV === 'production';

function validateEnvironment() {
  const errors = [];

  // Critical secrets that must not be defaults
  const criticalSecrets = [
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'AUTH_ENCRYPTION_KEY',
    'MOBILE_HASH_SECRET',
    'DEVICE_HASH_SECRET',
  ];

  const devDefaults = [
    'dev-',
    'melodymeet_',
    'change_me',
    'min_chars_here',
    'your_',
  ];

  criticalSecrets.forEach((key) => {
    const value = process.env[key];
    const isMissingOrWeak = !value || value.length < 32;
    const usesDevDefault = devDefaults.some((pattern) => value && value.includes(pattern));

    if (isProduction && isMissingOrWeak) {
      errors.push(`${key} must be set and at least 32 characters long`);
    }
    if (isProduction && usesDevDefault) {
      errors.push(`${key} appears to use dev default value - MUST be changed in production`);
    }
  });

  // Database credentials validation
  if (isProduction && (!process.env.DB_PASSWORD || process.env.DB_PASSWORD === 'postgres123')) {
    errors.push('DB_PASSWORD must be changed from default (postgres123)');
  }

  if (isProduction && (!process.env.DB_PASSWORD || process.env.DB_PASSWORD.length < 12)) {
    errors.push('DB_PASSWORD must be at least 12 characters');
  }

  // CORS validation
  if (!process.env.CORS_ORIGIN) {
    if (isProduction) {
      errors.push('CORS_ORIGIN must be explicitly set in production (not "*")');
    }
  }

  if (process.env.CORS_ORIGIN === '*' && isProduction) {
    errors.push('CORS_ORIGIN cannot be "*" in production - must specify allowed domains');
  }

  // Port validation
  if (!process.env.PORT || isNaN(Number(process.env.PORT))) {
    errors.push('PORT must be set to a valid number');
  }

  if (errors.length > 0) {
    console.error('\n❌ ENVIRONMENT VALIDATION ERRORS:');
    errors.forEach((error) => console.error(`  - ${error}`));
    console.error('\n📋 See .env.example for required configuration\n');
    process.exit(1);
  }

  console.log('✅ Environment variables validated successfully');
}

module.exports = { validateEnvironment };
