import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface LiveButtonProps {
    isLive: boolean;
    onPress: () => void;
    pulse?: boolean;
}

const LiveButton = ({ isLive, onPress, pulse = true }: LiveButtonProps) => {
    const pulseAnim = React.useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        if (pulse && isLive) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isLive, pulse]);

    const goLiveColor = '#FF6B8B';  // colors.primary
    const stopColor = '#C084FC';     // colors.accent

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ flex: 1 }}>
            <Animated.View style={[
                styles.button,
                { backgroundColor: isLive ? stopColor : goLiveColor },
                isLive && { transform: [{ scale: pulseAnim }] }
            ]}>
                <Text style={styles.buttonText}>{isLive ? 'Stop' : 'Go Live'}</Text>
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});

export default LiveButton;