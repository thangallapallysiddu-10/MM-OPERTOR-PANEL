import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Dimensions, Switch, Alert, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const isWeb = Platform.OS === 'web';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  darkMode: boolean;
  onDarkModeChange: (value: boolean) => void;
  notifications: boolean;
  onNotificationsChange: (value: boolean) => void;
  quality: string;
  onQualityChange: (quality: string) => void;
  onHelpSupport: () => void;
  isDarkMode: boolean;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  darkMode,
  onDarkModeChange,
  notifications,
  onNotificationsChange,
  quality,
  onQualityChange,
  onHelpSupport,
  isDarkMode,
}) => {
  const qualityOptions = ['Auto', 'Low', 'Medium', 'High', 'Lossless'];
  const [showQualityOptions, setShowQualityOptions] = useState(false);

  const handleHelpSupport = () => {
    const message = 'Contact support at support@melodymeet.com\n\nOr visit our website: www.melodymeet.com';
    if (isWeb) {
      window.alert(message);
    } else {
      Alert.alert('Help & Support', message);
    }
    onHelpSupport();
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity className="items-end justify-start flex-1 pt-20 pr-4 bg-black/60" activeOpacity={1} onPress={onClose}>
        <View style={{
          width: isMobile ? 320 : 360,
          borderRadius: 16,
          padding: 18,
          borderWidth: 1,
          backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
          borderColor: isDarkMode ? '#334155' : '#E2E8F0',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 8,
        }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: isDarkMode ? '#F1F5F9' : '#0F172A' }}>Settings</Text>
            <TouchableOpacity
              onPress={onClose}
              style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: isDarkMode ? '#263347' : '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}
            >
              <Feather name="x" size={14} color={isDarkMode ? '#94A3B8' : '#475569'} />
            </TouchableOpacity>
          </View>

          <View style={{ height: 1, marginBottom: 14, backgroundColor: isDarkMode ? '#334155' : '#E2E8F0' }} />

          {/* Dark Mode */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#334155' : '#E2E8F0' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Feather name="moon" size={17} color={isDarkMode ? '#94A3B8' : '#475569'} />
              <Text style={{ fontSize: 14, color: isDarkMode ? '#F1F5F9' : '#0F172A' }}>Dark Mode</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={onDarkModeChange}
              trackColor={{ false: '#E2E8F0', true: '#4F6AF0' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Push Notifications */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#334155' : '#E2E8F0' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Feather name="bell" size={17} color={isDarkMode ? '#94A3B8' : '#475569'} />
              <Text style={{ fontSize: 14, color: isDarkMode ? '#F1F5F9' : '#0F172A' }}>Push Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={onNotificationsChange}
              trackColor={{ false: '#E2E8F0', true: '#059669' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Stream Quality */}
          <View style={{ marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#334155' : '#E2E8F0' }}>
            <TouchableOpacity
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
              onPress={() => setShowQualityOptions(!showQualityOptions)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Feather name="cpu" size={17} color={isDarkMode ? '#94A3B8' : '#475569'} />
                <Text style={{ fontSize: 14, color: isDarkMode ? '#F1F5F9' : '#0F172A' }}>Stream Quality</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 12, color: isDarkMode ? '#64748B' : '#94A3B8' }}>{quality}</Text>
                <Feather name={showQualityOptions ? 'chevron-up' : 'chevron-down'} size={13} color={isDarkMode ? '#64748B' : '#94A3B8'} />
              </View>
            </TouchableOpacity>

            {showQualityOptions && (
              <View style={{ marginTop: 8, paddingLeft: 26, gap: 2 }}>
                {qualityOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={{
                      paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8,
                      backgroundColor: option === quality ? (isDarkMode ? '#1E3A8A30' : '#EEF2FF') : 'transparent',
                    }}
                    onPress={() => { onQualityChange(option); setShowQualityOptions(false); }}
                  >
                    <Text style={{ fontSize: 13, color: option === quality ? '#4F6AF0' : (isDarkMode ? '#94A3B8' : '#475569'), fontWeight: option === quality ? '600' : '400' }}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Help & Support */}
          <TouchableOpacity
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}
            onPress={handleHelpSupport}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Feather name="help-circle" size={17} color={isDarkMode ? '#94A3B8' : '#475569'} />
              <Text style={{ fontSize: 14, color: isDarkMode ? '#F1F5F9' : '#0F172A' }}>Help & Support</Text>
            </View>
            <Feather name="chevron-right" size={13} color={isDarkMode ? '#64748B' : '#94A3B8'} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default SettingsModal;