const User = require('../models/User');

exports.getUsers = async (user_ids) => {
  try {
    const users = await User.findAll({ where: { is_verified: true, role: 'user', id: user_ids } }, { attributes: ['id', 'name', 'email'] });
    return users
  } catch (err) {
    throw new Error(JSON.stringify({ message: 'Ошибка при получении пользователей', error: err.message }));
  }
};
