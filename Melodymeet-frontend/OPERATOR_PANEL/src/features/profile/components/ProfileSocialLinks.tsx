import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { SocialLinks } from '../types';
import { openExternalUrl } from '../utils/format';

interface Props {
  socialLinks: SocialLinks;
  isDark: boolean;
  isEditing: boolean;
  updateLink: (platform: string, value: string) => void;
}

const SOCIAL_META: { key: keyof SocialLinks; icon: keyof typeof Feather.glyphMap; label: string }[] = [
  { key: 'instagram', icon: 'instagram', label: 'Instagram' },
  { key: 'youtube', icon: 'youtube', label: 'YouTube' },
  { key: 'twitter', icon: 'twitter', label: 'X / Twitter' },
  { key: 'spotify', icon: 'music', label: 'Spotify' },
  { key: 'website', icon: 'globe', label: 'Website' },
  { key: 'facebook', icon: 'facebook', label: 'Facebook' },
  { key: 'linkedin', icon: 'linkedin', label: 'LinkedIn' },
  { key: 'applePodcast', icon: 'mic', label: 'Apple Podcasts' },
];

const ProfileSocialLinks: React.FC<Props> = ({ socialLinks, isDark, isEditing, updateLink }) => {
  const cardBg = isDark ? 'bg-[#111625] border-[#1B2234]' : 'bg-white border-[#E2E8F0]';
  const titleColor = isDark ? 'text-[#F8FAFC]' : 'text-[#0F172A]';
  const subColor = isDark ? 'text-[#94A3B8]' : 'text-[#475569]';
  const inputBg = isDark ? 'bg-[#080A10] border-[#1B2234] text-[#F8FAFC]' : 'bg-gray-50 border-gray-300 text-gray-800';

  return (
    <View className="px-5 mt-6">
      <Text className={`text-lg font-bold mb-3 ${titleColor}`}>Social Links</Text>
      
      {isEditing ? (
        <View className={`rounded-2xl border p-5 ${cardBg}`}>
          {SOCIAL_META.map(({ key, icon, label }) => (
            <View key={key} className="mb-4">
              <View className="flex-row items-center gap-2 mb-1">
                <Feather name={icon} size={14} color="#4F6AF0" />
                <Text className={`text-xs font-semibold uppercase tracking-wider ${subColor}`}>{label}</Text>
              </View>
              <TextInput
                className={`px-3 py-2 border rounded-lg ${inputBg}`}
                value={socialLinks[key] || ''}
                onChangeText={(text) => updateLink(key, text)}
                placeholder={`https://${key}.com/yourprofile`}
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>
          ))}
        </View>
      ) : (
        <View className={`rounded-2xl border p-2 ${cardBg}`}>
          {SOCIAL_META.some(({ key }) => socialLinks[key]?.trim()) ? (
            SOCIAL_META.map(({ key, icon, label }) => {
              const url = socialLinks[key]?.trim();
              if (!url) return null;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => openExternalUrl(url)}
                  className={`flex-row items-center gap-3 py-3 px-3 rounded-xl border mb-2 ${cardBg}`}
                >
                  <Feather name={icon} size={17} color="#4F6AF0" />
                  <Text className={`flex-1 text-sm ${titleColor}`}>{label}</Text>
                  <Feather name="external-link" size={14} color="#94A3B8" />
                </TouchableOpacity>
              );
            })
          ) : (
            <Text className={`text-sm p-3 ${subColor}`}>No links added yet.</Text>
          )}
        </View>
      )}
    </View>
  );
};

export default ProfileSocialLinks;
