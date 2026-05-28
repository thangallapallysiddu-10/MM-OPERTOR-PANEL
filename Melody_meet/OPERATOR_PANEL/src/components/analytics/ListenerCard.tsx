import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

interface ListenerCardProps {
    title: string;
    value: string | number;
    icon: string;
    change?: number;
    color?: string;
    suffix?: string;
    cardBg?: string;  // Add this prop
}

const ListenerCard = ({ title, value, icon, change, color = "#FF6B8B", suffix = "", cardBg }: ListenerCardProps) => {
    const isPositive = change !== undefined && change >= 0;
    const changeColor = isPositive ? '#34D399' : '#EF4444';
    const changeIcon = isPositive ? 'trending-up' : 'trending-down';
    const changeSymbol = isPositive ? '+' : '';

    // If cardBg is provided, use a regular View instead of LinearGradient
    if (cardBg) {
        return (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: '#E0E0E0' }]}>
                <View style={styles.header}>
                    <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                        <Feather name={icon as any} size={20} color={color} />
                    </View>
                    {change !== undefined && (
                        <View style={[styles.changeBadge, { backgroundColor: isPositive ? '#34D39920' : '#EF444420' }]}>
                            <Feather name={changeIcon} size={10} color={changeColor} />
                            <Text style={[styles.changeText, { color: changeColor }]}>
                                {changeSymbol}{Math.abs(change)}%
                            </Text>
                        </View>
                    )}
                </View>
                <Text style={[styles.value, { color: '#000000' }]}>{value}{suffix}</Text>
                <Text style={[styles.title, { color: '#666666' }]}>{title}</Text>
            </View>
        );
    }

    // Default gradient view
    return (
        <LinearGradient colors={['#24242C', '#202025']} style={styles.card}>
            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                    <Feather name={icon as any} size={20} color={color} />
                </View>
                {change !== undefined && (
                    <View style={[styles.changeBadge, { backgroundColor: isPositive ? '#34D39920' : '#EF444420' }]}>
                        <Feather name={changeIcon} size={10} color={changeColor} />
                        <Text style={[styles.changeText, { color: changeColor }]}>
                            {changeSymbol}{Math.abs(change)}%
                        </Text>
                    </View>
                )}
            </View>
            <Text style={[styles.value, { color: '#FFFFFF' }]}>{value}{suffix}</Text>
            <Text style={[styles.title, { color: '#9A9AAA' }]}>{title}</Text>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    card: { 
        borderRadius: 16, 
        padding: 14, 
        borderWidth: 1, 
        borderColor: '#2F2F38', 
        flex: 1, 
        marginHorizontal: 4 
    },
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 12 
    },
    iconContainer: { 
        width: 36, 
        height: 36, 
        borderRadius: 18, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    changeBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 8, 
        paddingVertical: 4, 
        borderRadius: 12,
        gap: 3,
    },
    changeText: { 
        fontSize: 10, 
        fontWeight: '600' 
    },
    value: { 
        fontSize: 28, 
        fontWeight: 'bold', 
        marginBottom: 4 
    },
    title: { 
        fontSize: 12, 
    },
});

export default ListenerCard;