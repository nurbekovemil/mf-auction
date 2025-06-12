const Offer = require('../models/Offer');
const Auction = require('../models/Auction');
const User = require('../models/User');

exports.createOffer = async (createOffer, user_id) => {
  try {
    const { auction_id, percent, volume } = createOffer;

    // Проверка: аукцион существует и открыт
    const auction = await Auction.findByPk(auction_id);
    if (!auction || auction.status !== 'open') {
      throw new Error(JSON.stringify({ message: 'Аукцион недоступен' }));
    }
    const isOffer = await Offer.findOne({ where: { auction_id, user_id, percent, volume } });
    if (isOffer) throw new Error(JSON.stringify({ message: 'Вы уже создали заявку с такими параметрами' }));

    const offer = await Offer.create({
      auction_id,
      user_id,
      percent,
      volume,
    });

    return offer
  } catch (error) {
    throw new Error(JSON.stringify({ message: 'Ошибка при создании предложения', error: error.message }));
  }
};

exports.getOffersByAuction = async (req, res) => {
  try {
    const { auctionId } = req.params;

    const offers = await Offer.findAll({
      where: { auction_id: auctionId },
      order: [['percent', 'DESC']], // сортировка по приоритету
      include: [{
        model: User,
        as: 'user', // 👈 должен совпадать с ассоциацией выше
        attributes: ['id', 'name', 'email']
      }]
    });

    res.json(offers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка при получении офферов', error: error.message });
  }
};

