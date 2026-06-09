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
      flex: 1, borderRadius: 14, padding: 12, minWidth: 200,
      backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
      borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#E2E8F0',
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDarkMode ? 0.15 : 0.04, shadowRadius: 4, elevation: 2,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: isDarkMode ? '#F1F5F9' : '#0F172A' }}>
          🎙️ MIC SETUP
        </Text>
        <TouchableOpacity
          onPress={onAddMic}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#4F6AF0' }}
        >
          <Feather name="plus" size={13} color="#FFFFFF" />
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>Add Mic</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {allMics.map((mic) => (
            <View key={mic.id} style={{
              padding: 10, borderRadius: 12, minWidth: 110,
              backgroundColor: isDarkMode ? '#263347' : '#F8FAFC',
              borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#E2E8F0',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Feather name="mic" size={13}
                  color={mic.isActive ? (isDarkMode ? '#6B8EFF' : '#4F6AF0') : (isDarkMode ? '#64748B' : '#94A3B8')} />
                <Text style={{ fontSize: 10, fontWeight: '600',
                  color: mic.isActive ? (isDarkMode ? '#F1F5F9' : '#0F172A') : (isDarkMode ? '#64748B' : '#94A3B8') }}>
                  {mic.name}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 5, marginBottom: 8 }}>
                <TouchableOpacity
                  onPress={() => onToggleActive(mic.id)}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3,
                    paddingVertical: 6, borderRadius: 8,
                    backgroundColor: mic.isActive ? '#059669' : (isDarkMode ? '#334155' : '#E2E8F0') }}
                >
                  <Feather name={mic.isActive ? "pause-circle" : "mic"} size={11}
                    color={mic.isActive ? '#FFFFFF' : (isDarkMode ? '#94A3B8' : '#475569')} />
                  <Text style={{ fontSize: 9, fontWeight: '700',
                    color: mic.isActive ? '#FFFFFF' : (isDarkMode ? '#94A3B8' : '#475569') }}>
                    {mic.isActive ? "ON AIR" : "OFF"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onToggleMute(mic.id)}
                  style={{ paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8,
                    backgroundColor: mic.isMuted ? '#DC2626' : (isDarkMode ? '#334155' : '#E2E8F0') }}
                >
                  <Feather name={mic.isMuted ? "mic-off" : "mic"} size={11}
                    color={mic.isMuted ? '#FFFFFF' : (isDarkMode ? '#94A3B8' : '#475569')} />
                </TouchableOpacity>
                {!mic.id.startsWith("mic1") && !mic.id.startsWith("mic2") && (
                  <TouchableOpacity onPress={() => onRemoveMic(mic.id)}
                    style={{ paddingHorizontal: 7, paddingVertical: 6, borderRadius: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' }}>
                    <Feather name="trash-2" size={11} color="#DC2626" />
                  </TouchableOpacity>
                )}
              </View>
              {/* Level bar */}
              <View style={{ height: 3, borderRadius: 2, backgroundColor: isDarkMode ? '#334155' : '#E2E8F0', overflow: 'hidden' }}>
                <View style={{ height: '100%', borderRadius: 2, width: '0%', backgroundColor: '#059669' }} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};