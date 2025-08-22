const { Op, Sequelize } = require('sequelize');
const { Lot, Offer, Deal, Auction, AuctionParticipant, User, UserInfo } = require('../models');
const cron = require('node-cron');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const sequelize = require('../config/database');

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
            where: { status: 'pending' },
            as: 'offers',
            separate: true,
            order: [['percent', 'DESC']],
          }]
        }]
      });
      console.log('🟢 auctions', auctions.length);
      for (const auction of auctions) {
        for (const lot of auction.lots) {
          const offers = lot.offers;

          if (!offers.length) continue;
          const maxPercent = offers[0].percent;
          const topOffers = offers.filter(offer => offer.percent === maxPercent);
          // Если больше 2-х лидеров — переводим в ручной режим
          if (topOffers.length >= 2) {
            auction.closing_type = 'manual';
          }

          // Если ровно 1 лидер — добавляем в победители
          else if (topOffers.length === 1) {
            const winner = topOffers[0];
            auction.status = 'finished';
            lot.status = 'finished';
            winner.status = 'accepted';
              // Все остальные заявки — rejected
            for (const offer of offers) {
              if (offer.id !== winner.id) {
                offer.status = 'rejected';
                await offer.save();
              }
            }
            await Deal.create({
              auction_id: auction.id,
              lot_id: lot.id,
              offer_id: winner.id,
              percent: winner.percent,
              user_id: winner.user_id,
              amount: lot.volume
            });
            await lot.save()
            await winner.save();
          }
        }
        await auction.save();
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



exports.closeLotManually = async (lot_id) => {
  const t = await sequelize.transaction();

  try {
    const lot = await Lot.findByPk(lot_id, { transaction: t });
    if (!lot) throw new Error(JSON.stringify({ message: 'Лот не найден' }));

    // Получаем все pending-заявки
    const pendingOffers = await Offer.findAll({
      where: { lot_id, status: 'pending' },
      order: [['percent', 'DESC']],
      transaction: t
    });

    if (!pendingOffers.length) {
      lot.status = 'expired';
      await lot.save({ transaction: t });
      await t.commit();
      return { message: 'Нет заявок в этом лоте' };
    }

    // Находим максимальный процент
    const maxPercent = pendingOffers[0].percent;

    // Фильтруем только лидеров
    const topOffers = pendingOffers.filter(o => o.percent === maxPercent);

    // Делим объём лота между ними
    const share = lot.volume / topOffers.length;

    for (const offer of topOffers) {
      offer.status = 'accepted';
      await offer.save({ transaction: t });

      await Deal.create({
        auction_id: lot.auction_id,
        lot_id: lot.id,
        offer_id: offer.id,
        user_id: offer.user_id,
        percent: offer.percent,
        amount: share
      }, { transaction: t });
    }

    // Остальным меняем статус на rejected
    const losers = pendingOffers.filter(o => o.percent < maxPercent);
    for (const offer of losers) {
      offer.status = 'rejected';
      await offer.save({ transaction: t });
    }

    // Закрываем лот
    lot.status = 'finished';
    await lot.save({ transaction: t });

    // Если все лоты закрыты — закрываем аукцион
    const openLots = await Lot.count({
      where: { auction_id: lot.auction_id, status: 'open' },
      transaction: t
    });
    if (openLots === 0) {
      await Auction.update(
        { status: 'finished' },
        { where: { id: lot.auction_id }, transaction: t }
      );
    }

    await t.commit();
    return { message: 'Лот закрыт' };

  } catch (error) {
    await t.rollback();
    throw new Error(JSON.stringify({
      message: 'Ошибка при ручном завершении лота',
      error: error.message
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

exports.getAuctionReport = async (req, res) => {
  // Находим аукцион с лотами, офферами и сделками
  const { id } = req.params;
  const auction = await Auction.findByPk(id, {
    include: [
      {
        model: Lot,
        as: 'lots',
        include: [
          {
            model: Offer,
            as: 'offers',
            // where: { status: 'accepted' },
            include: [
              {
                model: User,
                as: 'user',
                include: [{ model: UserInfo, as: 'user_info' }]
              },
              {
                model: Deal,
                include: [
                  {
                    model: Offer,
                    include: [
                      {
                        model: User,
                        as: 'user',
                        include: [{ model: UserInfo, as: 'user_info' }]
                      }
                    ]
                  }
                ]
              }
            ]
          },
        ]
      },
      {
        model: AuctionParticipant,
        as: 'participants'
      }
    ]
  });

  if (!auction) {
    throw new Error('Аукцион не найден');
  }

  // Общая информация
  const generalInfo = {
    date: auction.createdAt, // или другое поле с датой
    totalVolume: auction.lots.reduce((sum, lot) => sum + lot.volume, 0),
    participantsCount: auction.participants?.length || 0
  };

  // Ведомость поступивших заявок
  const offersTable = auction.lots.flatMap(lot =>
    lot.offers.map(o => ({
      bank: o.user.user_info?.bank_name || o.user.name,
      lotId: lot.id,
      lotAsset: lot.asset,
      lotPercent: lot.percent,
      lotTermMonth: lot.term_month,
      depositAmount: o.volume,
      offerPercent: o.percent
    }))
  );

// Итоги размещения
const dealsTable = auction.lots.flatMap(lot =>
  (lot.offers || []).flatMap(offer =>
    (offer.Deal ? [{
      bank: offer.user?.user_info?.bank_name || offer.user?.name || '—',
      lotId: lot.id,
      lotAsset: lot.asset,
      lotPercent: lot.percent,
      lotTermMonth: lot.term_month,
      depositAmount: offer.Deal.amount,
      offerPercent: offer.percent
    }] : [])
  )
);

  return res.json({
    generalInfo,
    offersTable,
    dealsTable
  });
};