/**
 * PodcastHealthDashboard Component
 * 
 * Displays real-time studio health metrics:
 * - Engine status
 * - DSP status
 * - Recording status
 * - Device status
 * - Performance metrics
 */

import React, { useState, useEffect, useCallback } from 'react';
import { audio } from '../../../services/audio';
import { useErrorHandler } from '../hooks/useErrorHandler';

interface HealthMetrics {
  engine: {
    status: 'running' | 'stopped' | 'error';
    cpuLoad?: number;
    uptime?: number;
  };
  dsp: {
    status: 'healthy' | 'warning' | 'error';
    load?: number;
    activeProcessors?: number;
  };
  recording: {
    status: 'active' | 'idle' | 'error';
    duration?: number;
    fileSize?: number;
    diskSpace?: number;
  };
  devices: {
    status: 'healthy' | 'warning' | 'error';
    activeMics: number;
    totalMics: number;
    latency?: number;
  };
  performance: {
    sampleRate?: number;
    bitDepth?: number;
    bufferSize?: number;
  };
}

const COLORS = {
  bg: '#080c14',
  panelBg: '#0d1119',
  panelBorder: '#1a2235',
  text: '#e5e7eb',
  textMuted: '#6b7280',
  success: '#22c55e',
  warning: '#fbbf24',
  error: '#ef4444',
  healthyBg: 'rgba(34, 197, 94, 0.1)',
  warningBg: 'rgba(251, 191, 36, 0.1)',
  errorBg: 'rgba(239, 68, 68, 0.1)',
};

const getDefaultMetrics = (): HealthMetrics => ({
  engine: { status: 'stopped' },
  dsp: { status: 'healthy' },
  recording: { status: 'idle' },
  devices: { status: 'healthy', activeMics: 0, totalMics: 5 },
  performance: {},
});

export const PodcastHealthDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<HealthMetrics>(getDefaultMetrics());
  const { handleError } = useErrorHandler();

  /**
   * Fetch health metrics from native engine
   */
  const fetchMetrics = useCallback(async () => {
    try {
      // Fetch engine health
      const engineHealth = await audio.getEngineHealthSnapshot();
      
      // Fetch recording status
      const recordingSnapshot = await audio.getRecordingSnapshot();
      
      // Fetch microphone status
      const micSnapshot = await audio.getMicrophoneSnapshot();
      
      // Fetch DSP status (if available)
      let dspSnapshot: any = {};
      try {
        dspSnapshot = await audio.getDSPSnapshot();
      } catch {
        // DSP snapshot may not be available
      }

      // Parse and update metrics
      const newMetrics: HealthMetrics = {
        engine: {
          status: engineHealth?.running ? 'running' : 'stopped',
          cpuLoad: engineHealth?.cpuLoad as number,
          uptime: engineHealth?.uptime as number,
        },
        dsp: {
          status: dspSnapshot?.load > 80 ? 'warning' : 'healthy',
          load: dspSnapshot?.load as number,
          activeProcessors: dspSnapshot?.activeProcessors as number,
        },
        recording: {
          status: recordingSnapshot?.isRecording ? 'active' : 'idle',
          duration: recordingSnapshot?.durationMs,
          fileSize: recordingSnapshot?.fileSize as number,
          diskSpace: recordingSnapshot?.diskSpace as number,
        },
        devices: {
          status: 'healthy',
          activeMics: micSnapshot?.activeMics as number || 0,
          totalMics: 5,
          latency: micSnapshot?.latency as number,
        },
        performance: {
          sampleRate: engineHealth?.sampleRate as number,
          bitDepth: engineHealth?.bitDepth as number,
          bufferSize: engineHealth?.bufferSize as number,
        },
      };

      // Determine device status based on active mics
      if (newMetrics.devices.activeMics === 0) {
        newMetrics.devices.status = 'warning';
      }

      setMetrics(newMetrics);
    } catch (error: any) {
      handleError('engine', `Failed to fetch health metrics: ${error.message}`, 'warning');
    }
  }, [handleError]);

  /**
   * Poll metrics every 2 seconds
   */
  useEffect(() => {
    fetchMetrics(); // Initial fetch

    const interval = setInterval(() => {
      fetchMetrics();
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchMetrics]);

  /**
   * Get status color
   */
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'running':
      case 'active':
      case 'healthy':
        return COLORS.success;
      case 'warning':
        return COLORS.warning;
      case 'error':
      case 'stopped':
        return COLORS.error;
      default:
        return COLORS.textMuted;
    }
  };

  /**
   * Get status background
   */
  const getStatusBg = (status: string): string => {
    switch (status) {
      case 'running':
      case 'active':
      case 'healthy':
        return COLORS.healthyBg;
      case 'warning':
        return COLORS.warningBg;
      case 'error':
      case 'stopped':
        return COLORS.errorBg;
      default:
        return 'transparent';
    }
  };

  /**
   * Format status text
   */
  const formatStatus = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  /**
   * Format duration
   */
  const formatDuration = (ms?: number): string => {
    if (!ms) return '--:--';
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  /**
   * Format file size
   */
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '-- MB';
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      style={{
        backgroundColor: COLORS.bg,
        padding: 12,
        borderRadius: 12,
        border: `1px solid ${COLORS.panelBorder}`,
        width: '100%',
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          paddingInline: 4,
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: COLORS.text,
            fontFamily: 'monospace',
            letterSpacing: '0.06em',
          }}
        >
          STUDIO HEALTH
        </span>
        <span
          style={{
            fontSize: 10,
            color: COLORS.textMuted,
            fontFamily: 'monospace',
          }}
        >
          {new Date().toLocaleTimeString()}
        </span>
      </div>

      {/* METRICS GRID */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 10,
        }}
      >
        {/* ENGINE STATUS */}
        <div
          style={{
            background: COLORS.panelBg,
            border: `1px solid ${COLORS.panelBorder}`,
            borderRadius: 8,
            padding: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: COLORS.textMuted,
              fontFamily: 'monospace',
              marginBottom: 8,
            }}
          >
            ENGINE
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 6,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: getStatusColor(metrics.engine.status),
                boxShadow: `0 0 8px ${getStatusColor(metrics.engine.status)}`,
              }}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: getStatusColor(metrics.engine.status),
                fontFamily: 'monospace',
              }}
            >
              {formatStatus(metrics.engine.status)}
            </span>
          </div>
          {metrics.engine.cpuLoad !== undefined && (
            <div
              style={{
                fontSize: 10,
                color: COLORS.text,
                fontFamily: 'monospace',
              }}
            >
              CPU: {metrics.engine.cpuLoad.toFixed(1)}%
            </div>
          )}
        </div>

        {/* DSP STATUS */}
        <div
          style={{
            background: COLORS.panelBg,
            border: `1px solid ${COLORS.panelBorder}`,
            borderRadius: 8,
            padding: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: COLORS.textMuted,
              fontFamily: 'monospace',
              marginBottom: 8,
            }}
          >
            DSP
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 6,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: getStatusColor(metrics.dsp.status),
                boxShadow: `0 0 8px ${getStatusColor(metrics.dsp.status)}`,
              }}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: getStatusColor(metrics.dsp.status),
                fontFamily: 'monospace',
              }}
            >
              {formatStatus(metrics.dsp.status)}
            </span>
          </div>
          {metrics.dsp.load !== undefined && (
            <div
              style={{
                fontSize: 10,
                color: COLORS.text,
                fontFamily: 'monospace',
              }}
            >
              Load: {metrics.dsp.load.toFixed(1)}%
            </div>
          )}
        </div>

        {/* RECORDING STATUS */}
        <div
          style={{
            background: COLORS.panelBg,
            border: `1px solid ${COLORS.panelBorder}`,
            borderRadius: 8,
            padding: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: COLORS.textMuted,
              fontFamily: 'monospace',
              marginBottom: 8,
            }}
          >
            RECORDING
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 6,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: getStatusColor(metrics.recording.status),
                boxShadow:
                  metrics.recording.status === 'active'
                    ? `0 0 8px ${getStatusColor(metrics.recording.status)}`
                    : 'none',
              }}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: getStatusColor(metrics.recording.status),
                fontFamily: 'monospace',
              }}
            >
              {formatStatus(metrics.recording.status)}
            </span>
          </div>
          {metrics.recording.status === 'active' && (
            <>
              <div
                style={{
                  fontSize: 10,
                  color: COLORS.text,
                  fontFamily: 'monospace',
                }}
              >
                Time: {formatDuration(metrics.recording.duration)}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: COLORS.text,
                  fontFamily: 'monospace',
                }}
              >
                Size: {formatFileSize(metrics.recording.fileSize)}
              </div>
            </>
          )}
        </div>

        {/* DEVICE STATUS */}
        <div
          style={{
            background: COLORS.panelBg,
            border: `1px solid ${COLORS.panelBorder}`,
            borderRadius: 8,
            padding: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: COLORS.textMuted,
              fontFamily: 'monospace',
              marginBottom: 8,
            }}
          >
            DEVICES
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 6,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: getStatusColor(metrics.devices.status),
                boxShadow: `0 0 8px ${getStatusColor(metrics.devices.status)}`,
              }}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: getStatusColor(metrics.devices.status),
                fontFamily: 'monospace',
              }}
            >
              {formatStatus(metrics.devices.status)}
            </span>
          </div>
          <div
            style={{
              fontSize: 10,
              color: COLORS.text,
              fontFamily: 'monospace',
            }}
          >
            Active: {metrics.devices.activeMics} / {metrics.devices.totalMics}
          </div>
          {metrics.devices.latency !== undefined && (
            <div
              style={{
                fontSize: 10,
                color: COLORS.text,
                fontFamily: 'monospace',
              }}
            >
              Latency: {metrics.devices.latency}ms
            </div>
          )}
        </div>
      </div>

      {/* PERFORMANCE INFO */}
      {(metrics.performance.sampleRate || metrics.performance.bitDepth) && (
        <div
          style={{
            marginTop: 10,
            padding: 10,
            background: COLORS.panelBg,
            border: `1px solid ${COLORS.panelBorder}`,
            borderRadius: 8,
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
          }}
        >
          {metrics.performance.sampleRate && (
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 9,
                  color: COLORS.textMuted,
                  fontFamily: 'monospace',
                }}
              >
                SAMPLE RATE
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: COLORS.text,
                  fontFamily: 'monospace',
                }}
              >
                {metrics.performance.sampleRate} Hz
              </div>
            </div>
          )}
          {metrics.performance.bitDepth && (
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 9,
                  color: COLORS.textMuted,
                  fontFamily: 'monospace',
                }}
              >
                BIT DEPTH
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: COLORS.text,
                  fontFamily: 'monospace',
                }}
              >
                {metrics.performance.bitDepth}-bit
              </div>
            </div>
          )}
          {metrics.performance.bufferSize && (
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 9,
                  color: COLORS.textMuted,
                  fontFamily: 'monospace',
                }}
              >
                BUFFER
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: COLORS.text,
                  fontFamily: 'monospace',
                }}
              >
                {metrics.performance.bufferSize} samples
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PodcastHealthDashboard;
