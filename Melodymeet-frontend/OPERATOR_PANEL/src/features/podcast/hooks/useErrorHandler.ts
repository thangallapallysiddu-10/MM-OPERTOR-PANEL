/**
 * useErrorHandler Hook
 * 
 * Centralized error handling for podcast studio.
 * Categorizes errors and provides user feedback.
 */

import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

export type ErrorCategory = 'recording' | 'device' | 'engine' | 'dsp' | 'ipc';
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface PodcastError {
  id: string;
  category: ErrorCategory;
  message: string;
  timestamp: number;
  severity: ErrorSeverity;
  details?: any;
}

const ERROR_MESSAGES: Record<ErrorCategory, string> = {
  recording: 'Recording Error',
  device: 'Device Error',
  engine: 'Audio Engine Error',
  dsp: 'DSP Error',
  ipc: 'Communication Error',
};

export const useErrorHandler = () => {
  const [errors, setErrors] = useState<PodcastError[]>([]);

  const handleError = useCallback((
    category: ErrorCategory,
    message: string,
    severity: ErrorSeverity = 'error',
    details?: any
  ) => {
    const error: PodcastError = {
      id: `${Date.now()}-${Math.random()}`,
      category,
      message,
      timestamp: Date.now(),
      severity,
      details,
    };

    // Add to error log
    setErrors(prev => [...prev.slice(-19), error]); // Keep last 20 errors

    // Console logging
    const consoleMethod = severity === 'critical' || severity === 'error' ? 'error' : 'warn';
    console[consoleMethod](`[${category.toUpperCase()}] ${message}`, details || '');

    // User notification for critical/error
    if (severity === 'critical' || severity === 'error') {
      const title = ERROR_MESSAGES[category];
      Alert.alert(title, message);
    }

    // Send to monitoring service (if available)
    if (typeof window !== 'undefined' && (window as any).errorMonitoring) {
      (window as any).errorMonitoring.logError(error);
    }
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const clearError = useCallback((id: string) => {
    setErrors(prev => prev.filter(e => e.id !== id));
  }, []);

  // Helper to wrap async functions with error handling
  const wrapAsync = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    category: ErrorCategory,
    errorMessage: string
  ) => {
    return async (...args: T): Promise<R | null> => {
      try {
        return await fn(...args);
      } catch (error: any) {
        handleError(
          category,
          `${errorMessage}: ${error.message || 'Unknown error'}`,
          'error',
          error
        );
        return null;
      }
    };
  }, [handleError]);

  return {
    errors,
    handleError,
    clearErrors,
    clearError,
    wrapAsync,
    hasErrors: errors.length > 0,
    hasCriticalErrors: errors.some(e => e.severity === 'critical'),
  };
};
