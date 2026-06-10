const userService = require('../services/user.service');
const { sendError } = require('../utils/errors');

const getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const users = await userService.getAllUsers(role);
    res.status(200).json({ success: true, data: users });
  } catch (err) {
    sendError(res, err);
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    sendError(res, err, 404);
  }
};

const banUser = async (req, res) => {
  try {
    const user = await userService.banUser(req.params.id);
    const status = user.isBanned ? 'banned' : 'unbanned';
    res.status(200).json({ success: true, message: `User ${status} successfully`, data: user });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const reportUser = async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await userService.reportUser(req.params.id, reason);
    res.status(200).json({ success: true, message: 'User reported', data: result });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const createUser = async (req, res) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const deleteUser = async (req, res) => {
  try {
    await userService.deleteUser(req.params.id);
    res.status(200).json({ success: true, message: 'User deleted' });
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = {
  getUsers,
  getUserById,
  banUser,
  reportUser,
  createUser,
  updateUser,
  deleteUser,
};
