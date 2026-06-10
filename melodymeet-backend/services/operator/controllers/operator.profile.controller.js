const profileService = require('../services/operator.profile.service');
const { handleUpload, deleteUploadedFile } = require('../services/audio.service');
const { sendError } = require('../utils/errors');

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

const getMe = async (req, res) => {
  try {
    const data = await profileService.getProfileForAuthUser(req.authUser);
    return ok(res, data);
  } catch (err) {
    return sendError(res, err);
  }
};

const getMeDashboard = async (req, res) => {
  try {
    const data = await profileService.getProfileDashboardForAuthUser(req.authUser);
    return ok(res, data);
  } catch (err) {
    return sendError(res, err);
  }
};

const putMe = async (req, res) => {
  try {
    const data = await profileService.saveProfileForAuthUser(req.authUser, req.body);
    return ok(res, data);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const patchMe = async (req, res) => {
  try {
    const data = await profileService.patchProfileForAuthUser(req.authUser, req.body);
    return ok(res, data);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const uploadAvatar = async (req, res) => {
  let fileInfo = null;
  try {
    fileInfo = handleUpload(req, {
      kind: 'image',
      fieldNames: ['avatar', 'coverArt', 'thumbnail'],
    });
    const profile = await profileService.updateAvatarForAuthUser(
      req.authUser,
      fileInfo.filePath
    );
    return ok(
      res,
      {
        avatarUrl: fileInfo.filePath,
        profile,
      },
      201
    );
  } catch (err) {
    if (fileInfo?.filePath) {
      await deleteUploadedFile(fileInfo.filePath).catch(() => {});
    }
    return sendError(res, err, 400);
  }
};

module.exports = {
  getMe,
  getMeDashboard,
  putMe,
  patchMe,
  uploadAvatar,
};
