const { Op, Sequelize } = require('sequelize');
const { Lot, Offer, Deal, Auction, AuctionParticipant, User } = require('../models');
const cron = require('node-cron');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);



exports.createAuction = async (createAuction, user_id) => {
  try {
    const auction = await Auction.create({ user_id, ...createAuction });
    return auction
  } catch (err) {
    throw new Error(JSON.stringify({ message: 'Ошибка при создании аукциона', error: err.message }));
  }
};

exports.scheduledLots = () => {
  cron.schedule('* * * * *', async () => {
const bishkekTime = dayjs().tz('Asia/Bishkek');
const now = bishkekTime.toDate();
console.log('🟢 formatted', now.toISOString()); // например: 2025-06-26 10:50:00.000+06:00
// console.log('🟢 scheduledLots', );

    try {
      // Ищем аукционы с истекшим сроком
      const auctions = await Auction.findAll({
        where: {
          status: 'open',
          closing_type: 'auto',
          end_time: { [Op.lte]: now }
        },
        include: [{
          model: Lot,
          as: 'lots',
          required: false,
          where: { status: 'open' },
          include: [{
            model: Offer,
            as: 'offers',
            separate: true,
            order: [['percent', 'DESC']],
            limit: 1
          }]
        }]
      });
      console.log('🟢 auctions', auctions.length);
      for (const auction of auctions) {
        for (const lot of auction.lots) {
          try {
            const bestOffer = lot.offers?.[0];

            if (bestOffer) {
              lot.winner_user_id = bestOffer.user_id;
              lot.winner_offer_id = bestOffer.id;
              lot.status = 'finished';
              bestOffer.status = 'finished';
              await bestOffer.save();
              await Deal.create({
                auction_id: auction.id,
                lot_id: lot.id,
                offer_id: bestOffer.id,
                user_id: bestOffer.user_id,
                percent: bestOffer.percent,
                amount: bestOffer.volume
              });
            } else {
              lot.status = 'expired';
            }

            await lot.save();
            console.log(`[${now.toISOString()}] ✅ Аукционы и лоты завершены`);
          } catch (err) {
            console.error(`[Lot Error] ${lot.id}:`, err.message);
          }
        }

        // Завершаем аукцион
        await auction.update({ status: 'finished' });

      }
    } catch (err) {
      console.error('[CRON ERROR]:', err.message);
    }
  });
};


exports.getAuctions = async (user_id) => {
  try {
    const auctions = await Auction.findAll({
      order: [['createdAt', 'DESC']],
      include: [{
        model: Lot,
        as: 'lots'
      }]
    });
    // Получаем все записи участника
    const participantRecords = await AuctionParticipant.findAll({
      where: {
        user_id,
        status: 'approved', // только одобренные
      },
    });

    const accessMap = new Set(participantRecords.map(p => p.auction_id));

    // Добавляем флаг доступа
    const result = auctions.map(auction => {
      return {
        ...auction.toJSON(),
        has_access: accessMap.has(auction.id)
      };
    });

    return result
  } catch (err) {
    throw new Error(JSON.stringify({ message: 'Ошибка при получении аукционов', error: err.message }));
  }
};

exports.getAuctionLots = async (auction_id) => {
  try {
    const lotsWithOffers = await Lot.findAll({
      where: { auction_id },
      include: [
        {
          model: Offer,
          as: 'offers',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email'],
            }
          ],
        },
      ],
      order: [['createdAt', 'ASC']],
    });
    console.log('🟢 lotsWithOffers', lotsWithOffers)
    return lotsWithOffers;
  } catch (err) {
    throw new Error(JSON.stringify({ message: 'Ошибка при получении предложений', error: err.message }));
  }
};

exports.getAuctionSelfOffer = async (auction_id, user_id) => {
  try {
    const lots = await Lot.findAll({
      where: { auction_id },
      include: [
        {
          model: Offer,
          as: 'offers',
          where: { user_id },
          required: false, // чтобы показать лоты даже без заявок пользователя
        },
      ],
      order: [['createdAt', 'ASC']],
    });

    return lots;
  } catch (err) {
    throw new Error(JSON.stringify({ message: 'Ошибка при получении предложений', error: err.message }));
  }
};

exports.joinAuction = async (auction_id, user_id) => {
  try {
    return await AuctionParticipant.findOrCreate({
      where: { user_id, auction_id }
    });
  } catch (err) {
    throw new Error(JSON.stringify({ message: 'Ошибка при присоединении к аукциону', error: err.message }));
  }
};


exports.closeLotManually = async (lot_id, offer_id) => {
  try {
    // Проверка лота
    const lot = await Lot.findByPk(lot_id);
    if (!lot) {
      throw new Error(JSON.stringify({ message: 'Лот не найден' }));
    }

    // Проверка оффера
    const offer = await Offer.findOne({
      where: {
        id: offer_id,
        lot_id: lot.id,
      },
    });
    if (!offer) {
      throw new Error(JSON.stringify({ message: 'Заявка не найдена' }));
    }

    // Проверка на дублирующую сделку
    const isDeal = await Deal.findOne({
      where: {
        lot_id: lot.id,
        offer_id: offer.id,
        user_id: offer.user_id,
      },
    });
    if (isDeal) {
      throw new Error(JSON.stringify({ message: 'Вы уже завершили этот лот' }));
    }

    // Обновляем победителя лота
    lot.winner_user_id = offer.user_id;
    lot.winner_offer_id = offer.id;
    lot.status = 'finished';
    await lot.save();

    // Создаём сделку
    const deal = await Deal.create({
      auction_id: lot.auction_id,
      lot_id: lot.id,
      offer_id: offer.id,
      user_id: offer.user_id,
      percent: offer.percent,
      amount: offer.volume || null
    });

    // Проверка: все ли лоты завершены — закрываем аукцион
    const openLots = await Lot.count({
      where: {
        auction_id: lot.auction_id,
        status: 'open'
      }
    });
    if (openLots === 0) {
      await Auction.update(
        { status: 'finished' },
        { where: { id: lot.auction_id } }
      );
    }

    return deal;
  } catch (error) {
    throw new Error(JSON.stringify({
      message: 'Ошибка при ручном завершении лота',
      error: error.message,
    }));
  }
};

exports.closeAuctionManually = async (auction_id) => {
  try {
    const auction = await Auction.findByPk(auction_id, {
      include: [{
        model: Lot,
        as: 'lots',
        required: false,
        where: { status: 'open' },
        include: [{
          model: Offer,
          as: 'offers',
          separate: true,
          order: [['percent', 'DESC']],
          limit: 1
        }]
      }]
    });

    if (!auction) {
      throw new Error(JSON.stringify({ message: 'Аукцион не найден' }));
    }

    for (const lot of auction.lots) {
      const bestOffer = lot.offers?.[0];

      if (bestOffer) {
        lot.winner_user_id = bestOffer.user_id;
        lot.winner_offer_id = bestOffer.id;
        lot.status = 'finished';
        bestOffer.status = 'accepted';
        await Deal.create({
          auction_id: auction.id,
          lot_id: lot.id,
          offer_id: bestOffer.id,
          user_id: bestOffer.user_id,
          percent: bestOffer.percent,
          amount: bestOffer.volume
        });
        await bestOffer.save();
      } else {
        lot.status = 'expired';
      }

      await lot.save();
    }

    await auction.update({ status: 'finished' });

    return { message: 'Аукцион завершён' };
  } catch (error) {
    throw new Error(JSON.stringify({
      message: 'Ошибка при завершении аукциона',
      error: error.message,
    }));
  }
};


exports.checkForOwnAuction = async (auction_id, user_id) => {
  try {
    const auction = await Auction.findOne({ where: { id: auction_id, user_id } });
    if(!auction) {
      return false
    }
    return true
  } catch (err) {
    throw new Error(JSON.stringify({ message: 'Ошибка при проверке аукциона', error: err.message }));
  }
};

exports.approveParticipant = async (auction_id, user_id, initiator_id, status) => {
  try {
    console.log('🟢 approveParticipant', auction_id, user_id, initiator_id, status)
    // Проверяем, инициатор ли текущий пользователь
    const auction = await Auction.findByPk(auction_id);
    if (!auction) {
      throw new Error('Аукцион не найден');
    }
    // if (auction.user_id !== initiator_id) {
    //   throw new Error('У вас не хватает прав');
    // }

    // Проверка записи участника
    const participant = await AuctionParticipant.findOne({
      where: {
        auction_id,
        user_id,
      },
    });

    if (!participant) {
      throw new Error('Участник не найден');
    }

    participant.status = status;
    await participant.save();

    return participant
  } catch (err) {
    throw new Error(JSON.stringify({
      message: 'Ошибка при одобрении участника',
      error: err.message,
    }));
  }
};

exports.report = async (req, res) => {
  try {
    const { id } = req.params;
    const auction = await Auction.findByPk(id, {
      include: [{
        model: Lot,
        as: 'lots',
        include: [
          {
            model: Offer,
            as: 'winner_offer',
            required: false,

          },
          {
            model: User,
            as: 'winner',
            attributes: ['id', 'name'],
            required: false
          }
        ]
      }]
    });
    res.json(auction);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при создании отчета', error: error.message });
  }
};
