/**
 * Cahuita's Taste — Claude Booking Agent
 * The brain: receives booking data, reasons about it, calls tools in order
 */

const Anthropic = require('@anthropic-ai/sdk');
const { createPayPalInvoice } = require('./tools/paypal');
const { sendConfirmationEmail } = require('./tools/gmail');
const { logToNotion }          = require('./tools/notion');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const RATE_PER_PERSON  = 80;   // USD
const DEPOSIT_DAYS_THRESHOLD = 7;  // 7 days or less = full payment

// ── Tool definitions for Claude ───────────────────────────────────────────────
const tools = [
  {
    name: 'create_paypal_invoice',
    description: 'Creates and sends a PayPal invoice to the guest. Determines 50% deposit or 100% full payment based on days until class.',
    input_schema: {
      type: 'object',
      properties: {
        guestName:     { type: 'string',  description: 'Full name of the guest' },
        guestEmail:    { type: 'string',  description: 'Email address of the guest' },
        headcount:     { type: 'number',  description: 'Number of people attending' },
        ratePerPerson: { type: 'number',  description: 'Cost per person in USD' },
        totalAmount:   { type: 'number',  description: 'Total cost (headcount × rate)' },
        invoiceAmount: { type: 'number',  description: 'Amount to invoice (50% or 100% of total)' },
        isDeposit:     { type: 'boolean', description: 'True if this is a 50% deposit invoice' },
        classDate:     { type: 'string',  description: 'ISO date string of the class' },
        bookingRef:    { type: 'string',  description: 'Booking reference ID' },
        daysUntilClass:{ type: 'number',  description: 'Number of days until the class' },
      },
      required: ['guestName','guestEmail','headcount','ratePerPerson','totalAmount','invoiceAmount','isDeposit','classDate','bookingRef','daysUntilClass'],
    },
  },
  {
    name: 'send_confirmation_email',
    description: 'Sends a branded confirmation email to the guest with all class details.',
    input_schema: {
      type: 'object',
      properties: {
        guestName:     { type: 'string', description: 'Full name of the guest' },
        guestEmail:    { type: 'string', description: 'Email address of the guest' },
        headcount:     { type: 'number', description: 'Number of people attending' },
        classDate:     { type: 'string', description: 'Formatted class date (e.g. May 10, 2026)' },
        classTime:     { type: 'string', description: 'Formatted class time in Costa Rica Time' },
        totalAmount:   { type: 'number', description: 'Total cost for the booking' },
        invoiceAmount: { type: 'number', description: 'Amount invoiced (deposit or full)' },
        isDeposit:     { type: 'boolean',description: 'Whether this is a deposit or full payment' },
        balanceDue:    { type: 'number', description: 'Remaining balance after deposit (0 if full payment)' },
        daysUntilClass:{ type: 'number', description: 'Days until class' },
      },
      required: ['guestName','guestEmail','headcount','classDate','classTime','totalAmount','invoiceAmount','isDeposit','balanceDue','daysUntilClass'],
    },
  },
  {
    name: 'log_to_notion',
    description: 'Logs the booking to the Cahuita\'s Taste Notion cooking class database.',
    input_schema: {
      type: 'object',
      properties: {
        guestName:     { type: 'string', description: 'Full name of the guest' },
        guestEmail:    { type: 'string', description: 'Guest email' },
        guestPhone:    { type: 'string', description: 'Guest phone number' },
        headcount:     { type: 'number', description: 'Number of guests' },
        classDate:     { type: 'string', description: 'ISO class date string' },
        classTime:     { type: 'string', description: 'Class time string' },
        totalAmount:   { type: 'number', description: 'Total booking value' },
        invoiceAmount: { type: 'number', description: 'Amount invoiced' },
        isDeposit:     { type: 'boolean',description: 'Whether deposit or full payment' },
        bookingRef:    { type: 'string', description: 'Booking reference' },
        invoiceStatus: { type: 'string', description: 'Invoice status (Sent)' },
        paymentStatus: { type: 'string', description: 'Payment status (Pending)' },
      },
      required: ['guestName','guestEmail','headcount','classDate','totalAmount','invoiceAmount','isDeposit','bookingRef'],
    },
  },
];

// ── Tool executor ─────────────────────────────────────────────────────────────
async function executeTool(toolName, toolInput) {
  console.log(`🔧 Executing tool: ${toolName}`);
  switch (toolName) {
    case 'create_paypal_invoice':
      return await createPayPalInvoice(toolInput);
    case 'send_confirmation_email':
      return await sendConfirmationEmail(toolInput);
    case 'log_to_notion':
      return await logToNotion(toolInput);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// ── Main agent runner ─────────────────────────────────────────────────────────
async function runBookingAgent(booking) {
  console.log('\n🤖 Starting Cahuita\'s Taste Booking Agent...');

  // Calculate key values before sending to Claude
  const classDate    = new Date(booking.classDate);
  const today        = new Date();
  const daysUntil    = Math.ceil((classDate - today) / (1000 * 60 * 60 * 24));
  const totalAmount  = booking.headcount * RATE_PER_PERSON;
  const isDeposit    = daysUntil > DEPOSIT_DAYS_THRESHOLD;
  const invoiceAmt   = isDeposit ? totalAmount * 0.5 : totalAmount;

  // Format date/time for Costa Rica display
  const formattedDate = classDate.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'America/Costa_Rica'
  });
  const formattedTime = classDate.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    timeZone: 'America/Costa_Rica'
  });

  const systemPrompt = `You are the booking automation agent for Cahuita's Taste Soul Food Restaurant in Cahuita, Costa Rica.

Your job is to process a new cooking class booking by:
1. Creating and sending a PayPal invoice (deposit or full payment)
2. Sending a warm, branded confirmation email to the guest
3. Logging the booking to the Notion database

Always execute all three tools in order: PayPal → Email → Notion.
Be warm and Caribbean in tone. The restaurant's brand voice is: warm, authentic, Caribbean soul.

Key info:
- Rate: $${RATE_PER_PERSON}/person
- Deposit rule: 7 days or less = 100% full payment. More than 7 days = 50% deposit now, 50% due 3 days before class
- WhatsApp: +506 8484 8107
- Email: experiencecahuitastaste@gmail.com
- Kitchen directions: https://maps.app.goo.gl/WmWjgkQhcTuRZR9y5
- Menu link: https://heyzine.com/flip-book/4b8a8b7f7f.html
- YouTube preview: https://youtube.com/shorts/Tu_UYIuQ_vc?si`;

  const userMessage = `New cooking class booking received:

Guest Name: ${booking.name}
Email: ${booking.email}
Phone: ${booking.phone || 'Not provided'}
Number of Guests: ${booking.headcount}
Class Date: ${formattedDate}
Class Time: ${formattedTime}
Days Until Class: ${daysUntil}
Total Amount: $${totalAmount.toFixed(2)}
Invoice Amount: $${invoiceAmt.toFixed(2)} (${isDeposit ? '50% deposit' : '100% full payment'})
Is Deposit: ${isDeposit}
Booking Reference: ${booking.bookingRef}

Please process this booking now: create the PayPal invoice, send the confirmation email, and log to Notion.`;

  const messages = [{ role: 'user', content: userMessage }];

  // ── Agentic loop ────────────────────────────────────────────────────────────
  let iterations = 0;
  const MAX_ITERATIONS = 10;

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    console.log(`\n🔄 Agent iteration ${iterations}`);

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages,
    });

    console.log(`📊 Stop reason: ${response.stop_reason}`);

    // Add assistant response to message history
    messages.push({ role: 'assistant', content: response.content });

    // If done, exit loop
    if (response.stop_reason === 'end_turn') {
      const finalText = response.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('\n');
      console.log('\n✅ Agent completed successfully');
      console.log('📝 Summary:', finalText);
      break;
    }

    // Process tool calls
    if (response.stop_reason === 'tool_use') {
      const toolResults = [];

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;

        try {
          const result = await executeTool(block.name, block.input);
          console.log(`✅ Tool ${block.name} succeeded:`, result);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        } catch (err) {
          console.error(`❌ Tool ${block.name} failed:`, err.message);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: `Error: ${err.message}`,
            is_error: true,
          });
        }
      }

      messages.push({ role: 'user', content: toolResults });
    }
  }

  if (iterations >= MAX_ITERATIONS) {
    console.error('❌ Agent hit max iterations limit');
  }

  return { success: true, booking: booking.bookingRef };
}

module.exports = { runBookingAgent };
