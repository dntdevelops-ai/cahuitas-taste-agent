/**
 * Cahuita's Taste — Notion Database Logger
 * Creates a new entry in the Cooking Class database
 */

const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// ── Log booking to Notion ─────────────────────────────────────────────────────
async function logToNotion(params) {
  const {
    guestName, guestEmail, guestPhone,
    headcount, classDate, classTime,
    totalAmount, invoiceAmount, isDeposit,
    bookingRef, invoiceStatus, paymentStatus,
  } = params;

  const databaseId = process.env.NOTION_DATABASE_ID;

  // Revenue fields
  const revenueExpected  = totalAmount;
  const revenueCollected = 0; // updates to invoiceAmount once paid (via PayPal webhook)

  const response = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      // ── Guest Info ──────────────────────────────────────────────────────────
      'Guest Name': {
        title: [{ text: { content: guestName } }],
      },
      'Email': {
        email: guestEmail,
      },
      'Phone': {
        phone_number: guestPhone || '',
      },

      // ── Class Details ───────────────────────────────────────────────────────
      'Class Date': {
        date: { start: new Date(classDate).toISOString().split('T')[0] },
      },
      'Class Time': {
        rich_text: [{ text: { content: classTime || '' } }],
      },
      'Number of Guests': {
        number: headcount,
      },
      'Booking Reference': {
        rich_text: [{ text: { content: bookingRef || '' } }],
      },

      // ── Financials ──────────────────────────────────────────────────────────
      'Total Booking Value': {
        number: totalAmount,
      },
      'Invoice Amount': {
        number: invoiceAmount,
      },
      'Payment Type': {
        select: { name: isDeposit ? '50% Deposit' : 'Full Payment' },
      },
      'Revenue Expected': {
        number: revenueExpected,
      },
      'Revenue Collected': {
        number: revenueCollected,
      },

      // ── Status ──────────────────────────────────────────────────────────────
      'Invoice Status': {
        select: { name: invoiceStatus || 'Sent' },
      },
      'Payment Status': {
        select: { name: paymentStatus || 'Pending' },
      },
      'Booking Status': {
        select: { name: 'Confirmed' },
      },
      'Menu Selection': {
        select: { name: 'Pending' },
      },

      // ── Source ──────────────────────────────────────────────────────────────
      'Source': {
        select: { name: 'Website / Calendly' },
      },
    },
  });

  console.log(`📒 Notion entry created: ${response.id} for ${guestName}`);

  return {
    success: true,
    notionPageId: response.id,
    message: `Booking for ${guestName} logged to Notion (page: ${response.id})`,
  };
}

// ── Update payment status (call this from PayPal webhook when paid) ──────────
async function updatePaymentStatus(bookingRef, amountPaid) {
  // Search for the page by booking reference
  const databaseId = process.env.NOTION_DATABASE_ID;

  const results = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: 'Booking Reference',
      rich_text: { equals: bookingRef },
    },
  });

  if (!results.results.length) {
    throw new Error(`No Notion page found for booking ref: ${bookingRef}`);
  }

  const pageId = results.results[0].id;

  await notion.pages.update({
    page_id: pageId,
    properties: {
      'Payment Status':    { select: { name: 'Paid' } },
      'Invoice Status':    { select: { name: 'Paid' } },
      'Revenue Collected': { number: amountPaid },
    },
  });

  console.log(`✅ Notion payment status updated for booking ${bookingRef}`);
  return { success: true, pageId };
}

module.exports = { logToNotion, updatePaymentStatus };
