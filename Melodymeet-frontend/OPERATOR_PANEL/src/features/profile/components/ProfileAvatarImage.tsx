import React, { useEffect, useState } from 'react';
import { Image, View, Text, type ImageStyle, type StyleProp } from 'react-native';
import { resolveAvatarDisplayUri } from '../utils/avatar';

interface Props {
  avatarUrl?: string | null;
  previewUri?: string | null;
  initials: string;
  sizeClass?: string;
  className?: string;
  imageStyle?: StyleProp<ImageStyle>;
  fallbackClassName?: string;
}

/**
 * Renders profile photo with local preview support and initials fallback when load fails.
 */
export const ProfileAvatarImage: React.FC<Props> = ({
  avatarUrl,
  previewUri,
  initials,
  sizeClass = 'w-24 h-24',
  className = 'rounded-2xl',
  imageStyle,
  fallbackClassName = 'bg-violet-600',
}) => {
  const displayUri = previewUri || resolveAvatarDisplayUri(avatarUrl);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [displayUri]);

  if (!displayUri || failed) {
    return (
      <View
        className={`${sizeClass} ${className} ${fallbackClassName} items-center justify-center`}
      >
        <Text className="text-white font-bold text-3xl">{initials.slice(0, 2).toUpperCase()}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: displayUri }}
      className={`${sizeClass} ${className}`}
      style={imageStyle}
      resizeMode="cover"
      onError={() => setFailed(true)}
      accessibilityLabel="Profile photo"
    />
  );
};
