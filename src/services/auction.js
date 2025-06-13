const { Offer } = require('../models');
const Auction = require('../models/Auction');
const Deal = require('../models/Deal');
const cron = require('node-cron');

exports.createAuction = async (createAuction, user_id, io) => {
  try {
    if(closing_type === 'auto'){
      cron.schedule('* * * * *', async () => {
        const now = new Date();
        const auctionsToFinish = await Auction.findAll({
          where: {
            closing_type: 'auto',
            end_time: { [Op.lte]: now },
          },
          include: [Offer],
        });
        for (const auction of auctionsToFinish) {
          auction.status = 'finished';
          await auction.save();
          const bestOffer = auction.Offers?.sort((a, b) => b.percent - a.percent)[0];
          if (bestOffer) {
            await Deal.create({ user_id, ...JSON.parse(createAuction) });
          }
          io.emit('auction:finished', auction);
        }
      });
    }
    const auction = await Auction.create({ user_id, ...JSON.parse(createAuction) });
    return auction
  } catch (err) {
    throw new Error(JSON.stringify({ message: 'Ошибка при создании аукциона', error: err.message }));
  }
};

exports.getAuctions = async () => {
  try {
    const auctions = await Auction.findAll({
      where: { status: 'open' },
      order: [['createdAt', 'DESC']],
    });
    return auctions
  } catch (err) {
    throw new Error(JSON.stringify({ message: 'Ошибка при получении аукционов', error: err.message }));
  }
};

exports.getAuctionOffers = async (auction_id) => {
  try {
    const offers = await Offer.findAll({ where: { auction_id } });
    console.log('offers', offers)
    return offers
  } catch (err) {
    throw new Error(JSON.stringify({ message: 'Ошибка при получении предложений', error: err.message }));
  }
};

exports.getAuctionSelfOffer = async (auction_id, user_id) => {
  try {
    const offer = await Offer.findOne({ where: { auction_id, user_id } });
    console.log(
      'offer',
      offer
    )
    return offer
  } catch (err) {
    throw new Error(JSON.stringify({ message: 'Ошибка при получении предложений', error: err.message }));
  }
};

exports.chooseWinner = async (req, res) => {
  const auctionId = req.params.id;
  const { offer_id } = req.body;

  try {
    const auction = await Auction.findByPk(auctionId);
    if (!auction) return res.status(404).json({ message: 'Аукцион не найден' });

    const offer = await Offer.findOne({ where: { id: offer_id, auction_id: auctionId } });
    if (!offer) return res.status(400).json({ message: 'Заявка не найдено' });

    // Обновляем победителя
    auction.winner_id = offer.user_id;
    auction.status = 'closed';
    await auction.save();

    const isDeal = await Deal.findOne({ 
      where: { 
        auction_id: auction.id, 
        offer_id: offer.id, 
        user_id: offer.user_id 
      } 
    });
    if (isDeal) return res.status(400).json({ message: 'Сделка уже создана' });
    // Создаём сделку
    await Deal.create({
      auction_id: auction.id,
      offer_id: offer.id,
      user_id: offer.user_id,
      percent: offer.percent,
      amount: offer.amount || null
    });

    res.json({ message: 'Аукцион завершен' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при завершении аукциона', error: error.message });
  }
};

exports.getAuctionById = async (req, res) => {
  try {
    const { id } = req.params;

    const auction = await Auction.findOne({ where: { id } });

    if (!auction) return res.status(404).json({ message: 'Аукцион не найден' });

    res.json(auction);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при получении аукциона', error: err.message });
  }
};
