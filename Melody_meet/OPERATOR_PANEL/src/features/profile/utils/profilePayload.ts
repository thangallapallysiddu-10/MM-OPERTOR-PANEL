import type { OperatorProfile } from '../types';

/** Normalize profile fields before PATCH/PUT so validation passes on the server */
export function buildProfileSaveBody(patch: Partial<OperatorProfile>): Record<string, unknown> {
  const email = patch.email?.trim() ?? '';
  return {
    displayName: patch.displayName?.trim() ?? '',
    tagline: patch.tagline?.trim() ?? '',
    bio: patch.bio?.trim() ?? '',
    location: patch.location?.trim() ?? '',
    email,
    avatarUrl: patch.avatarUrl?.trim() ?? '',
    avatarInitials: (patch.avatarInitials?.trim() || 'RJ').slice(0, 4),
    genres: patch.genres ?? [],
    languages: patch.languages?.length ? patch.languages : ['English'],
    timezone: patch.timezone?.trim() ?? '',
    socialLinks: patch.socialLinks ?? {},
    podcastFollowers: Math.max(0, Number(patch.podcastFollowers) || 0),
  };
}
