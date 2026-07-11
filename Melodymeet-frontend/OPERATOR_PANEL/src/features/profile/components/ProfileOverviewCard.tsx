import React from 'react';
import { View, Text, Image, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AuthContextInfo } from '../types';

interface Props {
  authContext: AuthContextInfo;
  data: any; // RJProfileData | PodcastProfileData
  isDark: boolean;
  isEditing: boolean;
  updateData: (key: string, value: string) => void;
}

const ProfileOverviewCard: React.FC<Props> = ({ authContext, data, isDark, isEditing, updateData }) => {
  const cardBg = isDark ? 'bg-[#111625] border-[#1B2234]' : 'bg-white border-[#E2E8F0]';
  const title = isDark ? 'text-[#F8FAFC]' : 'text-[#0F172A]';
  const sub = isDark ? 'text-[#94A3B8]' : 'text-[#475569]';
  const inputBg = isDark ? 'bg-[#080A10] border-[#1B2234] text-[#F8FAFC]' : 'bg-gray-50 border-gray-300 text-gray-800';

  return (
    <View className="px-5 mt-4">
      <View className={`rounded-2xl border p-5 ${cardBg}`}>
        <View className="flex-row items-center mb-4">
          {authContext.avatar ? (
            <Image source={{ uri: authContext.avatar }} className="w-20 h-20 rounded-full" />
          ) : (
            <View className="w-20 h-20 rounded-full bg-[#EEF2FF] items-center justify-center">
              <Text className="text-2xl font-bold text-[#4F6AF0]">{authContext.displayName.charAt(0)}</Text>
            </View>
          )}
          <View className="ml-4 flex-1">
            <Text className={`text-xl font-bold ${title}`}>{authContext.displayName}</Text>
            <Text className={`text-sm mt-0.5 ${sub}`}>@{authContext.username}</Text>
            <View className="bg-[#4F6AF0]/10 self-start px-2 py-1 rounded mt-1.5">
              <Text className="text-xs font-semibold text-[#4F6AF0]">{authContext.role}</Text>
            </View>
          </View>
        </View>

        <View className="mt-2">
          <Text className={`text-xs font-semibold mb-1 uppercase tracking-wider ${sub}`}>Tagline</Text>
          {isEditing ? (
            <TextInput
              className={`px-3 py-2 border rounded-lg ${inputBg}`}
              value={data.tagline || ''}
              onChangeText={(text) => updateData('tagline', text)}
              placeholder="Your short slogan"
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              maxLength={100}
            />
          ) : (
            <Text className={`text-sm italic ${title}`}>{data.tagline || 'No tagline added'}</Text>
          )}
        </View>

        <View className="mt-4">
          <Text className={`text-xs font-semibold mb-1 uppercase tracking-wider ${sub}`}>Bio</Text>
          {isEditing ? (
            <TextInput
              className={`px-3 py-2 border rounded-lg min-h-[80px] ${inputBg}`}
              value={data.bio || ''}
              onChangeText={(text) => updateData('bio', text)}
              placeholder="Write a short bio..."
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              multiline
              textAlignVertical="top"
              maxLength={500}
            />
          ) : (
            <Text className={`text-sm leading-relaxed ${title}`}>{data.bio || 'No bio added'}</Text>
          )}
        </View>
      </View>
    </View>
  );
};

export default ProfileOverviewCard;
