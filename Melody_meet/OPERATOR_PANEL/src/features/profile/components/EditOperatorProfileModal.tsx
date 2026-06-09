import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { OperatorProfile } from '../types';
import { ProfileAvatarPicker } from './ProfileAvatarPicker';

const GENRE_OPTIONS = ['Pop', 'Rock', 'Hip-Hop', 'EDM', 'Bollywood', 'Talk', 'News', 'Chill'];

interface Props {
  visible: boolean;
  isDarkMode: boolean;
  profile: OperatorProfile;
  saving: boolean;
  onClose: () => void;
  onSave: (patch: Partial<OperatorProfile>) => Promise<boolean>;
}

export const EditOperatorProfileModal: React.FC<Props> = ({
  visible,
  isDarkMode,
  profile,
  saving,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState(profile);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>();

  useEffect(() => {
    if (visible) {
      setForm(profile);
      setAvatarPreview(undefined);
    }
  }, [visible, profile]);

  const card = isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200';
  const input = isDarkMode ? 'bg-gray-800 text-white border-gray-600' : 'bg-gray-50 text-black border-gray-300';
  const label = isDarkMode ? 'text-gray-400' : 'text-gray-600';

  const toggleGenre = (g: string) => {
    setForm((f) => {
      const has = f.genres.includes(g);
      return {
        ...f,
        genres: has ? f.genres.filter((x) => x !== g) : [...f.genres, g].slice(0, 8),
      };
    });
  };

  const setSocial = (key: keyof OperatorProfile['socialLinks'], value: string) => {
    setForm((f) => ({
      ...f,
      socialLinks: { ...f.socialLinks, [key]: value },
    }));
  };

  const handleSave = async () => {
    if (!form.displayName.trim()) {
      Alert.alert('Name required', 'Enter your display name before saving.');
      return;
    }

    try {
      const payload: Partial<OperatorProfile> = {
        displayName: form.displayName.trim(),
        tagline: form.tagline.trim(),
        bio: form.bio.trim(),
        location: form.location.trim(),
        email: form.email.trim(),
        avatarInitials: form.avatarInitials.trim().slice(0, 4) || 'RJ',
        genres: form.genres,
        languages: form.languages,
        timezone: form.timezone.trim(),
        socialLinks: form.socialLinks,
        podcastFollowers: Math.max(0, Number(form.podcastFollowers) || 0),
      };

      const currentAvatar = form.avatarUrl.trim();
      const originalAvatar = (profile.avatarUrl || '').trim();
      if (currentAvatar !== originalAvatar) {
        payload.avatarUrl = currentAvatar;
      }

      const ok = await onSave(payload);
      if (ok) onClose();
    } catch (e) {
      Alert.alert('Save failed', (e as Error).message || 'Could not save profile');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Close" />
        <View className={`max-h-[92%] rounded-t-3xl border-t ${card}`}>
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
            <Text className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
              Edit RJ profile
            </Text>
            <TouchableOpacity onPress={onClose} className="p-2" accessibilityRole="button">
              <Feather name="x" size={22} color={isDarkMode ? '#fff' : '#000'} />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="px-5 pb-8"
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
          >
            <ProfileAvatarPicker
              avatarUrl={form.avatarUrl}
              previewUri={avatarPreview}
              initials={form.avatarInitials || 'RJ'}
              isDarkMode={isDarkMode}
              onChange={({ avatarUrl, preview }) => {
                if (avatarUrl !== undefined) {
                  setForm((f) => ({ ...f, avatarUrl }));
                }
                if (preview !== undefined) setAvatarPreview(preview);
              }}
            />

            <Field label="Display name *" labelClass={label}>
              <TextInput
                value={form.displayName}
                onChangeText={(v) => setForm({ ...form, displayName: v })}
                className={`border rounded-xl px-3 py-2.5 ${input}`}
                placeholder="DJ name"
                placeholderTextColor="#888"
              />
            </Field>
            <Field label="Tagline" labelClass={label}>
              <TextInput
                value={form.tagline}
                onChangeText={(v) => setForm({ ...form, tagline: v })}
                className={`border rounded-xl px-3 py-2.5 ${input}`}
                placeholder="Your on-air hook"
                placeholderTextColor="#888"
              />
            </Field>
            <Field label="Bio" labelClass={label}>
              <TextInput
                value={form.bio}
                onChangeText={(v) => setForm({ ...form, bio: v })}
                multiline
                numberOfLines={4}
                className={`border rounded-xl px-3 py-2.5 min-h-[88px] ${input}`}
                placeholder="Tell listeners about your show"
                placeholderTextColor="#888"
                textAlignVertical="top"
              />
            </Field>
            <Field label="Location" labelClass={label}>
              <TextInput
                value={form.location}
                onChangeText={(v) => setForm({ ...form, location: v })}
                className={`border rounded-xl px-3 py-2.5 ${input}`}
                placeholder="City, country"
                placeholderTextColor="#888"
              />
            </Field>
            <Field label="Email (public)" labelClass={label}>
              <TextInput
                value={form.email}
                onChangeText={(v) => setForm({ ...form, email: v })}
                keyboardType="email-address"
                autoCapitalize="none"
                className={`border rounded-xl px-3 py-2.5 ${input}`}
                placeholder="contact@..."
                placeholderTextColor="#888"
              />
            </Field>
            <Field label="Podcast followers (display)" labelClass={label}>
              <TextInput
                value={String(form.podcastFollowers)}
                onChangeText={(v) => setForm({ ...form, podcastFollowers: parseInt(v, 10) || 0 })}
                keyboardType="number-pad"
                className={`border rounded-xl px-3 py-2.5 ${input}`}
              />
            </Field>

            <Text className={`text-sm font-semibold mt-4 mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
              Genres
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {GENRE_OPTIONS.map((g) => {
                const active = form.genres.includes(g);
                return (
                  <TouchableOpacity
                    key={g}
                    onPress={() => toggleGenre(g)}
                    className={`px-3 py-1.5 rounded-full border ${active ? 'bg-violet-600 border-violet-500' : isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}
                  >
                    <Text className={active ? 'text-white text-xs font-medium' : `text-xs ${label}`}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text className={`text-sm font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
              Social links
            </Text>
            {(['instagram', 'youtube', 'twitter', 'spotify', 'website', 'facebook'] as const).map((key) => (
              <Field key={key} label={key} labelClass={label}>
                <TextInput
                  value={form.socialLinks[key]}
                  onChangeText={(v) => setSocial(key, v)}
                  className={`border rounded-xl px-3 py-2.5 mb-2 ${input}`}
                  placeholder={key}
                  placeholderTextColor="#888"
                  autoCapitalize="none"
                />
              </Field>
            ))}

            <Pressable
              disabled={saving}
              onPress={handleSave}
              className={`rounded-2xl py-4 items-center mb-4 mt-2 ${saving ? 'bg-violet-400' : 'bg-violet-600'}`}
              accessibilityRole="button"
              accessibilityLabel="Save profile"
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-base">Save profile</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const Field: React.FC<{ label: string; labelClass: string; children: React.ReactNode }> = ({
  label,
  labelClass,
  children,
}) => (
  <View className="mb-3">
    <Text className={`text-xs font-medium mb-1 ${labelClass}`}>{label}</Text>
    {children}
  </View>
);
