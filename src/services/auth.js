const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;
const default_password = process.env.DEFAULT_PASSWORD;
exports.register = async (req, res) => {
  const { name, email } = req.body;
  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ message: 'Пользователь с таким email уже существует' });

    const hash = await bcrypt.hash(default_password, 10);
    const user = await User.create({ name, email, password: hash });

    res.status(201).json({ message: 'Регистрация прошла успешно' });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при регистрации', error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ message: 'Пользователь не найден' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: 'Неверный пароль' });

    if (!user.is_verified) {
      return res.status(403).json({ message: 'Пользователь не верифицирован администратором' });
    }

    const token = jwt.sign({ id: user.id, role: user.role, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '9h' });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при авторизации', error: err.message });
  }
};

exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id; // предполагаем, что user берется из JWT через middleware

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Проверка старого пароля
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Неверный старый пароль' });
    }

    // Хэшируем новый пароль
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Обновляем пароль
    await user.update({ password: hashedPassword });

    res.json({ message: 'Пароль успешно изменен' });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при смене пароля', error: err.message });
  }
};
