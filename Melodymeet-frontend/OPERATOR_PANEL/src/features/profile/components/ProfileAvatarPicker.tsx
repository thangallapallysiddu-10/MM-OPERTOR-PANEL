import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ProfileAvatarImage } from './ProfileAvatarImage';
import { Feather } from '@expo/vector-icons';
import {
  applyPickedAvatar,
  pickProfileImageFromDevice,
} from '../utils/avatar';

interface Props {
  avatarUrl: string;
  previewUri?: string;
  initials: string;
  isDarkMode: boolean;
  onChange: (update: { avatarUrl?: string; preview?: string }) => void;
}

export const ProfileAvatarPicker: React.FC<Props> = ({
  avatarUrl,
  previewUri,
  initials,
  isDarkMode,
  onChange,
}) => {
  const [uploading, setUploading] = useState(false);

  const label = isDarkMode ? 'text-gray-400' : 'text-gray-600';

  const uploadPicked = useCallback(
    async (picked: Awaited<ReturnType<typeof pickProfileImageFromDevice>>) => {
      if (!picked) return;
      setUploading(true);
      try {
        await applyPickedAvatar(picked, onChange);
        Alert.alert('Done', 'Profile photo updated.');
      } catch (e) {
        Alert.alert('Upload failed', (e as Error).message || 'Could not upload image');
      } finally {
        setUploading(false);
      }
    },
    [onChange]
  );

  const handlePick = async () => {
    await uploadPicked(await pickProfileImageFromDevice());
  };

  return (
    <View className="items-center mb-5 w-full">
      <TouchableOpacity onPress={handlePick} disabled={uploading} activeOpacity={0.85}>
        <ProfileAvatarImage
          avatarUrl={avatarUrl}
          previewUri={previewUri}
          initials={initials}
          sizeClass="w-24 h-24"
        />
        <View className="absolute -bottom-1 -right-1 bg-violet-600 w-9 h-9 rounded-full items-center justify-center border-2 border-black/20">
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather name="camera" size={16} color="#fff" />
          )}
        </View>
      </TouchableOpacity>
      <Text className={`text-xs mt-3 text-center ${label}`}>Tap photo to choose from device</Text>
    </View>
  );
};
