const { Lot, Auction, User, Offer } = require('../models');
const { Op } = require('sequelize');

exports.createLot = async (lotData) => {
  try {
    // Проверка, существует ли аукцион
    const auction = await Auction.findByPk(lotData.auction_id);
    if (!auction) {
      throw new Error('Аукцион не найден');
    }
    const lot = await Lot.create(lotData);
    return lot;
  } catch (error) {
    throw new Error(error.message);
  }
};

exports.getLotById = async (lotId) => {
  try {
    const lot = await Lot.findByPk(lotId, {
      include: [
        { model: Offer, as: 'offers' },
        { model: Auction, as: 'auction' },
        { model: User, as: 'winner' },
        { model: Offer, as: 'winner_offer' },
      ],
    });

    if (!lot) {
      throw new Error('Лот не найден');
    }

    return lot;
  } catch (error) {
    throw new Error(error.message);
  }
};

exports.getLotsByAuction = async (auctionId) => {
  try {
    const lots = await Lot.findAll({
      where: { auction_id: auctionId },
      include: [
        { model: Offer, as: 'offers' },
        { model: User, as: 'winner' },
        { model: Offer, as: 'winner_offer' },
      ],
    });

    return lots;
  } catch (error) {
    throw new Error(error.message);
  }
};

exports.updateLot = async (lotId, updateData) => {
  try {
    const lot = await Lot.findByPk(lotId);
    if (!lot) {
      throw new Error('Лот не найден');
    }

    await lot.update(updateData);
    return lot;
  } catch (error) {
    throw new Error(error.message);
  }
};

exports.deleteLot = async (lotId) => {
  try {
    const lot = await Lot.findByPk(lotId);
    if (!lot) {
      throw new Error('Лот не найден');
    }

    await lot.destroy();
    return { message: 'Лот успешно удалён' };
  } catch (error) {
    throw new Error(error.message);
  }
};
