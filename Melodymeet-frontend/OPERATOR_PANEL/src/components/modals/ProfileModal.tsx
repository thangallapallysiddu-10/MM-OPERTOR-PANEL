import React from 'react';
import { View, Text, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
  userName: string;
  userEmail: string;
  userAvatar: string;
  isDarkMode: boolean;
}

const ProfileModal: React.FC<ProfileModalProps> = ({
  visible,
  onClose,
  onNavigate,
  userName,
  userEmail,
  userAvatar,
  isDarkMode,
}) => {
  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity className="items-end justify-start flex-1 pt-20 pr-4 bg-black/70" activeOpacity={1} onPress={onClose}>
        <View className={`${isMobile ? 'w-[280px]' : 'w-[320px]'} rounded-2xl p-4 border shadow-md ${isDarkMode ? 'bg-[#1E1E1E] border-[#333333]' : 'bg-white border-[#E0E0E0]'}`}>
          <View className="flex-row items-center gap-3 mb-4">
            <View className={`w-12 h-12 rounded-full justify-center items-center ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`}>
              <Text className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{userAvatar}</Text>
            </View>
            <View>
              <Text className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>{userName}</Text>
              <Text className={`text-xs mt-0.5 ${isDarkMode ? 'text-[#888888]' : 'text-[#999999]'}`}>{userEmail}</Text>
            </View>
          </View>

          <View className={`h-px my-3 ${isDarkMode ? 'bg-[#333333]' : 'bg-[#E0E0E0]'}`} />

          <TouchableOpacity 
            className="flex-row items-center gap-3 py-3"
            onPress={() => {
              onClose();
              onNavigate('RJStudio');
            }}
          >
            <Feather name="mic" size={20} color={isDarkMode ? '#FFFFFF' : '#000000'} />
            <Text className={`flex-1 text-sm font-medium ${isDarkMode ? 'text-white' : 'text-black'}`}>RJ Studio</Text>
            <Feather name="chevron-right" size={18} color={isDarkMode ? '#888888' : '#999999'} />
          </TouchableOpacity>

          <TouchableOpacity 
            className="flex-row items-center gap-3 py-3"
            onPress={() => {
              onClose();
              onNavigate('Podcast');
            }}
          >
            <Feather name="headphones" size={20} color={isDarkMode ? '#FFFFFF' : '#000000'} />
            <Text className={`flex-1 text-sm font-medium ${isDarkMode ? 'text-white' : 'text-black'}`}>Podcast Studio</Text>
            <Feather name="chevron-right" size={18} color={isDarkMode ? '#888888' : '#999999'} />
          </TouchableOpacity>



          <View className={`h-px my-3 ${isDarkMode ? 'bg-[#333333]' : 'bg-[#E0E0E0]'}`} />
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default ProfileModal;