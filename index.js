/**
 * Cahuita's Taste — Cooking Class Booking Agent
 * Main server: receives Calendly webhooks and triggers the Claude agent
 */

require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const { runBookingAgent } = require('./agent');

const app = express();
app.use(express.json());

// ── Health check ────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'Cahuita\'s Taste Booking Agent is running 🌴' });
});

// ── Calendly Webhook ─────────────────────────────────────────────────────────
app.post('/webhook/calendly', async (req, res) => {
  try {
    // Verify Calendly webhook signature (security)
    const signature = req.headers['calendly-webhook-signature'];
    if (process.env.CALENDLY_WEBHOOK_SECRET && signature) {
      const isValid = verifyCalendlySignature(
        JSON.stringify(req.body),
        signature,
        process.env.CALENDLY_WEBHOOK_SECRET
      );
      if (!isValid) {
        console.error('❌ Invalid Calendly webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const { event, payload } = req.body;

    // Only process new bookings (not cancellations)
    if (event !== 'invitee.created') {
      return res.json({ message: `Event type "${event}" ignored.` });
    }

    console.log('📅 New booking received:', payload?.invitee?.email);

    // Acknowledge receipt immediately (Calendly requires fast response)
    res.json({ received: true });

    // Parse booking data from Calendly payload
    const booking = parseCalendlyPayload(payload);
    console.log('📋 Parsed booking:', booking);

    // Run the Claude agent asynchronously
    runBookingAgent(booking).catch(err => {
      console.error('❌ Agent error:', err);
    });

  } catch (err) {
    console.error('❌ Webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Parse Calendly Payload ────────────────────────────────────────────────────
function parseCalendlyPayload(payload) {
  const invitee = payload.invitee || {};
  const event   = payload.event   || {};

  // Extract custom questions answered during booking (name, phone, headcount)
  const answers = {};
  (invitee.questions_and_answers || []).forEach(qa => {
    const q = (qa.question || '').toLowerCase();
    if (q.includes('phone') || q.includes('whatsapp'))  answers.phone     = qa.answer;
    if (q.includes('guest') || q.includes('how many'))  answers.headcount = parseInt(qa.answer) || 1;
    if (q.includes('name'))                              answers.name      = qa.answer;
  });

  return {
    name:       answers.name      || invitee.name      || 'Guest',
    email:      invitee.email     || '',
    phone:      answers.phone     || invitee.phone_number || '',
    headcount:  answers.headcount || 1,
    classDate:  event.start_time  || new Date().toISOString(),
    classEnd:   event.end_time    || '',
    timezone:   invitee.timezone  || 'America/Costa_Rica',
    eventName:  event.name        || 'Caribbean Cooking Class',
    location:   event.location    || 'Cahuita\'s Taste Outdoor Kitchen',
    bookingRef: payload.uri       || `CT-${Date.now()}`,
  };
}

// ── Verify Calendly Signature ─────────────────────────────────────────────────
function verifyCalendlySignature(body, signature, secret) {
  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(body);
    const expected = hmac.digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected,  'hex')
    );
  } catch {
    return false;
  }
}

// ── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌴 Cahuita's Taste Agent running on port ${PORT}`);
});
