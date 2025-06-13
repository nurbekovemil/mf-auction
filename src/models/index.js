const User = require('./User');
const Auction = require('./Auction');
const Offer = require('./Offer');
const Deal = require('./Deal');

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
module.exports = {
  User,
  Offer,
  Auction,
  Deal
};