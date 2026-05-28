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
          backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
          borderColor: isDarkMode ? '#374151' : '#E5E7EB',
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDarkMode ? '#FFFFFF' : '#000000' }}>Settings</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={{ maxHeight: 500 }}>
            {/* Dark Mode */}
            <View style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#374151' : '#E5E7EB' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, gap: 4, paddingRight: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: isDarkMode ? '#FFFFFF' : '#000000' }}>Dark Mode</Text>
                  <Text style={{ fontSize: 11, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>Switch theme</Text>
                </View>
                <Switch 
                  value={isDarkMode} 
                  onValueChange={onToggleDarkMode} 
                  trackColor={{ false: "#D1D5DB", true: "#6B7280" }}
                  thumbColor="#FFFFFF" 
                />
              </View>
            </View>

            {/* Crossfade Speed */}
            <View style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#374151' : '#E5E7EB' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <View style={{ flex: 1, gap: 4, paddingRight: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: isDarkMode ? '#FFFFFF' : '#000000' }}>Crossfade Speed</Text>
                  <Text style={{ fontSize: 11, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>Transition speed (1-5 seconds)</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  {[1, 2, 3, 4, 5].map(sec => (
                    <TouchableOpacity 
                      key={sec} 
                      onPress={() => setCrossfadeDuration(sec)} 
                      style={{
                        width: 40,
                        paddingVertical: 8,
                        borderRadius: 8,
                        alignItems: 'center',
                        backgroundColor: crossfadeDuration === sec 
                          ? (isDarkMode ? '#FFFFFF' : '#000000')
                          : (isDarkMode ? '#374151' : '#F3F4F6'),
                      }}
                    >
                      <Text style={{
                        fontSize: 12,
                        fontWeight: '500',
                        color: crossfadeDuration === sec 
                          ? (isDarkMode ? '#000000' : '#FFFFFF')
                          : (isDarkMode ? '#FFFFFF' : '#000000'),
                      }}>{sec}s</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Auto-accept requests */}
            <View style={{ paddingVertical: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, gap: 4, paddingRight: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: isDarkMode ? '#FFFFFF' : '#000000' }}>Auto-accept requests</Text>
                  <Text style={{ fontSize: 11, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>Auto play requested songs</Text>
                </View>
                <Switch 
                  value={autoAcceptRequests} 
                  onValueChange={setAutoAcceptRequests} 
                  trackColor={{ false: "#D1D5DB", true: "#6B7280" }}
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