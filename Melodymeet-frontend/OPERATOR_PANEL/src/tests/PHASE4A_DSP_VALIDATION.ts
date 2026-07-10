/**
 * PHASE 4A: DSP VALIDATION TEST
 * 
 * Tests per-microphone DSP independence for all 5 microphones.
 * Validates: Gain, EQ, Compressor, Limiter
 * 
 * Expected behavior: Each mic operates with independent DSP settings.
 */

import { audio } from '../services/audio/AudioSDK';

interface ValidationResult {
  test: string;
  mic: number;
  success: boolean;
  error?: string;
}

const results: ValidationResult[] = [];

function logResult(test: string, mic: number, success: boolean, error?: string) {
  results.push({ test, mic, success, error });
  const status = success ? '✅' : '❌';
  const msg = error ? ` - ${error}` : '';
  console.log(`${status} ${test} (Mic ${mic})${msg}`);
}

async function testGainControl() {
  console.log('\n=== Test 1: Per-Mic Gain Control ===');
  
  const gainLevels = [0.8, 0.5, 1.0, 0.3, 0.6];
  
  for (let i = 0; i < 5; i++) {
    try {
      await audio.setMicrophoneGainByIndex(i, gainLevels[i]);
      logResult('Gain Control', i, true);
    } catch (error) {
      logResult('Gain Control', i, false, String(error));
    }
  }
}

async function testEQControl() {
  console.log('\n=== Test 2: Per-Mic EQ Control ===');
  
  const eqSettings = [
    { eqBass: 3.0, eqMid: 0.0, eqTreble: -2.0 },  // Mic1: bass boost
    { eqBass: 0.0, eqMid: 2.0, eqTreble: 4.0 },   // Mic2: bright
    { eqBass: -3.0, eqMid: 0.0, eqTreble: 0.0 },  // Mic3: bass cut
    { eqBass: 1.0, eqMid: 1.0, eqTreble: 1.0 },   // Mic4: boosted
    { eqBass: 0.0, eqMid: 0.0, eqTreble: 0.0 },   // Mic5: flat
  ];
  
  for (let i = 0; i < 5; i++) {
    try {
      const channelId = `Mic${i + 1}`;
      await audio.setEQ(channelId, eqSettings[i]);
      logResult('EQ Control', i, true);
    } catch (error) {
      logResult('EQ Control', i, false, String(error));
    }
  }
}

async function testCompressorControl() {
  console.log('\n=== Test 3: Per-Mic Compressor Control ===');
  
  const compSettings = [
    { enabled: true, threshold: -20.0, ratio: 4.0, attack: 5.0, release: 120.0, makeup: 2.0 },
    { enabled: false, threshold: -15.0, ratio: 2.0, attack: 10.0, release: 80.0, makeup: 0.0 },
    { enabled: true, threshold: -25.0, ratio: 8.0, attack: 2.0, release: 200.0, makeup: 5.0 },
    { enabled: false, threshold: -20.0, ratio: 4.0, attack: 5.0, release: 120.0, makeup: 0.0 },
    { enabled: true, threshold: -18.0, ratio: 3.0, attack: 8.0, release: 100.0, makeup: 1.0 },
  ];
  
  for (let i = 0; i < 5; i++) {
    try {
      await audio.setMicrophoneCompressor(i, compSettings[i]);
      logResult('Compressor Control', i, true);
    } catch (error) {
      logResult('Compressor Control', i, false, String(error));
    }
  }
}

async function testLimiterControl() {
  console.log('\n=== Test 4: Per-Mic Limiter Control ===');
  
  const limiterSettings = [
    { enabled: true, threshold: -1.0, release: 80.0 },
    { enabled: false, threshold: -0.5, release: 50.0 },
    { enabled: true, threshold: -2.0, release: 120.0 },
    { enabled: true, threshold: -1.5, release: 90.0 },
    { enabled: false, threshold: -1.0, release: 80.0 },
  ];
  
  for (let i = 0; i < 5; i++) {
    try {
      await audio.setMicrophoneLimiter(i, limiterSettings[i]);
      logResult('Limiter Control', i, true);
    } catch (error) {
      logResult('Limiter Control', i, false, String(error));
    }
  }
}

async function testHPFControl() {
  console.log('\n=== Test 5: High-Pass Filter (HPF) ===');
  console.log('NOTE: Testing via setEQ() with highPassFilter field');
  
  for (let i = 0; i < 5; i++) {
    try {
      const channelId = `Mic${i + 1}`;
      // @ts-ignore - Testing if this field is supported
      await audio.setEQ(channelId, { 
        eqBass: 0.0, 
        eqMid: 0.0, 
        eqTreble: 0.0,
        highPassFilter: 80.0  // Test filter field
      });
      logResult('HPF Control', i, true);
    } catch (error) {
      logResult('HPF Control', i, false, String(error));
    }
  }
}

async function enableAllMicrophones() {
  console.log('\n=== Setup: Enable All Microphones ===');
  
  try {
    const devices = await audio.getAvailableInputDevices();
    console.log(`Found ${devices.length} input devices:`, devices);
    
    if (devices.length === 0) {
      console.error('❌ No input devices available - aborting test');
      return false;
    }
    
    // Enable all 5 microphones with the first available device
    for (let i = 0; i < 5; i++) {
      try {
        await audio.enableMicrophoneByIndex(i, devices[0]);
        console.log(`✅ Enabled Mic ${i} with device: ${devices[0]}`);
      } catch (error) {
        console.warn(`⚠️ Could not enable Mic ${i}:`, error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Setup failed:', error);
    return false;
  }
}

async function printSummary() {
  console.log('\n=== VALIDATION SUMMARY ===\n');
  
  const tests = ['Gain Control', 'EQ Control', 'Compressor Control', 'Limiter Control', 'HPF Control'];
  
  for (const test of tests) {
    const testResults = results.filter(r => r.test === test);
    const passed = testResults.filter(r => r.success).length;
    const failed = testResults.filter(r => !r.success).length;
    const status = failed === 0 ? '✅' : '❌';
    
    console.log(`${status} ${test}: ${passed}/5 passed, ${failed}/5 failed`);
    
    // Show errors
    const errors = testResults.filter(r => !r.success);
    if (errors.length > 0) {
      errors.forEach(e => {
        console.log(`   - Mic ${e.mic}: ${e.error}`);
      });
    }
  }
  
  const totalPassed = results.filter(r => r.success).length;
  const totalTests = results.length;
  const passRate = ((totalPassed / totalTests) * 100).toFixed(1);
  
  console.log(`\nTotal: ${totalPassed}/${totalTests} tests passed (${passRate}%)`);
  
  if (totalPassed === totalTests) {
    console.log('\n🎉 PHASE 4A VALIDATION: PASSED');
    console.log('\n✅ All DSP APIs operational - Ready for Phase 4B');
  } else {
    console.log('\n⚠️ PHASE 4A VALIDATION: INCOMPLETE');
    console.log('Review errors above and investigate missing API support');
  }
  
  console.log('\n=== MANUAL VERIFICATION REQUIRED ===');
  console.log('1. Speak into each microphone');
  console.log('2. Verify independent gain levels (Host=80%, Co-Host=50%, Guest1=100%, Guest2=30%, Guest3=60%)');
  console.log('3. Listen for EQ differences (bright vs dull)');
  console.log('4. Check compressor action (Host/Guest1/Guest3 ON, Co-Host/Guest2 OFF)');
  console.log('5. Monitor limiter action (Host/Guest1/Guest2 ON, Co-Host/Guest3 OFF)');
}

export async function runPhase4AValidation() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       PHASE 4A: DSP & AUDIOBRIDGE VALIDATION            ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  
  // Step 1: Enable microphones
  const setupSuccess = await enableAllMicrophones();
  if (!setupSuccess) {
    console.error('\n❌ Setup failed - cannot proceed with validation');
    return;
  }
  
  // Step 2: Run DSP tests
  await testGainControl();
  await testEQControl();
  await testCompressorControl();
  await testLimiterControl();
  await testHPFControl();
  
  // Step 3: Print summary
  await printSummary();
}

// Run validation if called directly
if (typeof window !== 'undefined' && window.location.search.includes('runPhase4AValidation')) {
  runPhase4AValidation().catch(console.error);
}
