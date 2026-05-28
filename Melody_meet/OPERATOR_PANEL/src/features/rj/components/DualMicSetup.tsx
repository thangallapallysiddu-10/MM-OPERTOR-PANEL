import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { MicUser } from '../types';

interface DualMicSetupProps {
  allMics: MicUser[];
  isDarkMode: boolean;
  colors: any;
  onToggleActive: (micId: string) => void;
  onToggleMute: (micId: string) => void;
  onRemoveMic: (micId: string) => void;
  onAddMic: () => void;
}

export const DualMicSetup: React.FC<DualMicSetupProps> = ({
  allMics,
  isDarkMode,
  colors,
  onToggleActive,
  onToggleMute,
  onRemoveMic,
  onAddMic,
}) => {
  return (
    <View style={{
      flex: 1,
      borderRadius: 12,
      padding: 12,
      minWidth: 200,
      backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDarkMode ? '#374151' : '#E5E7EB',
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 12, fontWeight: 'bold', color: isDarkMode ? '#FFFFFF' : '#000000' }}>🎙️ MIC SETUP</Text>
        <TouchableOpacity 
          onPress={onAddMic} 
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, backgroundColor: isDarkMode ? '#FFFFFF' : '#000000' }}
        >
          <Feather name="plus" size={14} color={isDarkMode ? "#000000" : "#FFFFFF"} />
          <Text style={{ fontSize: 10, fontWeight: '600', color: isDarkMode ? '#000000' : '#FFFFFF' }}>Add Mic</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {allMics.map((mic) => (
            <View key={mic.id} style={{
              padding: 10,
              borderRadius: 12,
              minWidth: 110,
              backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
              borderWidth: 1,
              borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 15 }}>
                <Feather name="mic" size={14} color={mic.isActive ? (isDarkMode ? "#FFFFFF" : "#000000") : (isDarkMode ? "#9CA3AF" : "#6B7280")} />
                <Text style={{ fontSize: 10, fontWeight: '600', color: mic.isActive ? (isDarkMode ? '#FFFFFF' : '#000000') : (isDarkMode ? '#9CA3AF' : '#6B7280') }}>{mic.name}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                <TouchableOpacity 
                  onPress={() => onToggleActive(mic.id)} 
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6, borderRadius: 16, backgroundColor: mic.isActive ? (isDarkMode ? '#6B7280' : '#4B5563') : (isDarkMode ? '#4B5563' : '#9CA3AF') }}
                >
                  <Feather name={mic.isActive ? "pause-circle" : "mic"} size={12} color="#FFFFFF" />
                  <Text style={{ fontSize: 9, fontWeight: '600', color: '#FFFFFF' }}>{mic.isActive ? "ON AIR" : "OFF"}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => onToggleMute(mic.id)} 
                  style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: isDarkMode ? '#4B5563' : '#D1D5DB' }}
                >
                  <Feather name={mic.isMuted ? "mic-off" : "mic"} size={12} color={mic.isMuted ? "#FFFFFF" : (isDarkMode ? "#9CA3AF" : "#6B7280")} />
                </TouchableOpacity>
                {!mic.id.startsWith("mic1") && !mic.id.startsWith("mic2") && (
                  <TouchableOpacity onPress={() => onRemoveMic(mic.id)} style={{ paddingHorizontal: 8, paddingVertical: 6, borderRadius: 16, backgroundColor: isDarkMode ? '#6B7280' : '#9CA3AF' }}>
                    <Feather name="trash-2" size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>
              {/* PROGRESS BAR - FIXED AT 0% INITIAL STATE */}
              <View style={{ height: 3, borderRadius: 1.5, backgroundColor: isDarkMode ? '#4B5563' : '#D1D5DB', overflow: 'hidden' }}>
                <View style={{ 
                  height: '100%', 
                  borderRadius: 1.5, 
                  width: '0%',  // ← CHANGED: Always 0% initially
                  backgroundColor: isDarkMode ? '#6B7280' : '#9CA3AF' 
                }} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};