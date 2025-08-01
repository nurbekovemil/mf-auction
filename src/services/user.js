const { UserInfo } = require('../models');
const User = require('../models/User');

exports.getUsers = async (user_ids) => {
  try {
    const users = await User.findAll({ where: { is_verified: true, role: 'user', id: user_ids } }, { attributes: ['id', 'name', 'email'] });
    return users
  } catch (err) {
    throw new Error(JSON.stringify({ message: 'Ошибка при получении пользователей', error: err.message }));
  }
};

exports.list = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      include: [{ model: UserInfo, as: 'user_info' }],
    });
    return res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при получении пользователей', error: err.message });
  }
};

exports.updateUserInfo = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findByPk(id);
    if (!user) return res.status(400).json({ message: 'Пользователь не найден' });
    const isUserInfo = await UserInfo.findByPk(id);
    if (isUserInfo) {
      await isUserInfo.update(req.body);
    } else {
      await UserInfo.create({ ...req.body, user_id: id });
    }
      return res.json({ message: 'Пользователь обновлен' });

  } catch (error) {
    res.status(500).json({ message: 'Ошибка при обновлении пользователя', error: error.message });
  }
}

exports.updateVerify = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findByPk(id);
    if (!user) return res.status(400).json({ message: 'Пользователь не найден' });
    await user.update({ is_verified: req.body.is_verified });
    return res.json({ message: 'Пользователь обновлен' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при обновлении пользователя', error: error.message });
  }
}


