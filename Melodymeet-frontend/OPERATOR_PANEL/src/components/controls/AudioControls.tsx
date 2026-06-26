import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface AudioControlsProps {
    isPlaying: boolean;
    onPlay: () => void;
    onPause: () => void;
    onNext: () => void;
    onPrevious: () => void;
    volume?: number;
    onVolumeChange?: (value: number) => void;
    disabled?: boolean;
}

const AudioControls = ({
    isPlaying,
    onPlay,
    onPause,
    onNext,
    onPrevious,
    volume = 70,
    onVolumeChange,
    disabled = false
}: AudioControlsProps) => {
    return (
        <View style={styles.container}>
            <View style={styles.controlRow}>
                <TouchableOpacity
                    onPress={onPrevious}
                    style={[styles.controlButton, disabled && styles.disabled]}
                    disabled={disabled}
                >
                    <Feather name="skip-back" size={24} color={disabled ? "#9A9AAA" : "#FFFFFF"} />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={isPlaying ? onPause : onPlay}
                    style={styles.playButton}
                    disabled={disabled}
                >
                    <LinearGradient colors={['#FF6B8B', '#FF8A5C']} style={styles.playGradient}>
                        <Feather name={isPlaying ? "pause" : "play"} size={28} color="#FFFFFF" />
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={onNext}
                    style={[styles.controlButton, disabled && styles.disabled]}
                    disabled={disabled}
                >
                    <Feather name="skip-forward" size={24} color={disabled ? "#9A9AAA" : "#FFFFFF"} />
                </TouchableOpacity>
            </View>

            {onVolumeChange && (
                <View style={styles.volumeContainer}>
                    <Feather name="volume-2" size={16} color="#9A9AAA" />
                    <TouchableOpacity
                        style={styles.volumeTrack}
                        onPress={(e) => {
                            // Simple volume control - can be enhanced
                            onVolumeChange(volume > 50 ? volume - 10 : volume + 10);
                        }}
                    >
                        <View style={[styles.volumeFill, { width: `${volume}%`, backgroundColor: '#FF6B8B' }]} />
                    </TouchableOpacity>
                    <Text style={styles.volumeText}>{volume}%</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { padding: 16 },
    controlRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, marginBottom: 16 },
    controlButton: { padding: 12, borderRadius: 30, backgroundColor: '#2F2F38' },
    playButton: { borderRadius: 40, overflow: 'hidden' },
    playGradient: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
    volumeContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    volumeTrack: { flex: 1, height: 4, backgroundColor: '#2F2F38', borderRadius: 2, overflow: 'hidden' },
    volumeFill: { height: '100%', borderRadius: 2 },
    volumeText: { fontSize: 12, color: '#9A9AAA', width: 40 },
    disabled: { opacity: 0.5 },
});

export default AudioControls;