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
      <TouchableOpacity className="items-end justify-start flex-1 pt-20 pr-4 bg-black/70" activeOpacity={1} onPress={onClose}>
        <View className={`${isMobile ? 'w-[320px]' : 'w-[360px]'} rounded-2xl p-5 border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333333]' : 'bg-white border-[#E0E0E0]'}`}>
          
          {/* Header */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>Settings</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color={isDarkMode ? '#888888' : '#999999'} />
            </TouchableOpacity>
          </View>

          <View className={`h-px my-4 ${isDarkMode ? 'bg-[#333333]' : 'bg-[#E0E0E0]'}`} />

          {/* Dark Mode */}
          <View className="flex-row items-center justify-between mb-5">
            <View className="flex-row items-center gap-3">
              <Feather name="moon" size={20} color={isDarkMode ? '#FFFFFF' : '#000000'} />
              <Text className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-black'}`}>Dark Mode</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={onDarkModeChange}
              trackColor={{ false: isDarkMode ? '#333333' : '#E0E0E0', true: isDarkMode ? '#666666' : '#999999' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Push Notifications */}
          <View className="flex-row items-center justify-between mb-5">
            <View className="flex-row items-center gap-3">
              <Feather name="bell" size={20} color={isDarkMode ? '#FFFFFF' : '#000000'} />
              <Text className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-black'}`}>Push Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={onNotificationsChange}
              trackColor={{ false: isDarkMode ? '#333333' : '#E0E0E0', true: isDarkMode ? '#666666' : '#999999' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Stream Quality */}
          <View className="mb-5">
            <TouchableOpacity 
              className="flex-row items-center justify-between"
              onPress={() => setShowQualityOptions(!showQualityOptions)}
            >
              <View className="flex-row items-center gap-3">
                <Feather name="cpu" size={20} color={isDarkMode ? '#FFFFFF' : '#000000'} />
                <Text className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-black'}`}>Stream Quality</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Text className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{quality}</Text>
                <Feather name={showQualityOptions ? "chevron-up" : "chevron-down"} size={18} color={isDarkMode ? '#888888' : '#999999'} />
              </View>
            </TouchableOpacity>
            
            {showQualityOptions && (
              <View className={`mt-2 ml-8 rounded-lg p-2 ${isDarkMode ? 'bg-[#2A2A2A]' : 'bg-gray-100'}`}>
                {qualityOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    className="px-4 py-3 rounded-lg"
                    onPress={() => {
                      onQualityChange(option);
                      setShowQualityOptions(false);
                    }}
                  >
                    <Text className={`text-sm ${option === quality ? (isDarkMode ? 'text-white font-bold' : 'text-black font-bold') : (isDarkMode ? 'text-gray-400' : 'text-gray-600')}`}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View className={`h-px my-4 ${isDarkMode ? 'bg-[#333333]' : 'bg-[#E0E0E0]'}`} />

          {/* Help & Support */}
          <TouchableOpacity 
            className="flex-row items-center justify-between py-2"
            onPress={handleHelpSupport}
          >
            <View className="flex-row items-center gap-3">
              <Feather name="help-circle" size={20} color={isDarkMode ? '#888888' : '#999999'} />
              <Text className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-black'}`}>Help & Support</Text>
            </View>
            <Feather name="chevron-right" size={18} color={isDarkMode ? '#888888' : '#999999'} />
          </TouchableOpacity>

        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default SettingsModal;