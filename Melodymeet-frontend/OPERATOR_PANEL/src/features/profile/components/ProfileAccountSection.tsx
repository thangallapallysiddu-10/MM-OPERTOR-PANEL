import React from 'react';
import { View, Text } from 'react-native';
import type { AuthContextInfo } from '../types';
import { formatDate } from '../utils/format';

interface Props {
  authContext: AuthContextInfo;
  isDark: boolean;
}

const ProfileAccountSection: React.FC<Props> = ({ authContext, isDark }) => {
  const cardBg = isDark ? 'bg-[#111625] border-[#1B2234]' : 'bg-white border-[#E2E8F0]';
  const titleColor = isDark ? 'text-[#F8FAFC]' : 'text-[#0F172A]';
  const subColor = isDark ? 'text-[#94A3B8]' : 'text-[#475569]';

  const renderRow = (label: string, value: string) => (
    <View className={`flex-row justify-between py-3 border-b ${isDark ? 'border-[#1B2234]' : 'border-[#F1F5F9]'}`}>
      <Text className={`text-sm ${subColor}`}>{label}</Text>
      <Text className={`text-sm font-semibold ${titleColor}`}>{value}</Text>
    </View>
  );

  return (
    <View className="px-5 mt-6 mb-10">
      <Text className={`text-lg font-bold mb-3 ${titleColor}`}>Account Information</Text>
      <View className={`rounded-2xl border px-5 py-2 ${cardBg}`}>
        {renderRow('Username', `@${authContext.username}`)}
        {renderRow('Email', authContext.email)}
        {renderRow('Role', authContext.role)}
        {renderRow('Member Since', formatDate(authContext.memberSince))}
        <View className="flex-row justify-between py-3">
          <Text className={`text-sm ${subColor}`}>Last Login</Text>
          <Text className={`text-sm font-semibold ${titleColor}`}>{formatDate(authContext.lastLogin)}</Text>
        </View>
      </View>
      <Text className={`text-xs mt-2 text-center ${subColor}`}>Account identity fields are managed securely by your authentication provider and are read-only.</Text>
    </View>
  );
};

export default ProfileAccountSection;
