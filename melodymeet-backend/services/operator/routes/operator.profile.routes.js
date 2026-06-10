const express = require('express');
const { authenticate } = require('../auth/middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const { schemas } = require('../utils/validators');
const { upload } = require('../services/audio.service');
const ctrl = require('../controllers/operator.profile.controller');

const router = express.Router();

router.use(authenticate);

router.get('/me', ctrl.getMe);
router.get('/me/dashboard', ctrl.getMeDashboard);
router.put('/me', validateRequest(schemas.operatorProfileSave, 'body'), ctrl.putMe);
router.patch('/me', validateRequest(schemas.operatorProfilePatch, 'body'), ctrl.patchMe);
router.post('/me/avatar', upload.single('avatar'), ctrl.uploadAvatar);

module.exports = router;
