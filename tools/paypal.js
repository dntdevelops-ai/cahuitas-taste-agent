/**
 * Cahuita's Taste — PayPal Invoice Tool
 * Creates and sends a PayPal invoice to the guest
 */

const axios = require('axios');

const PAYPAL_BASE = process.env.PAYPAL_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// ── Get PayPal access token ──────────────────────────────────────────────────
async function getAccessToken() {
  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const response = await axios.post(
    `${PAYPAL_BASE}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  return response.data.access_token;
}

// ── Create & send PayPal invoice ─────────────────────────────────────────────
async function createPayPalInvoice(params) {
  const {
    guestName, guestEmail, headcount, ratePerPerson,
    totalAmount, invoiceAmount, isDeposit, classDate,
    bookingRef, daysUntilClass
  } = params;

  const token = await getAccessToken();

  const classDateFormatted = new Date(classDate).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'America/Costa_Rica'
  });

  // Balance due date = 3 days before class
  const balanceDueDate = new Date(classDate);
  balanceDueDate.setDate(balanceDueDate.getDate() - 3);
  const balanceDueDateFormatted = balanceDueDate.toISOString().split('T')[0];

  // Invoice line items
  const items = [
    {
      name: 'Caribbean Cooking Class — Per Person',
      description: `${headcount} guest${headcount > 1 ? 's' : ''} · ${classDateFormatted}`,
      quantity: String(headcount),
      unit_amount: { currency_code: 'USD', value: ratePerPerson.toFixed(2) },
      unit_of_measure: 'QUANTITY',
    }
  ];

  // If deposit, add a line item showing the discount
  if (isDeposit) {
    items.push({
      name: '50% Deposit — Balance Due 3 Days Before Class',
      description: `Remaining $${(totalAmount * 0.5).toFixed(2)} due by ${balanceDueDateFormatted}`,
      quantity: '1',
      unit_amount: { currency_code: 'USD', value: `-${(totalAmount * 0.5).toFixed(2)}` },
      unit_of_measure: 'QUANTITY',
    });
  }

  const invoicePayload = {
    detail: {
      invoice_number: `CT-${bookingRef.slice(-6).toUpperCase()}`,
      invoice_date: new Date().toISOString().split('T')[0],
      currency_code: 'USD',
      note: isDeposit
        ? `50% deposit to confirm your Caribbean Cooking Class on ${classDateFormatted}. Remaining balance of $${(totalAmount * 0.5).toFixed(2)} is due 3 days before your class. Deposit is non-refundable. Cancellations less than 72 hours before the experience forfeit total payment. Questions? WhatsApp: +506 8484 8107 or email experiencecahuitastaste@gmail.com`
        : `Full payment for your Caribbean Cooking Class on ${classDateFormatted}. Payment is non-refundable within 7 days of class. Questions? WhatsApp: +506 8484 8107 or email experiencecahuitastaste@gmail.com`,
      terms_and_conditions: 'By completing payment, the client confirms their booking. Deposit is non-refundable. Cancellations less than 72 hours before the experience forfeit total payment. Menu adjustments can be requested up to 5 days before the event.',
      payment_term: {
        term_type: 'DUE_ON_RECEIPT',
      },
    },
    invoicer: {
      name: { given_name: 'Chef Doria', surname: "Sequeira Sellers" },
      email_address: process.env.PAYPAL_BUSINESS_EMAIL || 'experiencecahuitastaste@gmail.com',
website: 'www.cahuitastaste.com',
business_name: "Cahuita's Taste Soul Food Restaurant",
    },
    primary_recipients: [
      {
        billing_info: {
          name: { full_name: guestName },
          email_address: guestEmail,
        },
      },
    ],
    items,
    amount: {
      breakdown: {
        item_total: { currency_code: 'USD', value: invoiceAmount.toFixed(2) },
      },
    },
  };

  // Step 1: Create draft invoice
  const createRes = await axios.post(
    `${PAYPAL_BASE}/v2/invoicing/invoices`,
    invoicePayload,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );

  const invoiceId = createRes.data.id || createRes.data.href?.split("/").pop() || "INV-" + Date.now();
  console.log(`📄 PayPal invoice created: ${invoiceId}`);

  // Step 2: Send the invoice
  await axios.post(
    `${PAYPAL_BASE}/v2/invoicing/invoices/${invoiceId}/send`,
    { send_to_recipient: true, send_to_invoicer: false },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );

  console.log(`📨 PayPal invoice sent to ${guestEmail}`);

  return {
    success: true,
    invoiceId,
    invoiceAmount,
    isDeposit,
    message: `PayPal invoice ${invoiceId} for $${invoiceAmount.toFixed(2)} sent to ${guestEmail}`,
  };
}

module.exports = { createPayPalInvoice };
