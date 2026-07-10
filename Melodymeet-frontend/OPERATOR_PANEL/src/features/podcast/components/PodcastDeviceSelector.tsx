/**
 * PodcastDeviceSelector Component
 * 
 * Dropdown for selecting audio input device.
 * Displays available devices and handles selection.
 */

import React, { useCallback } from 'react';

interface PodcastDeviceSelectorProps {
  selectedDevice?: string;
  availableDevices: string[];
  onDeviceChange: (device: string) => void;
  disabled?: boolean;
}

const COLORS = {
  inputBg: '#1a2235',
  inputBorder: '#2d3f5c',
  textLight: '#cbd5e1',
  textMuted: '#6b7280',
};

export const PodcastDeviceSelector = React.memo<PodcastDeviceSelectorProps>(
  ({ selectedDevice, availableDevices, onDeviceChange, disabled = false }) => {
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value && value !== selectedDevice) {
          onDeviceChange(value);
        }
      },
      [onDeviceChange, selectedDevice]
    );

    const hasDevices = availableDevices.length > 0;

    return (
      <div>
        <label
          style={{
            fontSize: 9,
            color: COLORS.textMuted,
            fontFamily: 'monospace',
            display: 'block',
            marginBottom: 4,
          }}
        >
          INPUT DEVICE
        </label>
        <div style={{ position: 'relative' }}>
          <select
            value={selectedDevice || ''}
            onChange={handleChange}
            disabled={disabled || !hasDevices}
            style={{
              width: '100%',
              background: COLORS.inputBg,
              border: `1px solid ${COLORS.inputBorder}`,
              borderRadius: 5,
              color: COLORS.textLight,
              fontSize: 10,
              padding: '6px 24px 6px 8px',
              fontFamily: 'monospace',
              cursor: hasDevices && !disabled ? 'pointer' : 'not-allowed',
              appearance: 'none',
              outline: 'none',
            }}
          >
            <option value="">
              {hasDevices ? 'Select device...' : 'No devices found'}
            </option>
            {availableDevices.map((device) => (
              <option key={device} value={device}>
                {device}
              </option>
            ))}
          </select>
          <span
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 8,
              color: COLORS.textMuted,
              pointerEvents: 'none',
            }}
          >
            ▼
          </span>
        </div>
      </div>
    );
  }
);

PodcastDeviceSelector.displayName = 'PodcastDeviceSelector';

export default PodcastDeviceSelector;
