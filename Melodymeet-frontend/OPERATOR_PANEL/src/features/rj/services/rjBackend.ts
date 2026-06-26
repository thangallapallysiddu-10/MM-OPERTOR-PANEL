/** Shared RJ backend session (studio id + online flag) */
let _studioId: string | null = null;
let _enabled = false;

export const rjBackend = {
  getStudioId: (): string | null => _studioId,
  isEnabled: (): boolean => _enabled && !!_studioId,
  setSession: (studioId: string | null, enabled: boolean) => {
    _studioId = studioId ? String(studioId) : null;
    _enabled = enabled && !!_studioId;
  },
  clear: () => {
    _studioId = null;
    _enabled = false;
  },
};
