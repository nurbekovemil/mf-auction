const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const app = express();
const path = require('path');
const server = http.createServer(app);
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
const authRoutes = require('./src/routes/authRoutes');
app.use('/api/auth', authRoutes);

const userRoutes = require('./src/routes/userRoutes');
app.use('/api/user', userRoutes);

const auctionRoutes = require('./src/routes/auctionRoutes');
app.use('/api/auction', auctionRoutes);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const fileRoutes = require('./src/routes/fileRoutes');
app.use('/api/file', fileRoutes);
const { 
  createAuction, 
  getAuctions, 
  getAuctionLots, 
  getAuctionSelfOffer, 
  joinAuction, 
  closeAuctionManually,
  checkForOwnAuction,
  scheduledLots,
  approveParticipant
} = require('./src/services/auction');
scheduledLots(); // запускаем проверку авто-завершения аукционов
const { 
  createOffer 
} = require('./src/services/offer');
const {
  createLot
} = require('./src/services/lot');
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
  //const token = socket.handshake.headers.auth; // временно для теста
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
    const user_id = socket.user.id;

    socket.on('auction:all', async () => {
      try {
		  
        const auctions = await getAuctions(user_id);
		console.log("teeest")
        socket.emit('auction:all', auctions);
      } catch (error) {
        io.emit('auction:error', error.message);
      }
    })
    

    socket.on('auction:get_lots', async (auction_id) => {
      try {
		console.log(auction_id)
        if(socket.user.role === 'admin' || socket.user.role === 'initiator') {
          let auction_lots = await getAuctionLots(auction_id);
		  console.log("admin", auction_lots);
          io.emit('auction:set_lots', auction_lots);
        } else {
          let auction_lots = await getAuctionSelfOffer(auction_id, user_id);
		   console.log("user", auction_lots);
          io.emit('auction:set_lots', auction_lots);
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
            const auction = await createAuction(auctionData, user_id);
            io.emit('auction:created', auction);
        } catch (error) {
            io.emit('auction:error', error.message);
        }
    });

    socket.on('lot:create', async (lotData) => {
        try {
            const lot = await createLot(lotData);
            io.emit('lot:created', lot);
        } catch (error) {
            io.emit('lot:error', error.message);
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

    socket.on('auction:user_status', async (data) => {
      try {
        const { auction_id, user_id, status } = data;
        const current_user_id = socket.user.id;
        console.log('🟢 approveParticipant', auction_id, user_id, current_user_id, status)
        const result = await approveParticipant(auction_id, user_id, current_user_id, status);
        if(result.status === 'approved') {
          io.to(`auction-${auction_id}`).emit('auction:user_approved', result);
        }
        if(result.status === 'rejected') {
          io.to(`auction-${auction_id}`).emit('auction:user_rejected', result);
        }
        console.log('🟢 result', result)
      } catch (error) {
        io.emit('auction:error', error.message);
      }
    })

    socket.on('auction:close', async (auction_id) => {
      try {
        const isOwnAuction = await checkForOwnAuction(auction_id, user_id);
        console.log('🟢 isOwnAuction', isOwnAuction)
        console.log('🟢 socket.user.role', socket.user.role)
        if(socket.user.role === 'initiator' && isOwnAuction) {
          await closeAuctionManually(auction_id);
          return io.to(`auction-${auction_id}`).emit('auction:closed', auction_id);
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
            io.emit('offer:created', offer);
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
