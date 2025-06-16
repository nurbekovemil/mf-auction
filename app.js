const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const app = express();
const server = http.createServer(app);
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
const authRoutes = require('./src/routes/authRoutes');
app.use('/api/auth', authRoutes);

const { 
  createAuction, 
  getAuctions, 
  getAuctionOffers, 
  getAuctionSelfOffer, 
  joinAuction, 
  closeAuction,
  checkForOwnAuction,
  scheduledAuctions
} = require('./src/services/auction');
scheduledAuctions(); // запускаем проверку авто-завершения аукционов
const { 
  createOffer 
} = require('./src/services/offer');
const { 
  getUsers 
} = require('./src/services/user');


const io = new Server(server, {
  cors: {
    origin: '*', // временно, потом лучше указать конкретные фронт адреса
    methods: ['GET', 'POST']
  }
});

// Middleware для Socket.IO: авторизация через токен
io.use((socket, next) => {
  const token = socket.handshake.auth.token	
  // const token = socket.handshake.headers.auth; // временно для теста
  if (!token) {
    return next(new Error('Ошибка аутентификации: отсутствует токен или истек срок действия'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // теперь в сокете есть пользователь
    next();
  } catch (err) {
    next(new Error('Ошибка аутентификации: неверный токен'));
  }
});

const onlineParticipants = new Map();
const socketAuctionMap = new Map();

// События
io.on('connection', async (socket) => {
    console.log(`🟢 Пользователь подключен: ${socket.user.email}`);
    const auctions = await getAuctions();
    socket.emit('auction:all', auctions);
    const user_id = socket.user.id;


    socket.on('auction:get_offers', async (auction_id) => {
      try {
        if(socket.user.role === 'admin' || socket.user.role === 'initiator') {
          const auction_offers = await getAuctionOffers(auction_id);
          io.emit('auction:set_offers', auction_offers);
        } else {
          const auction_offers = await getAuctionSelfOffer(auction_id, user_id);
          io.emit('auction:set_offers', auction_offers);
        }
      } catch (error) {
        io.emit('auction:error', error.message);
      }
    })

    socket.on('auction:get_online_users', async (auction_id) => {
      try {
        if(!socket.user.role === 'admin' || !socket.user.role === 'initiator') {
          return io.emit('auction:online_users', []);
        }
        const user_ids = Array.from(onlineParticipants.get(auction_id) || []);
        const users = await getUsers(user_ids)
        socket.emit('auction:online_users', users);
      } catch (error) {
        io.emit('auction:error', error.message);
      }
    });

    // Пример: пользователь создает аукцион
    socket.on('auction:create', async (auctionData) => {
        try {
            const auction = await createAuction(auctionData, user_id, io);
            io.emit('auction:created', auction);
        } catch (error) {
            io.emit('auction:error', error.message);
        }
    });

    // Пример: пользователь присоединяется к комнате конкретного аукциона
    socket.on('auction:join', async (auction_id) => {
        try {
          if (!onlineParticipants.has(auction_id)) {
            onlineParticipants.set(auction_id, new Set());
          }

          onlineParticipants.get(auction_id).add(user_id);
          socketAuctionMap.set(socket.id, {
            user_id,
            auction_id,
          });
          await joinAuction(auction_id, user_id);
          if(socket.user.role === 'admin' || socket.user.role === 'initiator') {
            socket.join(`auction-admin-${auction_id}`);
          }else {
            socket.join(`auction-${auction_id}`);
          }
          io.to(`auction-admin-${auction_id}`).emit('auction:joined', user_id);
        } catch (error) {
          io.emit('auction:error', error.message);
        }
    });

    socket.on('auction:close', async (data) => {
      try {
        const { auction_id, offer_id } = JSON.parse(data);
        const isOwnAuction = await checkForOwnAuction(auction_id, user_id);
        if(socket.user.role === 'initiator' && isOwnAuction) {
          await closeAuction(auction_id, offer_id);
          return io.to(`auction-${auction_id}`).emit('auction:closed');
        }
        throw new Error('Вы не можете завершить этот аукцион');
      } catch (error) {
        io.emit('auction:error', error.message);
      }
    })

    // Пример: новое предложение (ставка)
    socket.on('offer:create', async (offerData) => {
        try {
            console.log('🟢 Новое предложение:', offerData);
            const offer = await createOffer(offerData, user_id);
            io.to(`auction-${offerData.auction_id}`).emit('offer:new', offer);
        } catch (error) {
            io.emit('auction:error', error.message);
        }
    });

    socket.on('disconnect', () => {
      const info = socketAuctionMap.get(socket.id);
        if (!info) return;

        const { user_id, auction_id } = info;

        const usersSet = onlineParticipants.get(auction_id);
        if (usersSet) {
          usersSet.delete(user_id);
          if (usersSet.size === 0) {
            onlineParticipants.delete(auction_id);
          }
        }

        io.to(`auction-admin-${auction_id}`).emit('auction:user_left', {
          auction_id,
          user_id,
        });

        socketAuctionMap.delete(socket.id); // убираем за собой
    });
});

module.exports = { app, server, io };
