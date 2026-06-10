// routes/user.routes.js
const express = require('express');
const { authenticate } = require('../auth/middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const { schemas } = require('../utils/validators');
const router = express.Router();
const {
  getUsers, getUserById, banUser, reportUser, createUser, updateUser, deleteUser
} = require('../controllers/user.controller');

// Apply authentication middleware to all user routes
router.use(authenticate);

// GET all users (optional ?role=RJ / Podcast Host / Listener)
router.get('/', getUsers);

// GET single user
router.get('/:id', getUserById);

// POST create a user - with validation
router.post('/', validateRequest(schemas.userCreate, 'body'), createUser);

// PUT update a user profile - with validation
router.put('/:id', validateRequest(schemas.userUpdate, 'body'), updateUser);

// PUT ban/unban a user (toggle)
router.put('/:id/ban', banUser);

// POST report a user - with validation
router.post('/:id/report', validateRequest(schemas.userReport, 'body'), reportUser);

// DELETE a user
router.delete('/:id', deleteUser);

module.exports = router;
