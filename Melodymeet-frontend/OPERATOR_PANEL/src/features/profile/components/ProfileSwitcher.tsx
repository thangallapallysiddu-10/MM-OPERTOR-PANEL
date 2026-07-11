import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';

interface Props {
  activeTab: 'RJ' | 'PODCAST';
  setActiveTab: (tab: 'RJ' | 'PODCAST') => void;
  isDark: boolean;
  disabled: boolean;
}

const ProfileSwitcher: React.FC<Props> = ({ activeTab, setActiveTab, isDark, disabled }) => {
  const bg = isDark ? 'bg-[#111625] border-[#1B2234]' : 'bg-white border-[#E2E8F0]';
  const activeBg = '#4F6AF0';
  const textInactive = isDark ? 'text-[#94A3B8]' : 'text-[#475569]';

  return (
    <View className="px-5 pt-6 pb-2">
      <View className={`flex-row p-1 rounded-xl border ${bg}`}>
        <TouchableOpacity
          className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'RJ' ? 'bg-[#4F6AF0]' : ''}`}
          onPress={() => !disabled && setActiveTab('RJ')}
          disabled={disabled}
        >
          <Text className={`font-semibold ${activeTab === 'RJ' ? 'text-white' : textInactive}`}>RJ Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'PODCAST' ? 'bg-[#4F6AF0]' : ''}`}
          onPress={() => !disabled && setActiveTab('PODCAST')}
          disabled={disabled}
        >
          <Text className={`font-semibold ${activeTab === 'PODCAST' ? 'text-white' : textInactive}`}>Podcast Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ProfileSwitcher;
