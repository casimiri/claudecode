import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

// Plan tier hierarchy for upgrade/downgrade logic
const PLAN_TIERS = {
  'free': 0,
  [process.env.STRIPE_PRICE_WEEKLY]: 1,
  [process.env.STRIPE_PRICE_MONTHLY]: 2,
  [process.env.STRIPE_PRICE_YEARLY]: 3
};

// Reverse mapping for tier names
const TIER_NAMES = {
  0: 'free',
  1: 'weekly',
  2: 'monthly', 
  3: 'yearly'
};

// In-memory user database simulation
// Structure: { email: { subscriptionId, priceId, customerId } }
const userDatabase = new Map();

// Helper functions
const getTierLevel = (priceId) => {
  return PLAN_TIERS[priceId] || 0;
};

const getTierName = (priceId) => {
  const tier = getTierLevel(priceId);
  return TIER_NAMES[tier] || 'free';
};

const canUpgrade = (currentPriceId, newPriceId) => {
  const currentTier = getTierLevel(currentPriceId);
  const newTier = getTierLevel(newPriceId);
  return newTier > currentTier;
};

const getUser = (email) => {
  return userDatabase.get(email) || null;
};

const setUser = (email, userData) => {
  userDatabase.set(email, userData);
};

const removeUser = (email) => {
  userDatabase.delete(email);
};

// Find user by subscription ID
const findUserBySubscriptionId = (subscriptionId) => {
  for (const [email, userData] of userDatabase.entries()) {
    if (userData.subscriptionId === subscriptionId) {
      return { email, ...userData };
    }
  }
  return null;
};

export {
  stripe,
  PLAN_TIERS,
  TIER_NAMES,
  getTierLevel,
  getTierName,
  canUpgrade,
  getUser,
  setUser,
  removeUser,
  findUserBySubscriptionId,
  userDatabase
};