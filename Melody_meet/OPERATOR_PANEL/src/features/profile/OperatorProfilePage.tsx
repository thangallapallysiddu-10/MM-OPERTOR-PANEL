import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAppStore } from '../../store/useAppStore';
import { useOperatorProfile } from './hooks/useOperatorProfile';
import { EditOperatorProfileModal } from './components/EditOperatorProfileModal';
import { formatCount, formatDate, openExternalUrl } from './utils/format';
import type { OperatorProfile, SocialLinks } from './types';
import { useAuth } from '../../context/AuthContext';

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

interface Person {
  id: string;
  name: string;
  role: string;
  followers: number;
  avatar: string | null;
  isLive?: boolean;
  joinedDate?: string;
  tagline?: string;
  bio?: string;
  location?: string;
  email?: string;
  genres?: string[];
  socialLinks?: SocialLinks;
}

// Sample listeners 
const sampleListeners: Person[] = [
  { id: '3', name: 'ChillVibes', role: 'Listener', followers: 0, avatar: null, joinedDate: '2 days ago' },
  { id: '4', name: 'NightOwl', role: 'Listener', followers: 0, avatar: null, joinedDate: '3 days ago' },
];

interface Props {
  navigation?: { navigate: (screen: string) => void };
}

const OperatorProfilePage: React.FC<Props> = ({ navigation }) => {
  const { profileDarkMode, setProfileDarkMode } = useAppStore();
  const isDark = profileDarkMode;
  const { user } = useAuth(); // Get logged-in user
  
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
  const [activeTab, setActiveTab] = useState<'rjs' | 'hosts' | 'listeners'>('rjs');
  
  // Create current user person from logged-in user data
  const getCurrentUserPerson = (): Person => ({
    id: user?.id || '1',
    name: user?.name || 'User',
    role: 'RJ',
    followers: metrics?.rjFollowers || 0,
    avatar: null,
    isLive: false,
    tagline: '',
    bio: '',
    location: '',
    email: user?.email || '',
    genres: [],
    socialLinks: {
      instagram: '',
      youtube: '',
      twitter: '',
      spotify: '',
      website: '',
      facebook: '',
    },
  });
  
  // Main state for RJs and Hosts 
  const [currentUserPerson] = useState<Person>(getCurrentUserPerson());
  const [rjsList, setRjsList] = useState<Person[]>([currentUserPerson]);
  const [hostsList, setHostsList] = useState<Person[]>([{ ...currentUserPerson, role: 'Podcast Host' }]);
  const [listenersList, setListenersList] = useState<Person[]>(sampleListeners);
  
  // Person Details Modal
  const [personDetailsModalVisible, setPersonDetailsModalVisible] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  
  // Avatar Modal
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [avatarPreviewUri, setAvatarPreviewUri] = useState<string | null>(null);
  const [tempAvatarUri, setTempAvatarUri] = useState<string | null>(null);
  
  // Edit Profile Modal (personal info)
  const [editInfoModalVisible, setEditInfoModalVisible] = useState(false);
  const [tempPersonData, setTempPersonData] = useState<Person | null>(null);

  const bg = isDark ? 'bg-[#0F172A]' : 'bg-[#F8FAFC]';
  const card = isDark ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0]';
  const title = isDark ? 'text-[#F1F5F9]' : 'text-[#0F172A]';
  const sub = isDark ? 'text-[#64748B]' : 'text-[#475569]';

  const profile = dashboard?.operatorProfile ?? defaultProfile();
  const displayName = profile.displayName || dashboard?.profileName || user?.name || 'Your RJ name';
  const initials =
    profile.avatarInitials ||
    displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'RJ';

  // Update both RJ and Host when data changes (sync)
  const updateSyncedPerson = (updatedData: Partial<Person>) => {
    setRjsList(prev => prev.map(rj => 
      rj.id === currentUserPerson.id ? { ...rj, ...updatedData } : rj
    ));
    setHostsList(prev => prev.map(host => 
      host.id === currentUserPerson.id ? { ...host, ...updatedData } : host
    ));
  };

  // Open Person Details Modal
  const openPersonDetails = (person: Person) => {
    setSelectedPerson(person);
    setPersonDetailsModalVisible(true);
  };

  // Open Avatar Modal
  const openAvatarModal = () => {
    setAvatarPreviewUri(selectedPerson?.avatar || null);
    setTempAvatarUri(selectedPerson?.avatar || null);
    setAvatarModalVisible(true);
  };

  // Change Photo - Open Gallery
  const changePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarPreviewUri(result.assets[0].uri);
      setTempAvatarUri(result.assets[0].uri);
    }
  };

  // Delete Photo
  const deletePhoto = () => {
    setAvatarPreviewUri(null);
    setTempAvatarUri(null);
  };

  // Apply Avatar Changes
  const applyAvatarChanges = () => {
    if (selectedPerson) {
      updateSyncedPerson({ avatar: tempAvatarUri });
      setSelectedPerson({ ...selectedPerson, avatar: tempAvatarUri });
      // Also update the profile in store
      if (selectedPerson.id === currentUserPerson.id) {
        saveProfile({ avatarUrl: tempAvatarUri || '' });
      }
    }
    setAvatarModalVisible(false);
  };

  // Open Edit Profile Info Modal
  const openEditInfoModal = () => {
    if (selectedPerson) {
      setTempPersonData({ ...selectedPerson });
      setEditInfoModalVisible(true);
    }
  };

  // Apply Edit Info Changes
  const applyInfoChanges = () => {
    if (tempPersonData) {
      updateSyncedPerson({
        name: tempPersonData.name,
        tagline: tempPersonData.tagline,
        bio: tempPersonData.bio,
        location: tempPersonData.location,
        email: tempPersonData.email,
        genres: tempPersonData.genres,
        socialLinks: tempPersonData.socialLinks,
      });
      setSelectedPerson(tempPersonData);
    }
    setEditInfoModalVisible(false);
  };

  // Update tempPersonData fields - Helper functions
  const updateTempPersonData = (key: keyof Person, value: any) => {
    if (tempPersonData) {
      setTempPersonData({ ...tempPersonData, [key]: value });
    }
  };

  const updateTempPersonGenres = (genre: string, isSelected: boolean) => {
    if (tempPersonData) {
      const newGenres = isSelected
        ? tempPersonData.genres?.filter(g => g !== genre) || []
        : [...(tempPersonData.genres || []), genre];
      setTempPersonData({ ...tempPersonData, genres: newGenres });
    }
  };

  const updateTempPersonSocialLink = (platform: string, value: string) => {
  if (tempPersonData) {
    setTempPersonData({
      ...tempPersonData,
      socialLinks: {
        instagram: tempPersonData.socialLinks?.instagram || '',
        youtube: tempPersonData.socialLinks?.youtube || '',
        twitter: tempPersonData.socialLinks?.twitter || '',
        spotify: tempPersonData.socialLinks?.spotify || '',
        website: tempPersonData.socialLinks?.website || '',
        facebook: tempPersonData.socialLinks?.facebook || '',
        [platform]: value,
      },
    });
  }
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
        {/* Header */}

        <View className={`px-5 pt-8 pb-4 border-b ${isDark ? 'border-[#334155]' : 'border-[#E2E8F0]'}`}>
          <View className="flex-row items-start justify-between mb-2">
            <View className="flex-1 pr-2">
              <Text className={`text-2xl font-bold tracking-tight ${title}`}>Profile</Text>
              <Text className={`text-sm mt-1 ${sub}`}>Manage your community</Text>
            </View>
            
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => setProfileDarkMode(!isDark)}
                className={`p-2.5 rounded-xl border ${card}`}
                
              >
                <Feather name={isDark ? 'sun' : 'moon'} size={17} color={isDark ? '#94A3B8' : '#475569'} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        

        {/* Tabs */}
        <View className="flex-row px-5 pt-4 gap-4 border-b border-[#E2E8F0]">
          <TouchableOpacity onPress={() => setActiveTab('rjs')} className="py-2">
            <Text className={`text-base font-semibold ${activeTab === 'rjs' ? 'text-[#4F6AF0] border-b-2 border-[#4F6AF0]' : sub}`}>
              RJs ({rjsList.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('hosts')} className="py-2">
            <Text className={`text-base font-semibold ${activeTab === 'hosts' ? 'text-[#4F6AF0] border-b-2 border-[#4F6AF0]' : sub}`}>
              Podcast Hosts ({hostsList.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('listeners')} className="py-2">
            <Text className={`text-base font-semibold ${activeTab === 'listeners' ? 'text-[#4F6AF0] border-b-2 border-[#4F6AF0]' : sub}`}>
              Listeners ({listenersList.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* RJs Tab */}
        {activeTab === 'rjs' && (
          <View className="px-5 pt-4">
            {rjsList.map((rj) => (
              <TouchableOpacity key={rj.id} onPress={() => openPersonDetails(rj)}>
                <View className={`flex-row items-center p-4 mb-3 rounded-2xl border ${card}`}>
                  <View className="flex-row items-center gap-3">
                    {rj.avatar ? (
                      <Image source={{ uri: rj.avatar }} className="w-12 h-12 rounded-full" />
                    ) : (
                      <View className="w-12 h-12 rounded-full bg-[#EEF2FF] items-center justify-center">
                        <Text className="text-lg font-bold text-[#4F6AF0]">{rj.name.charAt(0)}</Text>
                      </View>
                    )}
                    <View>
                      <View className="flex-row items-center gap-2">
                        <Text className={`font-semibold text-base ${title}`}>{rj.name}</Text>
                        {rj.isLive && (
                          <View className="bg-red-600 px-1.5 py-0.5 rounded-sm">
                            <Text className="text-white text-[8px] font-bold">LIVE</Text>
                          </View>
                        )}
                      </View>
                      <Text className={`text-xs mt-0.5 ${sub}`}>RJ · {formatCount(rj.followers)} followers</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Podcast Hosts Tab */}
        {activeTab === 'hosts' && (
          <View className="px-5 pt-4">
            {hostsList.map((host) => (
              <TouchableOpacity key={host.id} onPress={() => openPersonDetails(host)}>
                <View className={`flex-row items-center p-4 mb-3 rounded-2xl border ${card}`}>
                  <View className="flex-row items-center gap-3">
                    {host.avatar ? (
                      <Image source={{ uri: host.avatar }} className="w-12 h-12 rounded-full" />
                    ) : (
                      <View className="w-12 h-12 rounded-full bg-[#EEF2FF] items-center justify-center">
                        <Text className="text-lg font-bold text-[#4F6AF0]">{host.name.charAt(0)}</Text>
                      </View>
                    )}
                    <View>
                      <Text className={`font-semibold text-base ${title}`}>{host.name}</Text>
                      <Text className={`text-xs mt-0.5 ${sub}`}>Podcast Host · {formatCount(host.followers)} followers</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Listeners Tab */}
        {activeTab === 'listeners' && (
          <View className="px-5 pt-4">
            {listenersList.map((listener) => (
              <TouchableOpacity key={listener.id} onPress={() => openPersonDetails(listener)}>
                <View className={`flex-row items-center p-4 mb-3 rounded-2xl border ${card}`}>
                  <View className="flex-row items-center gap-3">
                    {listener.avatar ? (
                      <Image source={{ uri: listener.avatar }} className="w-12 h-12 rounded-full" />
                    ) : (
                      <View className="w-12 h-12 rounded-full bg-[#EEF2FF] items-center justify-center">
                        <Text className="text-lg font-bold text-[#4F6AF0]">{listener.name.charAt(0)}</Text>
                      </View>
                    )}
                    <View>
                      <Text className={`font-semibold text-base ${title}`}>{listener.name}</Text>
                      <Text className={`text-xs mt-0.5 ${sub}`}>Listener · Joined {listener.joinedDate}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Stats Section */}
        {hasProfile && (
          <>
            <View className="px-5 mt-6">
              <Text className={`text-lg font-bold mb-3 ${title}`}>Your Audience</Text>
              <View className="flex-row flex-wrap gap-3">
                <StatCard label="Followers" value={formatCount(metrics.rjFollowers)} icon="users" isDark={isDark} />
                <StatCard label="Listeners" value={formatCount(metrics.rjListeners)} icon="radio" isDark={isDark} />
                <StatCard label="Likes" value={formatCount(metrics.rjLikes)} icon="heart" isDark={isDark} />
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
          </>
        )}
      </ScrollView>

      {/* Person Details Modal */}
      <Modal
        visible={personDetailsModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPersonDetailsModalVisible(false)}
      >
        <View className="items-center justify-center flex-1 bg-black/80">
          <View className="bg-white rounded-2xl p-6 w-[85%] max-w-[350px] items-center">
            <TouchableOpacity
              className="absolute p-2 top-3 right-3"
              onPress={() => setPersonDetailsModalVisible(false)}
            >
              <Feather name="x" size={20} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity onPress={openAvatarModal} activeOpacity={0.8}>
              {selectedPerson?.avatar ? (
                <Image source={{ uri: selectedPerson.avatar }} className="w-24 h-24 mb-3 rounded-full" />
              ) : (
                <View className="w-24 h-24 rounded-full bg-[#EEF2FF] items-center justify-center mb-3">
                  <Text className="text-3xl font-bold text-[#4F6AF0]">
                    {selectedPerson?.name?.charAt(0) || 'U'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <Text className="text-xl font-bold text-gray-800">{selectedPerson?.name}</Text>
            <Text className="mt-1 text-sm text-gray-500">
              {selectedPerson?.role} · {formatCount(selectedPerson?.followers || 0)} followers
            </Text>

            {selectedPerson?.tagline && (
              <Text className="mt-3 text-sm text-center text-gray-600">{selectedPerson.tagline}</Text>
            )}

            {selectedPerson?.bio && (
              <Text className="mt-2 text-sm text-center text-gray-500">{selectedPerson.bio}</Text>
            )}

            <TouchableOpacity
              onPress={openEditInfoModal}
              className="mt-5 bg-[#4F6AF0] px-6 py-2.5 rounded-full"
            >
              <Text className="font-semibold text-white">Edit Profile Information</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPersonDetailsModalVisible(false)}
              className="px-6 py-2 mt-3 rounded-full"
            >
              <Text className="text-gray-500">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Avatar Modal */}
      <Modal
        visible={avatarModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <View className="items-center justify-center flex-1 bg-black/80">
          <View className="bg-white rounded-2xl p-6 w-[85%] max-w-[350px] items-center">
            <TouchableOpacity
              className="absolute p-2 top-3 right-3"
              onPress={() => setAvatarModalVisible(false)}
            >
              <Feather name="x" size={20} color="#666" />
            </TouchableOpacity>

            <Text className="mb-4 text-lg font-semibold text-gray-800">Profile photo</Text>

            <View className="w-32 h-32 rounded-full bg-[#EEF2FF] items-center justify-center mb-4 overflow-hidden">
              {avatarPreviewUri ? (
                <Image source={{ uri: avatarPreviewUri }} className="w-32 h-32" />
              ) : (
                <Feather name="user" size={40} color="#4F6AF0" />
              )}
            </View>

            <TouchableOpacity
              onPress={changePhoto}
              className="bg-[#4F6AF0] px-6 py-2.5 rounded-full mb-3 w-full items-center flex-row justify-center gap-2"
            >
              <Feather name="camera" size={16} color="#fff" />
              <Text className="font-semibold text-white">Change Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={deletePhoto}
              className="bg-red-500 px-6 py-2.5 rounded-full mb-4 w-full items-center"
            >
              <Text className="font-semibold text-white">Delete Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={applyAvatarChanges}
              className="bg-green-600 px-6 py-2.5 rounded-full w-full items-center"
            >
              <Text className="font-semibold text-white">✓ Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Information Modal */}
      <Modal
        visible={editInfoModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditInfoModalVisible(false)}
      >
        <View className="justify-end flex-1 bg-black/80">
          <View className="bg-white rounded-t-3xl p-6 h-[80%]">
            <View className="flex-row items-center justify-between pb-2 mb-4 border-b border-gray-200">
              <Text className="text-xl font-bold text-gray-800">Edit Profile Information</Text>
              <TouchableOpacity onPress={() => setEditInfoModalVisible(false)}>
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="mb-1 text-xs text-gray-500">Display Name</Text>
              <TextInput
                className="px-4 py-3 mb-3 text-gray-800 border border-gray-300 rounded-xl"
                value={tempPersonData?.name || ''}
                onChangeText={(text) => updateTempPersonData('name', text)}
                placeholder="Your name"
              />

              <Text className="mb-1 text-xs text-gray-500">Tagline</Text>
              <TextInput
                className="px-4 py-3 mb-3 text-gray-800 border border-gray-300 rounded-xl"
                value={tempPersonData?.tagline || ''}
                onChangeText={(text) => updateTempPersonData('tagline', text)}
                placeholder="Your on-air hook"
              />

              <Text className="mb-1 text-xs text-gray-500">Bio</Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 mb-3 text-gray-800 min-h-[80px]"
                value={tempPersonData?.bio || ''}
                onChangeText={(text) => updateTempPersonData('bio', text)}
                placeholder="Tell listeners about your show"
                multiline
                numberOfLines={3}
              />

              <Text className="mb-1 text-xs text-gray-500">Location</Text>
              <TextInput
                className="px-4 py-3 mb-3 text-gray-800 border border-gray-300 rounded-xl"
                value={tempPersonData?.location || ''}
                onChangeText={(text) => updateTempPersonData('location', text)}
                placeholder="City, Country"
              />

              <Text className="mb-1 text-xs text-gray-500">Email (public)</Text>
              <TextInput
                className="px-4 py-3 mb-3 text-gray-800 border border-gray-300 rounded-xl"
                value={tempPersonData?.email || ''}
                onChangeText={(text) => updateTempPersonData('email', text)}
                placeholder="email@example.com"
                keyboardType="email-address"
              />

              <Text className="mt-2 mb-2 text-sm font-semibold text-gray-800">Genres</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {['Pop', 'Rock', 'Hip-Hop', 'EDM', 'Bollywood', 'Talk', 'News', 'Chill'].map((g) => {
                  const isSelected = tempPersonData?.genres?.includes(g) || false;
                  return (
                    <TouchableOpacity
                      key={g}
                      onPress={() => updateTempPersonGenres(g, isSelected)}
                      className={`px-3 py-1.5 rounded-full border ${isSelected ? 'bg-[#4F6AF0] border-[#4F6AF0]' : 'border-gray-300'}`}
                    >
                      <Text className={isSelected ? 'text-white text-xs' : 'text-gray-600 text-xs'}>
                        {g}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text className="mt-2 mb-2 text-sm font-semibold text-gray-800">Social Links</Text>
              {['instagram', 'youtube', 'twitter', 'spotify', 'website', 'facebook'].map((platform) => (
                <View key={platform} className="mb-2">
                  <Text className="mb-1 text-xs text-gray-500 capitalize">{platform}</Text>
                  <TextInput
                    className="px-4 py-2 text-gray-800 border border-gray-300 rounded-xl"
                    value={tempPersonData?.socialLinks?.[platform as keyof SocialLinks] || ''}
                    onChangeText={(text) => updateTempPersonSocialLink(platform, text)}
                    placeholder=""
                  />
                </View>
              ))}

              <TouchableOpacity
                onPress={applyInfoChanges}
                className="py-3 mt-4 mb-8 bg-green-600 rounded-xl"
              >
                <Text className="font-semibold text-center text-white">✓ Apply Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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