const User = require('./User');
const Auction = require('./Auction');
const Offer = require('./Offer');
const Deal = require('./Deal');
const AuctionParticipant = require('./AuctionParticipant');
const Lot = require('./Lot');

// Auction → Lot
Auction.hasMany(Lot, { foreignKey: 'auction_id', as: 'lots' });
Lot.belongsTo(Auction, { foreignKey: 'auction_id', as: 'auction' });

// Lot → Offer
Lot.hasMany(Offer, { foreignKey: 'lot_id', as: 'offers' });
Offer.belongsTo(Lot, { foreignKey: 'lot_id', as: 'lot' });

// User → Offer
User.hasMany(Offer, { foreignKey: 'user_id', as: 'offers' });
Offer.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Победители по лоту
Lot.belongsTo(User, { as: 'winner', foreignKey: 'winner_user_id' });
User.hasMany(Lot, { as: 'won_lots', foreignKey: 'winner_user_id' });

Lot.belongsTo(Offer, { as: 'winner_offer', foreignKey: 'winner_offer_id' });
Offer.hasOne(Lot, { as: 'won_lot', foreignKey: 'winner_offer_id' });

// Deal связи
Deal.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Deal, { foreignKey: 'user_id' });

Deal.belongsTo(Auction, { foreignKey: 'auction_id' });
Auction.hasMany(Deal, { foreignKey: 'auction_id' });

Deal.belongsTo(Offer, { foreignKey: 'offer_id' });
Offer.hasOne(Deal, { foreignKey: 'offer_id' });

// User ↔ Auction через участников
User.belongsToMany(Auction, {
  through: AuctionParticipant,
  foreignKey: 'user_id',
  otherKey: 'auction_id',
  as: 'joined_auctions',
});

Auction.belongsToMany(User, {
  through: AuctionParticipant,
  foreignKey: 'auction_id',
  otherKey: 'user_id',
  as: 'participants',
});

module.exports = {
  User,
  Offer,
  Auction,
  Lot,
  Deal,
  AuctionParticipant
};
