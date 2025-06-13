const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
app.use(express.json());
const authRoutes = require('./src/routes/authRoutes');
const { createAuction, getAuctions, getActionOffers, getAuctionSelfOffer } = require('./src/services/auction');
const { createOffer } = require('./src/services/offer');
app.use('/api/auth', authRoutes);

const io = new Server(server, {
  cors: {
    origin: '*', // временно, потом лучше указать конкретные фронт адреса
    methods: ['GET', 'POST']
  }
});

// Middleware для Socket.IO: авторизация через токен
io.use((socket, next) => {
  const token = socket.handshake.headers.auth; // временно для теста
  if (!token) {
    return next(new Error('Ошибка аутентификации: отсутствует токен или истек срок действия'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // теперь в сокете есть пользователь
    next();
  } catch (err) {
    next(new Error('Authentication error: invalid token'));
  }
});

// События
io.on('connection', async (socket) => {
    console.log(`🟢 Пользователь подключен: ${socket.user.email}`);
    const auctions = await getAuctions();
    socket.emit('auction:all', auctions);

    socket.on('auction:get_offers', async (auction_id) => {
      try {
        if(socket.user.role === 'admin' || socket.user.role === 'initiator') {
          const auction_offers = await getActionOffers(auction_id);
          io.emit('auction:set_offers', auction_offers);
        } else {
          const auction_offers = await getAuctionSelfOffer(auction_id, socket.user.id);
          io.emit('auction:set_offers', auction_offers);
        }
      } catch (error) {
        io.emit('auction:error', error.message);
      }
    })
    
    // Пример: пользователь присоединяется к комнате конкретного аукциона
    socket.on('auction:join', (auction_id) => {
        socket.join(`auction_${auction_id}`);
        console.log(`${socket.user.email} joined auction ${auction_id}`);
    });

    // Пример: пользователь создает аукцион
    socket.on('auction:create', async (auctionData) => {
        try {
            const auction = await createAuction(auctionData, socket.user.id, io);
            io.emit('auction:created', auction);
        } catch (error) {
            io.emit('auction:error', error.message);
        }
    });

    // Пример: новое предложение (ставка)
    socket.on('offer:create', async (offerData) => {
        try {
            console.log('🟢 Новое предложение:', offerData);
            const offer = await createOffer(offerData, socket.user.id);
            io.to(`auction_${offerData.auction_id}`).emit('offer:new', offer);
        } catch (error) {
            io.emit('auction:error', error.message);
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔴 Пользователь отключен: ${socket.user.email}`);
    });
});

module.exports = { app, server, io };
