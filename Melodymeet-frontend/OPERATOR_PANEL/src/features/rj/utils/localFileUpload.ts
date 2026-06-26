import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useAppStore } from '../../../store/useAppStore';
import { rjBackend } from '../services/rjBackend';
import { RjApi } from '../../../services/api/rjApi';
import type { Track } from '../types';

export interface UploadedLocalFile {
  id: string;
  name: string;
  uri: string;
  filePath?: string;
  size: string;
  duration: string;
}

const resolveDesktopFilePath = (asset: DocumentPicker.DocumentPickerAsset): string => {
  const file = asset.file as (File & { path?: string }) | undefined;
  const filePath = file?.path || file?.webkitRelativePath;
  if (filePath) return filePath;
  return asset.uri;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const getAudioDuration = async (_uri: string): Promise<string> => {
  return '0:00';
};

export const buildTrackFromLocalFile = (file: UploadedLocalFile): Track => {
  const title = file.name.replace(/\.[^/.]+$/, '');
  return {
    id: Date.now(),
    title,
    artist: 'Local File',
    duration: file.duration,
    bpm: 120,
    channel: 1,
    audioUrl: file.filePath || file.uri,
    beatIntensity: 70,
    shortTitle: title.substring(0, 12).toUpperCase(),
    gain: 70,
    eq: { low: 50, mid: 50, high: 50 },
    fx: { echo: 0, flanger: 0, loop: 0, reverse: 0, hotCue: 0 },
  };
};

export async function pickAndUploadLocalFile(): Promise<UploadedLocalFile | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/aac', 'audio/flac'],
      copyToCacheDirectory: true,
    });

    if (result.canceled) return null;

    const asset = result.assets[0];
    if (asset.size && asset.size > 500 * 1024 * 1024) {
      Alert.alert('Error', 'File size exceeds 500MB limit');
      return null;
    }

    const sourcePath = resolveDesktopFilePath(asset);
    const duration = await getAudioDuration(sourcePath);
    const { rjStudio, updateRjStudioState } = useAppStore.getState();
    const existing = rjStudio.uploadedLocalFiles || [];

    const sid = rjBackend.getStudioId();
    if (rjBackend.isEnabled() && sid) {
      try {
        const uploaded = await RjApi.uploadLocalFile(
          sid,
          {
            uri: asset.uri,
            name: asset.name,
            type: asset.mimeType || 'audio/mpeg',
            file: (asset as any).file,
          },
          { duration }
        );
        const newFile: UploadedLocalFile = {
          id: String(uploaded.id),
          name: String(uploaded.name),
          uri: RjApi.getFileUrl(String(uploaded.fileUrl)),
          filePath: sourcePath,
          size: String(uploaded.fileSize || formatFileSize(asset.size || 0)),
          duration: String(uploaded.duration || duration),
        };
        updateRjStudioState({ uploadedLocalFiles: [...existing, newFile] });
        return newFile;
      } catch {
        /* local-only fallback */
      }
    }

    const newFile: UploadedLocalFile = {
      id: Date.now().toString(),
      name: asset.name,
      uri: asset.uri,
      filePath: sourcePath,
      size: formatFileSize(asset.size || 0),
      duration,
    };
    updateRjStudioState({ uploadedLocalFiles: [...existing, newFile] });
    return newFile;
  } catch {
    Alert.alert('Error', 'Failed to upload file');
    return null;
  }
}
