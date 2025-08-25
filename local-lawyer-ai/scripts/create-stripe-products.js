#!/usr/bin/env node

/**
 * Script to create Stripe products and prices for token packages
 * Run with: node scripts/create-stripe-products.js
 */

const Stripe = require('stripe');
const fs = require('fs');
const path = require('path');

// Simple .env.local parser
function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          envVars[key] = valueParts.join('=');
        }
      }
    });
    
    Object.keys(envVars).forEach(key => {
      if (!process.env[key]) {
        process.env[key] = envVars[key];
      }
    });
  } catch (error) {
    console.warn('Could not load .env.local file:', error.message);
  }
}

// Load environment variables
loadEnvFile();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil',
});

const TOKEN_PRODUCTS = [
  {
    id: 'tokens-starter-v2',
    name: 'Starter Token Pack',
    description: '1,000,000 AI tokens for legal consultations',
    tokens: 1000000,
    price: 500, // $5.00 in cents
    lookup_key: 'price_token_starter_1m_v2'
  },
  {
    id: 'tokens-popular-v2',
    name: 'Popular Token Pack',
    description: '3,000,000 AI tokens for legal consultations - Most Popular!',
    tokens: 3000000,
    price: 1000, // $10.00 in cents
    lookup_key: 'price_token_popular_3m_v2'
  },
  {
    id: 'tokens-power-v2',
    name: 'Power Token Pack',
    description: '7,000,000 AI tokens for legal consultations - Best Value!',
    tokens: 7000000,
    price: 2000, // $20.00 in cents
    lookup_key: 'price_token_power_7m_v2'
  }
];

async function createStripeProducts() {
  console.log('🚀 Creating Stripe products and prices for token packages...\n');

  for (const product of TOKEN_PRODUCTS) {
    try {
      console.log(`Creating product: ${product.name}`);
      
      // Create product
      const stripeProduct = await stripe.products.create({
        id: product.id,
        name: product.name,
        description: product.description,
        metadata: {
          tokens: product.tokens.toString(),
          type: 'token_package'
        }
      });

      console.log(`✅ Product created: ${stripeProduct.id}`);

      // Create price
      const stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: product.price,
        currency: 'usd',
        lookup_key: product.lookup_key,
        metadata: {
          tokens: product.tokens.toString(),
          package_type: product.id
        }
      });

      console.log(`✅ Price created: ${stripePrice.id} (${stripePrice.lookup_key})`);
      console.log(`   Add to .env.local: NEXT_PUBLIC_STRIPE_PRICE_${product.id.toUpperCase().replace('-', '_')}=${stripePrice.id}\n`);

    } catch (error) {
      if (error.code === 'resource_already_exists') {
        console.log(`⚠️  Product ${product.id} already exists, skipping...`);
        
        // Try to find existing price
        try {
          const prices = await stripe.prices.list({
            product: product.id,
            lookup_keys: [product.lookup_key]
          });
          
          if (prices.data.length > 0) {
            console.log(`✅ Found existing price: ${prices.data[0].id} (${prices.data[0].lookup_key})`);
            console.log(`   Add to .env.local: NEXT_PUBLIC_STRIPE_PRICE_${product.id.toUpperCase().replace('-', '_')}=${prices.data[0].id}\n`);
          }
        } catch (priceError) {
          console.log(`❌ Error finding existing price: ${priceError.message}\n`);
        }
      } else {
        console.error(`❌ Error creating ${product.name}:`, error.message);
      }
    }
  }

  console.log('🎉 Stripe product creation completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Copy the price IDs to your .env.local file');
  console.log('2. Set up webhook endpoint in Stripe Dashboard');
  console.log('3. Configure STRIPE_WEBHOOK_SECRET in .env.local');
  console.log('4. Test the token purchase flow');
}

// Run the script
if (require.main === module) {
  createStripeProducts().catch(console.error);
}

module.exports = { createStripeProducts, TOKEN_PRODUCTS };