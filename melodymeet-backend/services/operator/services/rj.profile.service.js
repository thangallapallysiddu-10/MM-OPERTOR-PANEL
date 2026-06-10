/**
 * Legacy RJ profile routes delegate to operator.profile.service.
 * @deprecated Prefer /api/profile/* for operator identity.
 */
const operatorProfileService = require('./operator.profile.service');

module.exports = {
  getOperatorProfile: (studioId) => operatorProfileService.getProfileByLegacyStudioId(studioId),
  getOperatorProfileDashboard: async (studioId) => {
    const base = await operatorProfileService.getProfileByLegacyStudioId(studioId);
    return operatorProfileService.getProfileDashboardForAuthUser({ uid: base.authUid });
  },
  patchOperatorProfile: (studioId, patch) =>
    operatorProfileService.patchProfileByLegacyStudioId(studioId, patch),
  getOperatorProfileForAuthUser: (authUser) =>
    operatorProfileService.getProfileForAuthUser(authUser),
  patchOperatorProfileForAuthUser: (authUser, patch) =>
    operatorProfileService.patchProfileForAuthUser(authUser, patch),
  getOperatorProfileDashboardForAuthUser: (authUser) =>
    operatorProfileService.getProfileDashboardForAuthUser(authUser),
  recordEndedLiveSession: (studioId, session) =>
    operatorProfileService.recordEndedLiveSession(studioId, session),
};
