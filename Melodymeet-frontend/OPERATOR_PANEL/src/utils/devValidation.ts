/**
 * Developer Validation Utilities
 * 
 * Run validation tests from the browser console.
 * 
 * Usage:
 *   (window as any).runPhase4AValidation()
 */

import { runPhase4AValidation } from '../tests/PHASE4A_DSP_VALIDATION';

// Expose validation function to global window object for easy console access
if (typeof window !== 'undefined') {
  (window as any).runPhase4AValidation = runPhase4AValidation;
  
  console.log(`
╔══════════════════════════════════════════════════════════╗
║         DEVELOPER VALIDATION UTILITIES LOADED            ║
╚══════════════════════════════════════════════════════════╝

Available commands:
  
  runPhase4AValidation()    - Test per-mic DSP independence
  
Run from browser console:
  (window as any).runPhase4AValidation()
  `);
}

export { runPhase4AValidation };
