import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppStore } from '../../store/useAppStore';
import { useOperatorProfile } from './hooks/useOperatorProfile';
import { EditOperatorProfileModal } from './components/EditOperatorProfileModal';
import { formatCount, formatDate, openExternalUrl } from './utils/format';
import type { OperatorProfile, SocialLinks } from './types';
import { ProfileAvatarImage } from './components/ProfileAvatarImage';

const SOCIAL_META: { key: keyof SocialLinks; icon: keyof typeof Feather.glyphMap; label: string }[] = [
  { key: 'instagram', icon: 'instagram', label: 'Instagram' },
  { key: 'youtube', icon: 'youtube', label: 'YouTube' },
  { key: 'twitter', icon: 'twitter', label: 'X / Twitter' },
  { key: 'spotify', icon: 'music', label: 'Spotify' },
  { key: 'website', icon: 'globe', label: 'Website' },
  { key: 'facebook', icon: 'facebook', label: 'Facebook' },
];

const defaultProfile = (): OperatorProfile => ({
  displayName: '',
  tagline: '',
  bio: '',
  location: '',
  email: '',
  avatarUrl: '',
  avatarInitials: 'RJ',
  genres: [],
  languages: ['English'],
  timezone: '',
  socialLinks: { instagram: '', youtube: '', twitter: '', spotify: '', website: '', facebook: '' },
  requirements: {
    microphone: false,
    headphones: false,
    mixer: false,
    stableInternet: false,
    quietRoom: false,
    backupPower: false,
  },
  studioSetupNotes: '',
  podcastFollowers: 0,
  bestLiveEvents: [],
});

interface Props {
  navigation?: { navigate: (screen: string) => void };
}

const OperatorProfilePage: React.FC<Props> = ({ navigation }) => {
  const { profileDarkMode, setProfileDarkMode } = useAppStore();
  const isDark = profileDarkMode;
  const {
    dashboard,
    loading,
    saving,
    error,
    refresh,
    saveProfile,
    accountEmail,
    hasProfile,
    isNewProfile,
    metrics,
    bestLiveEvents,
    recentPodcasts,
  } = useOperatorProfile();
  const [showEdit, setShowEdit] = useState(false);

  const bg = isDark ? 'bg-[#0F172A]' : 'bg-[#F8FAFC]';
  const card = isDark ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0]';
  const title = isDark ? 'text-[#F1F5F9]' : 'text-[#0F172A]';
  const sub = isDark ? 'text-[#64748B]' : 'text-[#475569]';

  const profile = dashboard?.operatorProfile ?? defaultProfile();
  const displayName = profile.displayName || dashboard?.profileName || 'Your RJ name';
  const initials =
    profile.avatarInitials ||
    displayName
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ||
    'RJ';

  const openEdit = () => setShowEdit(true);

  const handleSave = async (patch: Partial<OperatorProfile>) => {
    const ok = await saveProfile(patch);
    if (ok) setShowEdit(false);
    return ok;
  };

  if (loading && !dashboard) {
    return (
      <View className={`flex-1 items-center justify-center ${bg}`}>
        <ActivityIndicator size="large" color="#4F6AF0" />
        <Text className={`mt-3 text-sm ${sub}`}>Loading profile…</Text>
      </View>
    );
  }

  return (
    <View className={`flex-1 ${bg}`}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-10"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#7c3aed" />}
      >
        <View className={`px-5 pt-8 pb-6 border-b ${isDark ? 'border-[#334155]' : 'border-[#E2E8F0]'}`}>
          <View className="flex-row items-start justify-between mb-4">
            <View className="flex-1 pr-2">
              <Text className={`text-2xl font-bold tracking-tight ${title}`}>RJ Profile</Text>
              <Text className={`text-sm mt-1 ${sub}`}>Your on-air identity</Text>
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => setProfileDarkMode(!isDark)}
                className={`p-2.5 rounded-xl border ${card}`}
              >
                <Feather name={isDark ? 'sun' : 'moon'} size={17} color={isDark ? '#94A3B8' : '#475569'} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={openEdit}
                className="bg-[#4F6AF0] px-4 py-2.5 rounded-xl flex-row items-center gap-2"
              >
                <Feather name={isNewProfile ? 'plus' : 'edit-2'} size={15} color="#fff" />
                <Text className="text-white font-semibold text-sm">{isNewProfile ? 'Create' : 'Edit'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {error ? (
            <View className={`rounded-2xl p-4 border mb-4 ${card}`}>
              <Text className="text-amber-500 text-sm">{error}</Text>
            </View>
          ) : null}

          {!hasProfile ? (
            <Pressable
              onPress={openEdit}
              className={`rounded-2xl border-2 border-dashed p-6 items-center mb-2 ${isDark ? 'border-[#4F6AF0]/50' : 'border-[#4F6AF0]/40'}`}
            >
              <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' }}>
                <Feather name="user-plus" size={24} color="#4F6AF0" />
              </View>
              <Text className={`text-base font-semibold mt-3 ${title}`}>Set up your RJ profile</Text>
              <Text className={`text-sm text-center mt-1 ${sub}`}>
                Add your photo, name, tagline, and bio.
              </Text>
              <View className="bg-[#4F6AF0] mt-4 px-5 py-2.5 rounded-xl">
                <Text className="text-white font-semibold">Create profile</Text>
              </View>
            </Pressable>
          ) : (
            <View className="items-center py-2">
              <TouchableOpacity onPress={openEdit} activeOpacity={0.85}>
                <ProfileAvatarImage
                  avatarUrl={profile.avatarUrl}
                  initials={initials}
                  sizeClass="w-28 h-28"
                />
              </TouchableOpacity>

              <View className="flex-row items-center gap-2 mt-4">
                <Text className={`text-2xl font-bold text-center ${title}`}>{displayName}</Text>
                {dashboard?.isLive ? (
                  <View className="bg-red-600 px-2 py-0.5 rounded-md">
                    <Text className="text-white text-[10px] font-bold">LIVE</Text>
                  </View>
                ) : null}
              </View>

              {profile.tagline ? (
                <Text className={`text-base text-center mt-2 px-4 ${sub}`}>{profile.tagline}</Text>
              ) : null}

              {(profile.location || accountEmail) ? (
                <Text className={`text-xs text-center mt-2 ${sub}`}>
                  {[profile.location, profile.email || accountEmail].filter(Boolean).join(' · ')}
                </Text>
              ) : null}

              {profile.bio ? (
                <Text className={`text-sm text-center mt-4 px-2 leading-5 ${sub}`}>{profile.bio}</Text>
              ) : null}

              {profile.genres.length > 0 ? (
                <View className="flex-row flex-wrap gap-2 mt-4 justify-center">
                  {profile.genres.map((g) => (
                    <View key={g} className="bg-[#EEF2FF] px-3 py-1 rounded-full">
                      <Text className="text-[#4F6AF0] text-xs font-medium">{g}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          )}
        </View>

        {hasProfile ? (
          <>
            <View className="px-5 mt-5">
              <Text className={`text-lg font-bold mb-3 ${title}`}>Audience</Text>
              <View className="flex-row flex-wrap gap-3">
                <StatCard label="RJ followers" value={formatCount(metrics.rjFollowers)} icon="users" isDark={isDark} />
                <StatCard
                  label="Podcast followers"
                  value={formatCount(metrics.podcastFollowers)}
                  icon="headphones"
                  isDark={isDark}
                />
                <StatCard label="Live listeners" value={formatCount(metrics.rjListeners)} icon="radio" isDark={isDark} />
                <StatCard label="Likes" value={formatCount(metrics.rjLikes)} icon="heart" isDark={isDark} />
                <StatCard label="Subscribers" value={formatCount(metrics.rjSubscribers)} icon="user-plus" isDark={isDark} />
                <StatCard label="Episodes" value={String(metrics.podcastEpisodes)} icon="mic" isDark={isDark} />
              </View>
            </View>

            <Section title="Social media" isDark={isDark}>
              {SOCIAL_META.some(({ key }) => profile.socialLinks[key]?.trim()) ? (
                SOCIAL_META.map(({ key, icon, label }) => {
                  const url = profile.socialLinks[key]?.trim();
                  if (!url) return null;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => openExternalUrl(url)}
                      className={`flex-row items-center gap-3 py-3 px-3 rounded-xl border mb-2 ${card}`}
                    >
                      <Feather name={icon} size={17} color="#4F6AF0" />
                      <Text className={`flex-1 text-sm ${title}`}>{label}</Text>
                      <Feather name="external-link" size={14} color="#94A3B8" />
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text className={`text-sm ${sub}`}>Add links in Edit profile.</Text>
              )}
            </Section>

            <Section title="Top live events" isDark={isDark}>
              {bestLiveEvents.length === 0 ? (
                <Text className={`text-sm ${sub}`}>Highlights appear here after you go live.</Text>
              ) : (
                bestLiveEvents.map((ev) => (
                  <View
                    key={`${ev.type}-${ev.id}`}
                    className={`flex-row items-center gap-3 py-3 border-b ${isDark ? 'border-[#334155]' : 'border-[#F1F5F9]'}`}
                  >
                    <Feather name={ev.type === 'podcast' ? 'headphones' : 'mic'} size={17} color="#4F6AF0" />
                    <View className="flex-1">
                      <Text className={`font-medium text-sm ${title}`}>{ev.title}</Text>
                      <Text className={`text-xs mt-0.5 ${sub}`}>
                        {formatDate(ev.date)} · peak {formatCount(ev.peakListeners)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </Section>

            <Section title="My podcasts" isDark={isDark} subtitle={`${metrics.podcastPublished} published`}>
              {recentPodcasts.length === 0 ? (
                <Text className={`text-sm ${sub}`}>No episodes yet.</Text>
              ) : (
                recentPodcasts.map((ep) => (
                  <View
                    key={String(ep.id)}
                    className={`py-3 border-b ${isDark ? 'border-[#334155]' : 'border-[#F1F5F9]'}`}
                  >
                    <Text className={`font-medium text-sm ${title}`}>{ep.title}</Text>
                    <Text className={`text-xs mt-0.5 ${sub}`}>{ep.status}</Text>
                  </View>
                ))
              )}
            </Section>

            <View className="px-5 mt-6 mb-4">
              <Pressable
                onPress={openEdit}
                className={`border rounded-2xl py-4 items-center ${isDark ? 'bg-[#EEF2FF]/10 border-[#4F6AF0]/30' : 'bg-[#EEF2FF] border-[#C7D2FE]'}`}
              >
                <Text className="text-[#4F6AF0] font-semibold text-sm">Edit profile</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>

      <EditOperatorProfileModal
        visible={showEdit}
        isDarkMode={isDark}
        profile={profile}
        saving={saving}
        onClose={() => setShowEdit(false)}
        onSave={handleSave}
      />
    </View>
  );
};

const StatCard: React.FC<{
  label: string;
  value: string;
  icon: keyof typeof Feather.glyphMap;
  isDark: boolean;
}> = ({ label, value, icon, isDark }) => (
  <View
    className={`min-w-[46%] flex-1 rounded-2xl border p-4 ${isDark ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0]'}`}
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

const Section: React.FC<{
  title: string;
  subtitle?: string;
  isDark: boolean;
  children: React.ReactNode;
}> = ({ title, subtitle, isDark, children }) => (
  <View className="px-5 mt-5">
    <View className="flex-row items-baseline justify-between mb-3">
      <Text className={`text-base font-bold ${isDark ? 'text-[#F1F5F9]' : 'text-[#0F172A]'}`}>{title}</Text>
      {subtitle ? <Text className={`text-xs ${isDark ? 'text-[#64748B]' : 'text-[#94A3B8]'}`}>{subtitle}</Text> : null}
    </View>
    <View
      className={`rounded-2xl border p-4 ${isDark ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0]'}`}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.15 : 0.04,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      {children}
    </View>
  </View>
);

export default OperatorProfilePage;
