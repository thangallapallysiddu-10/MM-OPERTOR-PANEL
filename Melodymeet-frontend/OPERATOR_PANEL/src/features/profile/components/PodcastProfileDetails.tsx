import React from 'react';
import { View, Text, TextInput } from 'react-native';
import type { PodcastProfileData } from '../types';

interface Props {
  data: PodcastProfileData;
  isDark: boolean;
  isEditing: boolean;
  updateData: (key: string, value: string) => void;
}

const PodcastProfileDetails: React.FC<Props> = ({ data, isDark, isEditing, updateData }) => {
  const cardBg = isDark ? 'bg-[#111625] border-[#1B2234]' : 'bg-white border-[#E2E8F0]';
  const titleColor = isDark ? 'text-[#F8FAFC]' : 'text-[#0F172A]';
  const subColor = isDark ? 'text-[#94A3B8]' : 'text-[#475569]';
  const inputBg = isDark ? 'bg-[#080A10] border-[#1B2234] text-[#F8FAFC]' : 'bg-gray-50 border-gray-300 text-gray-800';

  const renderField = (label: string, fieldKey: keyof PodcastProfileData, placeholder: string) => (
    <View className="mb-4">
      <Text className={`text-xs font-semibold mb-1 uppercase tracking-wider ${subColor}`}>{label}</Text>
      {isEditing ? (
        <TextInput
          className={`px-3 py-2 border rounded-lg ${inputBg}`}
          value={(data[fieldKey] as string) || ''}
          onChangeText={(text) => updateData(fieldKey, text)}
          placeholder={placeholder}
          placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
        />
      ) : (
        <Text className={`text-sm ${titleColor}`}>{data[fieldKey] || '—'}</Text>
      )}
    </View>
  );

  return (
    <View className="px-5 mt-6">
      <Text className={`text-lg font-bold mb-3 ${titleColor}`}>Podcast Details</Text>
      <View className={`rounded-2xl border p-5 ${cardBg}`}>
        {renderField('Podcast Name', 'podcastName', 'e.g., Tech Talks')}
        {renderField('Podcast Category', 'category', 'e.g., Technology')}
      </View>
    </View>
  );
};

export default PodcastProfileDetails;
