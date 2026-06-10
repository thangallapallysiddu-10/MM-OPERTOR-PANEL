const User = require('../models/user.model');
const { badRequest, notFound } = require('../utils/errors');
const { USER_ROLES, schemas, validate } = require('../utils/validators');

const getAllUsers = async (role) => {
  if (role && !USER_ROLES.includes(role)) {
    throw badRequest('Invalid user role');
  }

  const where = role ? { role } : {};
  return await User.findAll({ where, order: [['followers', 'DESC']] });
};

const getUserById = async (id) => {
  const user = await User.findByPk(id);
  if (!user) throw notFound('User not found');
  return user;
};

const banUser = async (id) => {
  const user = await User.findByPk(id);
  if (!user) throw notFound('User not found');

  user.isBanned = !user.isBanned;
  await user.save();
  return user;
};

const reportUser = async (id, reason) => {
  const payload = validate(schemas.userReport, { reason });
  const user = await User.findByPk(id);
  if (!user) throw notFound('User not found');

  user.reports = user.reports + 1;
  await user.save();
  return { user, reason: payload.reason };
};

const createUser = async (data) => {
  const payload = validate(schemas.user, data);
  if (!payload.avatar) {
    payload.avatar = payload.name.slice(0, 2).toUpperCase();
  }

  return await User.create(payload);
};

const updateUser = async (id, data) => {
  const user = await User.findByPk(id);
  if (!user) throw notFound('User not found');

  const allowed = ['name', 'email', 'bio', 'location', 'avatar'];
  allowed.forEach((field) => {
    if (data[field] !== undefined) user[field] = data[field];
  });

  // Regenerate avatar initials if name changed and no explicit avatar given
  if (data.name && !data.avatar) {
    user.avatar = String(data.name).slice(0, 2).toUpperCase();
  }

  await user.save();
  return user;
};

const deleteUser = async (id) => {
  const deleted = await User.destroy({ where: { id } });
  if (!deleted) throw notFound('User not found');
};

module.exports = {
  getAllUsers,
  getUserById,
  banUser,
  reportUser,
  createUser,
  updateUser,
  deleteUser,
};
