const Stripe = require('stripe');
const fs = require('fs');

// Read .env.local file manually
let stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey && fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const match = envContent.match(/STRIPE_SECRET_KEY=(.+)/);
  if (match) {
    stripeSecretKey = match[1].trim();
  }
}

if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY not found in environment or .env.local');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey);

async function findCustomerByEmail() {
  try {
    const email = 'casi.compaore@gmail.com'; // Your email from the debug output
    
    console.log(`🔍 Searching for customers with email: ${email}\n`);
    
    // Search for customers by email
    const customers = await stripe.customers.list({
      email: email,
      limit: 10
    });

    if (customers.data.length === 0) {
      console.log('❌ No customers found with this email address');
      
      // Also search in all customers to see if there are any recent ones
      console.log('\n🔍 Checking recent customers...');
      const allCustomers = await stripe.customers.list({
        limit: 20,
        created: {
          gte: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60) // Last 7 days
        }
      });
      
      console.log(`Found ${allCustomers.data.length} customers in the last 7 days:`);
      allCustomers.data.forEach(customer => {
        console.log(`- ${customer.email || 'No email'} (${customer.id}) - Created: ${new Date(customer.created * 1000).toISOString()}`);
      });
      
    } else {
      console.log(`✅ Found ${customers.data.length} customer(s):`);
      
      for (const customer of customers.data) {
        console.log(`\nCustomer: ${customer.id}`);
        console.log(`Email: ${customer.email}`);
        console.log(`Created: ${new Date(customer.created * 1000).toISOString()}`);
        console.log(`Name: ${customer.name || 'Not set'}`);
        
        // Get subscriptions for this customer
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          limit: 10
        });
        
        console.log(`Subscriptions: ${subscriptions.data.length}`);
        
        subscriptions.data.forEach(sub => {
          console.log(`  - ${sub.id} (${sub.status})`);
          console.log(`    Price ID: ${sub.items?.data?.[0]?.price?.id}`);
          console.log(`    Amount: ${sub.items?.data?.[0]?.price?.unit_amount / 100}`);
          console.log(`    Interval: ${sub.items?.data?.[0]?.price?.recurring?.interval}`);
          console.log(`    Created: ${new Date(sub.created * 1000).toISOString()}`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error searching for customers:', error.message);
  }
}

findCustomerByEmail();