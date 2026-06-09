import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { ProfileApi } from '../../../services/api/profileApi';
import { buildProfileSaveBody } from '../utils/profilePayload';
import type { OperatorProfile, OperatorProfileDashboard, ProfileMetrics } from '../types';

const emptyMetrics = (): ProfileMetrics => ({
  rjFollowers: 0,
  rjListeners: 0,
  rjLikes: 0,
  rjSubscribers: 0,
  rjShares: 0,
  podcastFollowers: 0,
  podcastEpisodes: 0,
  podcastPublished: 0,
  rjLiveSessions: 0,
  podcastLiveSessions: 0,
});

export function useOperatorProfile() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [dashboard, setDashboard] = useState<OperatorProfileDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (authLoading) return null;
    if (!isAuthenticated || !user) {
      setLoading(false);
      setError('Sign in to create your RJ profile.');
      setDashboard(null);
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const data = (await ProfileApi.getMyDashboard()) as unknown as OperatorProfileDashboard;
      setDashboard(data);
      return data;
    } catch (e) {
      setError((e as Error).message || 'Could not load profile');
      setDashboard(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveProfile = useCallback(
    async (patch: Partial<OperatorProfile>) => {
      if (!isAuthenticated) {
        Alert.alert('Sign in required', 'Log in to save your profile.');
        return false;
      }

      const displayName = patch.displayName?.trim();
      if (!displayName) {
        Alert.alert('Name required', 'Please enter your display name.');
        return false;
      }

      setSaving(true);
      try {
        const body = buildProfileSaveBody(patch);
        const isNew =
          !dashboard?.operatorProfile?.displayName?.trim();

        if (isNew) {
          await ProfileApi.saveMe(body);
        } else {
          await ProfileApi.updateMe(body);
        }

        const data = await refresh();
        if (!data?.operatorProfile?.displayName?.trim()) {
          Alert.alert('Save failed', 'Profile did not update. Check your connection and try again.');
          return false;
        }
        return true;
      } catch (e) {
        const message = (e as Error).message || 'Could not update profile';
        Alert.alert('Save failed', message);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [isAuthenticated, refresh, dashboard]
  );

  const accountName = user?.name || dashboard?.operatorProfile?.displayName || dashboard?.profileName || 'RJ';
  const accountEmail = user?.email || dashboard?.operatorProfile?.email || '';

  const hasProfile = Boolean(dashboard?.operatorProfile?.displayName?.trim());

  const metrics = dashboard?.metrics ?? emptyMetrics();

  return {
    dashboard,
    loading,
    saving,
    error,
    refresh,
    saveProfile,
    accountName,
    accountEmail,
    hasProfile,
    isNewProfile: !hasProfile,
    metrics,
    bestLiveEvents: dashboard?.bestLiveEvents ?? [],
    recentPodcasts: dashboard?.recentPodcasts ?? [],
  };
}
