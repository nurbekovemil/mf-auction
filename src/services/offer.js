const Offer = require('../models/Offer');
const Auction = require('../models/Auction');
const User = require('../models/User');
const { Lot } = require('../models');

exports.createOffer = async (createOffer, user_id) => {
  try {
    const { lot_id, percent } = createOffer;

    // Проверка: аукцион существует и открыт
    const lot = await Lot.findByPk(lot_id);
    if (!lot || lot.status !== 'open') {
      throw new Error(JSON.stringify({ message: 'Лот недоступен' }));
    }
    const isOffer = await Offer.findOne({ where: { lot_id, user_id } });
    if (isOffer) throw new Error(JSON.stringify({ message: 'Вы уже отправили заявку на этот лот' }));

    const offer = await Offer.create({
      lot_id,
      user_id,
      percent,
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

