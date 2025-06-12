
const { server } = require('./app');
const dotenv = require('dotenv');
const sequelize = require('./src/config/database');
dotenv.config();

const PORT = process.env.PORT || 3000;
async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ DB connected');

    await sequelize.sync({ alter: true });
    console.log('✅ Models synchronized');

    server.listen(PORT, () => {
      console.log(`🚀 Server started at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Unable to start:', err);
  }
}

start();
