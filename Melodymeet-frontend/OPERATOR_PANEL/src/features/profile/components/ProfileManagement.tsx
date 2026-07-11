import React, { useState } from 'react';
import { View, ScrollView, ActivityIndicator, Text } from 'react-native';
import { useOperatorProfile } from '../hooks/useOperatorProfile';
import { useAppStore } from '../../../store/useAppStore';
import ProfileSwitcher from './ProfileSwitcher';
import ProfileOverviewCard from './ProfileOverviewCard';
import ProfileStatsCard from './ProfileStatsCard';
import ProfileProfessionalDetails from './ProfileProfessionalDetails';
import RJProfileDetails from './RJProfileDetails';
import PodcastProfileDetails from './PodcastProfileDetails';
import ProfileSocialLinks from './ProfileSocialLinks';
import ProfileAccountSection from './ProfileAccountSection';
import ProfileActionBar from './ProfileActionBar';
import type { RJProfileData, PodcastProfileData } from '../types';

const ProfileManagement: React.FC = () => {
  const { profileDarkMode } = useAppStore();
  const isDark = profileDarkMode;
  const bg = isDark ? 'bg-[#080A10]' : 'bg-[#F8FAFC]';
  const sub = isDark ? 'text-[#94A3B8]' : 'text-[#475569]';

  const {
    rjProfile,
    podcastProfile,
    authContext,
    loading,
    saving,
    saveRJProfile,
    savePodcastProfile,
  } = useOperatorProfile();

  const [activeTab, setActiveTab] = useState<'RJ' | 'PODCAST'>('RJ');

  // Local state for editing
  const [editingRJ, setEditingRJ] = useState<RJProfileData | null>(null);
  const [editingPodcast, setEditingPodcast] = useState<PodcastProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  if (loading) {
    return (
      <View className={`flex-1 items-center justify-center ${bg}`}>
        <ActivityIndicator size="large" color="#4F6AF0" />
        <Text className={`mt-3 text-sm ${sub}`}>Loading profile…</Text>
      </View>
    );
  }

  if (!authContext) {
    return (
      <View className={`flex-1 items-center justify-center ${bg}`}>
        <Text className={`mt-3 text-sm ${sub}`}>Authentication context missing.</Text>
      </View>
    );
  }

  const handleEdit = () => {
    setIsEditing(true);
    setEditingRJ(rjProfile?.rjProfileData || {});
    setEditingPodcast(podcastProfile?.podcastProfileData || {});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingRJ(null);
    setEditingPodcast(null);
  };

  const handleSave = async () => {
    if (activeTab === 'RJ' && editingRJ) {
      await saveRJProfile(editingRJ);
    } else if (activeTab === 'PODCAST' && editingPodcast) {
      await savePodcastProfile(editingPodcast);
    }
    setIsEditing(false);
  };

  const currentProfileData = activeTab === 'RJ' ? (isEditing ? editingRJ : rjProfile?.rjProfileData) : (isEditing ? editingPodcast : podcastProfile?.podcastProfileData);

  const updateProfileData = (key: string, value: any) => {
    if (activeTab === 'RJ') {
      setEditingRJ(prev => ({ ...prev, [key]: value }));
    } else {
      setEditingPodcast(prev => ({ ...prev, [key]: value }));
    }
  };

  const updateSocialLink = (platform: string, value: string) => {
    if (activeTab === 'RJ') {
      setEditingRJ(prev => ({ ...prev, socialLinks: { ...prev?.socialLinks, [platform]: value } }));
    } else {
      setEditingPodcast(prev => ({ ...prev, socialLinks: { ...prev?.socialLinks, [platform]: value } }));
    }
  };

  return (
    <View className={`flex-1 ${bg}`}>
      <ScrollView className="flex-1" contentContainerClassName="pb-24">
        
        <ProfileSwitcher activeTab={activeTab} setActiveTab={setActiveTab} isDark={isDark} disabled={isEditing} />

        <ProfileOverviewCard 
          authContext={authContext} 
          data={currentProfileData || {}} 
          isDark={isDark} 
          isEditing={isEditing} 
          updateData={updateProfileData}
        />

        {activeTab === 'RJ' && rjProfile?.stats && (
          <ProfileStatsCard type="RJ" stats={rjProfile.stats} isDark={isDark} />
        )}
        {activeTab === 'PODCAST' && podcastProfile?.stats && (
          <ProfileStatsCard type="PODCAST" stats={podcastProfile.stats} isDark={isDark} />
        )}

        <ProfileProfessionalDetails 
          data={currentProfileData || {}} 
          isDark={isDark} 
          isEditing={isEditing}
          updateData={updateProfileData}
        />

        {activeTab === 'RJ' && (
          <RJProfileDetails 
            data={(currentProfileData as RJProfileData) || {}} 
            isDark={isDark} 
            isEditing={isEditing}
            updateData={updateProfileData}
          />
        )}

        {activeTab === 'PODCAST' && (
          <PodcastProfileDetails 
            data={(currentProfileData as PodcastProfileData) || {}} 
            isDark={isDark} 
            isEditing={isEditing}
            updateData={updateProfileData}
          />
        )}

        <ProfileSocialLinks 
          socialLinks={currentProfileData?.socialLinks || {}} 
          isDark={isDark} 
          isEditing={isEditing}
          updateLink={updateSocialLink}
        />

        <ProfileAccountSection authContext={authContext} isDark={isDark} />
      </ScrollView>

      <ProfileActionBar 
        isEditing={isEditing} 
        onEdit={handleEdit} 
        onSave={handleSave} 
        onCancel={handleCancel} 
        saving={saving} 
        isDark={isDark} 
      />
    </View>
  );
};

export default ProfileManagement;
