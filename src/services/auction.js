const { Op } = require('sequelize');
const { Offer, AuctionParticipant } = require('../models');
const Auction = require('../models/Auction');
const Deal = require('../models/Deal');
const cron = require('node-cron');

exports.createAuction = async (createAuction, user_id) => {
  try {
    const auction = await Auction.create({ user_id, ...createAuction });
    return auction
  } catch (err) {
    throw new Error(JSON.stringify({ message: 'Ошибка при создании аукциона', error: err.message }));
  }
};
// exports.scheduledAuctions = () => {
//   cron.schedule('* * * * *', async () => {
//     const now = new Date();
//     const auctionsToFinish = await Auction.findAll({
//       where: {
//         status: 'open',
//         closing_type: 'auto',
//         end_time: { [Op.lte]: now },
//       },
//       include: [
//         {
//           model: Offer,
//           as: 'offers'
//         }
//       ],
//     });
//     for (const auction of auctionsToFinish) {
//       const bestOffer = auction.offers?.sort((a, b) => b.percent - a.percent)[0];
//       if (bestOffer) {
//         auction.winner_user_id = bestOffer.user_id;
//         auction.winner_offer_id = bestOffer.id;
//         auction.status = 'finished';
//         await Deal.create({
//           auction_id: auction.id,
//           offer_id: bestOffer.id,
//           user_id: bestOffer.user_id,
//           percent: bestOffer.percent,
//           amount: bestOffer.volume
//         });
//       } else {
//         auction.status = 'expired';
//       }
//       await auction.save();
//       console.log(`[${now.toISOString()}] ✅ Авто-завершение проверено`);
//     }

//   })
// };
const cron = require('node-cron');
const { Op } = require('sequelize');
const { Lot, Offer, Deal, Auction } = require('../models');

exports.scheduledLots = () => {
  cron.schedule('* * * * *', async () => {
    const now = new Date();

    try {
      // Находим все лоты, которые нужно завершить
      const lotsToFinish = await Lot.findAll({
        where: {
          status: 'open',
          closing_type: 'auto',
          end_time: { [Op.lte]: now }
        },
        include: [{
          model: Offer,
          as: 'offers',
          separate: true,
          order: [['percent', 'DESC']],
          limit: 1
        }]
      });

      for (const lot of lotsToFinish) {
        try {
          const bestOffer = lot.offers?.[0];

          if (bestOffer) {
            lot.winner_user_id = bestOffer.user_id;
            lot.winner_offer_id = bestOffer.id;
            lot.status = 'finished';

            await Deal.create({
              auction_id: lot.auction_id,
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

          // 🔁 Проверка: если все лоты в аукционе завершены, обновим статус аукциона
          const remaining = await Lot.count({
            where: {
              auction_id: lot.auction_id,
              status: 'open'
            }
          });

          if (remaining === 0) {
            await Auction.update(
              { status: 'finished' },
              { where: { id: lot.auction_id } }
            );
          }

        } catch (err) {
          console.error(`[Lot Error] ${lot.id}:`, err.message);
        }
      }

      console.log(`[${now.toISOString()}] ✅ Лоты авто-завершены`);
    } catch (err) {
      console.error('[CRON ERROR]:', err.message);
    }
  });
};

exports.getAuctions = async () => {
  try {
    const auctions = await Auction.findAll({
      where: { status: 'open' },
      order: [['createdAt', 'DESC']],
      include: [{
        model: Lot,
        as: 'lots'
      }]
    });
    return auctions
  } catch (err) {
    throw new Error(JSON.stringify({ message: 'Ошибка при получении аукционов', error: err.message }));
  }
};

exports.getAuctionOffers = async (auction_id) => {
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

    return lotsWithOffers;
  } catch (err) {
    throw new Error(JSON.stringify({ message: 'Ошибка при получении предложений', error: err.message }));
  }
};

exports.getAuctionSelfOffer = async (auction_id, user_id) => {
  try {
    const lots = await Lot.findAll({
      where: { auction_id },
      attributes: ['id'],
    });
    const lotIds = lots.map(lot => lot.id);
    // Получаем все предложения пользователя по этим лотам
    const offers = await Offer.findAll({
      where: {
        lot_id: { [Op.in]: lotIds },
        user_id,
      },
    });

    return offers;
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

exports.closeAuction = async (auction_id, offer_id) => {
  try {
    const auction = await Auction.findByPk(auction_id);
    if (!auction) {
      throw new Error(JSON.stringify({ message: 'Аукцион не найден' }));
    }
    const offer = await Offer.findOne({ where: { id: offer_id, auction_id: auction_id } });
    if (!offer) {
      throw new Error(JSON.stringify({ message: 'Заявка не найдено' }));
    }
    const isDeal = await Deal.findOne({ 
      where: { 
        auction_id: auction.id, 
        offer_id: offer.id, 
        user_id: offer.user_id 
      } 
    });
    if (isDeal) {
      throw new Error(JSON.stringify({ message: 'Вы уже завершили этот аукцион' }));
    }

    // Обновляем победителя
    auction.winner_user_id = offer.user_id;
    auction.winner_offer_id = offer.id;
    auction.status = 'finished';
    await auction.save();
    // Создаём сделку
    const deal = await Deal.create({
      auction_id: auction.id,
      offer_id: offer.id,
      user_id: offer.user_id,
      percent: offer.percent,
      amount: offer.amount || null
    });

    return deal
  } catch (error) {
    throw new Error(JSON.stringify({ message: 'Ошибка при завершении аукциона', error: error.message }));
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
