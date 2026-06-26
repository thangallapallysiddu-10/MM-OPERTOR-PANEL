import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Switch } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface SettingsModalProps {
  visible: boolean;
  isDarkMode: boolean;
  colors: any;
  onClose: () => void;
  onToggleDarkMode: (value: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  visible, 
  isDarkMode, 
  colors, 
  onClose, 
  onToggleDarkMode 
}) => {
  const [autoAcceptRequests, setAutoAcceptRequests] = useState(false);
  const [crossfadeDuration, setCrossfadeDuration] = useState(2);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{
          width: '90%',
          maxWidth: 420,
          borderRadius: 16,
          borderWidth: 1,
          padding: 20,
          backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
          borderColor: isDarkMode ? '#334155' : '#E2E8F0',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.3 : 0.08,
          shadowRadius: 16,
          elevation: 8,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: isDarkMode ? '#F1F5F9' : '#0F172A' }}>Settings</Text>
            <TouchableOpacity
              onPress={onClose}
              style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: isDarkMode ? '#263347' : '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}
            >
              <Feather name="x" size={15} color={isDarkMode ? '#94A3B8' : '#475569'} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
            {/* Dark Mode */}
            <View style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#334155' : '#E2E8F0' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, gap: 3, paddingRight: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: isDarkMode ? '#F1F5F9' : '#0F172A' }}>Dark Mode</Text>
                  <Text style={{ fontSize: 11, color: isDarkMode ? '#64748B' : '#94A3B8' }}>Switch theme</Text>
                </View>
                <Switch
                  value={isDarkMode}
                  onValueChange={onToggleDarkMode}
                  trackColor={{ false: '#E2E8F0', true: '#4F6AF0' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* Crossfade Speed */}
            <View style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#334155' : '#E2E8F0' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <View style={{ flex: 1, gap: 3, paddingRight: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: isDarkMode ? '#F1F5F9' : '#0F172A' }}>Crossfade Speed</Text>
                  <Text style={{ fontSize: 11, color: isDarkMode ? '#64748B' : '#94A3B8' }}>Transition speed (1–5 seconds)</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                  {[1, 2, 3, 4, 5].map(sec => (
                    <TouchableOpacity
                      key={sec}
                      onPress={() => setCrossfadeDuration(sec)}
                      style={{
                        width: 36, paddingVertical: 7, borderRadius: 8, alignItems: 'center',
                        backgroundColor: crossfadeDuration === sec
                          ? '#4F6AF0'
                          : (isDarkMode ? '#263347' : '#F1F5F9'),
                        borderWidth: 1,
                        borderColor: crossfadeDuration === sec ? '#4F6AF0' : (isDarkMode ? '#334155' : '#E2E8F0'),
                      }}
                    >
                      <Text style={{
                        fontSize: 11, fontWeight: '600',
                        color: crossfadeDuration === sec ? '#FFFFFF' : (isDarkMode ? '#94A3B8' : '#475569'),
                      }}>{sec}s</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Auto-accept requests */}
            <View style={{ paddingVertical: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, gap: 3, paddingRight: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: isDarkMode ? '#F1F5F9' : '#0F172A' }}>Auto-accept requests</Text>
                  <Text style={{ fontSize: 11, color: isDarkMode ? '#64748B' : '#94A3B8' }}>Auto play requested songs</Text>
                </View>
                <Switch
                  value={autoAcceptRequests}
                  onValueChange={setAutoAcceptRequests}
                  trackColor={{ false: '#E2E8F0', true: '#059669' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};