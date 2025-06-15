const User = require('./User');
const Auction = require('./Auction');
const Offer = require('./Offer');
const Deal = require('./Deal');
const AuctionParticipant = require('./AuctionParticipant');

// User ↔ Offer
User.hasMany(Offer, { foreignKey: 'user_id', as: 'offers' });
Offer.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Auction ↔ Offer
Auction.hasMany(Offer, { foreignKey: 'auction_id', as: 'offers' });
Offer.belongsTo(Auction, { foreignKey: 'auction_id', as: 'auction' });
Deal.belongsTo(User, { foreignKey: 'user_id' });
Deal.belongsTo(Auction, { foreignKey: 'auction_id' });
Deal.belongsTo(Offer, { foreignKey: 'offer_id' });

Auction.belongsTo(User, { as: 'winner', foreignKey: 'winner_user_id' });
User.hasMany(Auction, { as: 'won_auctions', foreignKey: 'winner_user_id' });

Auction.belongsTo(Offer, { as: 'winner_offer', foreignKey: 'winner_offer_id' });
Offer.hasOne(Auction, { as: 'won_auction', foreignKey: 'winner_offer_id' });

User.hasMany(Deal, { foreignKey: 'user_id' });
Auction.hasMany(Deal, { foreignKey: 'auction_id' });
Offer.hasOne(Deal, { foreignKey: 'offer_id' });

// 🔗 User ↔ Auction (через AuctionParticipant)
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
  Deal,
  AuctionParticipant
};