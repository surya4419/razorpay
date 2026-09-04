import Razorpay from 'razorpay';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const keyId = process.env.RAZORPAY_KEY_ID?.trim();
const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

console.log('\n======================================================');
console.log('       RAZORPAY LIVE TEST-MODE CREDENTIAL CHECK');
console.log('======================================================\n');

if (!keyId || !keySecret || keyId === 'rzp_test_placeholder' || keySecret === 'placeholder_secret') {
  console.error('❌ ERROR: Missing Razorpay credentials in server/.env');
  console.error('Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env\n');
  process.exit(1);
}

console.log(`🔑 Testing Key ID: ${keyId}`);
console.log(`🔒 Key Secret: [${keySecret.length} characters long]\n`);

const client = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

async function runLiveCheck() {
  let allPassed = true;

  // 1. Test Orders API
  try {
    console.log('1. Testing Orders API (POST /v1/orders)...');
    const order = await client.orders.create({
      amount: 50000, // ₹500.00
      currency: 'INR',
      receipt: `live_check_${Date.now()}`,
      notes: {
        test: 'AI_Revenue_Recovery_Live_Check',
        purpose: 'Buildathon_Validation'
      }
    });

    console.log(`   ✅ Orders API Success! Created Order ID: ${order.id}`);
    console.log(`   Amount: ₹${order.amount / 100} ${order.currency} | Status: ${order.status}`);
  } catch (err) {
    allPassed = false;
    console.error(`   ❌ Orders API Failed: ${err.message || err}`);
    if (err.statusCode === 401 || err.error?.code === 'BAD_REQUEST_ERROR') {
      console.error('   👉 Check if your Key ID and Key Secret match exactly in your Razorpay Dashboard.');
    }
  }

  console.log('');

  // 2. Test Payment Links API
  try {
    console.log('2. Testing Payment Links API (POST /v1/payment_links)...');
    const link = await client.paymentLink.create({
      amount: 150000, // ₹1,500.00
      currency: 'INR',
      accept_partial: false,
      description: 'AI Revenue Recovery Engine — Live Connectivity Test',
      customer: {
        name: 'Razorpay Buildathon Evaluator',
        email: 'evaluator@razorpay.com',
        contact: '+919876543210'
      },
      notify: { sms: false, email: false },
      reminder_enable: false
    });

    console.log(`   ✅ Payment Links API Success! Created Link ID: ${link.id}`);
    console.log(`   Short URL: ${link.short_url}`);
  } catch (err) {
    allPassed = false;
    console.error(`   ❌ Payment Links API Failed: ${err.message || err}`);
  }

  console.log('\n======================================================');
  if (allPassed) {
    console.log('🎉 ALL RAZORPAY LIVE TEST-MODE API CALLS SUCCEEDED!');
    console.log('Your backend is 100% connected and ready for live demo testing.');
  } else {
    console.log('⚠️ Some API calls failed. Please verify your test credentials.');
  }
  console.log('======================================================\n');
}

runLiveCheck();
