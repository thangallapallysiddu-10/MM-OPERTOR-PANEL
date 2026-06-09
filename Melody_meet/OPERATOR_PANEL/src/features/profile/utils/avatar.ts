import { Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { ProfileApi } from '../../../services/api/profileApi';
import { SERVER_ROOT } from '../../../services/api/apiClient';

export function getProfileMediaUrl(path?: string | null): string {
  if (!path?.trim()) return '';
  const v = path.trim();
  if (/^(https?:|data:|file:|blob:)/i.test(v)) return v;
  return `${SERVER_ROOT}${v.startsWith('/') ? v : `/${v}`}`;
}

export type PickedImage = {
  uri: string;
  name: string;
  mimeType?: string;
  webFile?: File;
};

const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'jfif', 'bmp', 'heic', 'heif'];

function normalizeUploadName(name: string, mimeType?: string): string {
  const raw = (name || '').trim();
  const hasExtension = /\.[a-zA-Z0-9]+$/.test(raw);
  if (hasExtension) return raw;
  const mt = (mimeType || '').toLowerCase();
  const extFromMime =
    mt.includes('png') ? 'png' :
    mt.includes('webp') ? 'webp' :
    mt.includes('gif') ? 'gif' :
    mt.includes('avif') ? 'avif' :
    mt.includes('bmp') ? 'bmp' :
    mt.includes('heic') ? 'heic' :
    mt.includes('heif') ? 'heif' :
    mt.includes('jpeg') || mt.includes('jpg') ? 'jpg' :
    'jpg';
  return `${raw || `avatar-${Date.now()}`}.${extFromMime}`;
}

function assertSupportedImage(name: string, mimeType?: string): void {
  const ext = normalizeUploadName(name, mimeType).split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    throw new Error('Unsupported image type. Use JPG, PNG, WEBP, GIF, AVIF, BMP, HEIC, or HEIF.');
  }
}

export function resolveAvatarDisplayUri(avatarUrl?: string | null): string {
  return getProfileMediaUrl(avatarUrl);
}

async function clipboardImageWeb(): Promise<PickedImage | null> {
  if (!navigator.clipboard?.read) {
    return null;
  }

  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const imageType = item.types.find((t) => t.startsWith('image/'));
      if (!imageType) continue;
      const blob = await item.getType(imageType);
      const ext = imageType.includes('png') ? 'png' : imageType.includes('gif') ? 'gif' : 'jpg';
      const file = new File([blob], `pasted-avatar-${Date.now()}.${ext}`, { type: imageType });
      return {
        uri: URL.createObjectURL(blob),
        name: file.name,
        mimeType: imageType,
        webFile: file,
      };
    }
  } catch {
    // fall through — user may need to use Ctrl+V on the paste zone
  }

  return null;
}

/** Read image from a DOM paste event (Ctrl+V). */
export function imageFromPasteEvent(event: ClipboardEvent): PickedImage | null {
  const items = event.clipboardData?.items;
  if (!items) return null;

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (!item.type.startsWith('image/')) continue;
    const file = item.getAsFile();
    if (!file) continue;
    return {
      uri: URL.createObjectURL(file),
      name: file.name || `pasted-avatar-${Date.now()}.jpg`,
      mimeType: file.type || 'image/jpeg',
      webFile: file,
    };
  }
  return null;
}

async function clipboardImageNative(): Promise<PickedImage | null> {
  const hasImage = await Clipboard.hasImageAsync();
  if (!hasImage) {
    return null;
  }

  const img = await Clipboard.getImageAsync({ format: 'jpeg', jpegQuality: 0.92 });
  if (!img?.data) return null;

  return {
    uri: img.data,
    name: `pasted-avatar-${Date.now()}.jpg`,
    mimeType: 'image/jpeg',
  };
}

/** Paste a copied photo from the clipboard (not a URL). */
export async function pasteProfileImageFromClipboard(): Promise<PickedImage | null> {
  if (Platform.OS === 'web') {
    return clipboardImageWeb();
  }
  return clipboardImageNative();
}

export async function pickProfileImageFromDevice(): Promise<PickedImage | null> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,.jpg,.jpeg,.png,.webp,.gif,.jfif,.bmp,.heic,.heif';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        resolve({
          uri: URL.createObjectURL(file),
          name: file.name,
          mimeType: file.type || 'image/jpeg',
          webFile: file,
        });
      };
      input.click();
    });
  }

  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission needed', 'Allow photo access to set your profile picture.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.9,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.fileName || `avatar-${Date.now()}.jpg`,
    mimeType: asset.mimeType || 'image/jpeg',
  };
}

export async function uploadProfileAvatar(picked: PickedImage): Promise<string> {
  const uploadName = normalizeUploadName(picked.name, picked.mimeType);
  assertSupportedImage(uploadName, picked.mimeType);

  if (Platform.OS === 'web' && picked.webFile) {
    const form = new FormData();
    form.append('avatar', picked.webFile, uploadName);
    return ProfileApi.uploadMyAvatarForm(form);
  }

  return ProfileApi.uploadMyAvatar({
    uri: picked.uri,
    name: uploadName,
    type: picked.mimeType || 'image/jpeg',
  });
}

export type AvatarChangePayload = { avatarUrl?: string; preview?: string };

export async function applyPickedAvatar(
  picked: PickedImage,
  onChange: (update: AvatarChangePayload) => void
): Promise<string> {
  onChange({ preview: picked.uri });
  const path = await uploadProfileAvatar(picked);
  onChange({ avatarUrl: path, preview: resolveAvatarDisplayUri(path) });
  return path;
}
