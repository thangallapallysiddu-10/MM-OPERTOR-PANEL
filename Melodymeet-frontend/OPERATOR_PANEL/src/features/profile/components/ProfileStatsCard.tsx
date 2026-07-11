import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { RJProfileStats, PodcastProfileStats } from '../types';
import { formatCount } from '../utils/format';

interface Props {
  type: 'RJ' | 'PODCAST';
  stats: RJProfileStats | PodcastProfileStats;
  isDark: boolean;
}

const StatItem: React.FC<{ label: string; value: string; icon: keyof typeof Feather.glyphMap; isDark: boolean }> = ({ label, value, icon, isDark }) => (
  <View
    className={`min-w-[46%] flex-1 rounded-2xl border p-4 ${isDark ? 'bg-[#111625] border-[#1B2234]' : 'bg-white border-[#E2E8F0]'}`}
    style={{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.15 : 0.04,
      shadowRadius: 4,
      elevation: 2,
    }}
  >
    <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' }}>
      <Feather name={icon} size={16} color="#4F6AF0" />
    </View>
    <Text className={`text-xl font-bold mt-3 ${isDark ? 'text-[#F1F5F9]' : 'text-[#0F172A]'}`}>{value}</Text>
    <Text className={`text-xs mt-1 ${isDark ? 'text-[#64748B]' : 'text-[#94A3B8]'}`}>{label}</Text>
  </View>
);

const ProfileStatsCard: React.FC<Props> = ({ type, stats, isDark }) => {
  const title = isDark ? 'text-[#F8FAFC]' : 'text-[#0F172A]';

  return (
    <View className="px-5 mt-6">
      <Text className={`text-lg font-bold mb-3 ${title}`}>Performance Stats</Text>
      <View className="flex-row flex-wrap gap-3">
        {type === 'RJ' ? (
          <>
            <StatItem label="Shows Hosted" value={formatCount((stats as RJProfileStats).showsHosted)} icon="radio" isDark={isDark} />
            <StatItem label="Hours Broadcast" value={formatCount((stats as RJProfileStats).hoursBroadcast)} icon="clock" isDark={isDark} />
            <StatItem label="Followers" value={formatCount((stats as RJProfileStats).followers)} icon="users" isDark={isDark} />
            <StatItem label="Total Listeners" value={formatCount((stats as RJProfileStats).totalListeners)} icon="headphones" isDark={isDark} />
          </>
        ) : (
          <>
            <StatItem label="Episodes" value={formatCount((stats as PodcastProfileStats).episodes)} icon="mic" isDark={isDark} />
            <StatItem label="Downloads" value={formatCount((stats as PodcastProfileStats).downloads)} icon="download" isDark={isDark} />
            <StatItem label="Subscribers" value={formatCount((stats as PodcastProfileStats).subscribers)} icon="users" isDark={isDark} />
            <StatItem label="Average Rating" value={String((stats as PodcastProfileStats).averageRating)} icon="star" isDark={isDark} />
          </>
        )}
      </View>
    </View>
  );
};

export default ProfileStatsCard;
