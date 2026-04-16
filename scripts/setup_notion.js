/**
 * Cahuita's Taste — Notion Database Setup Script
 * Run once: node scripts/setup_notion.js
 * Creates the Cooking Class database under your Cahuita's Taste Notion page
 */

require('dotenv').config();
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function createCookingClassDatabase() {
  console.log("🌴 Creating Cahuita's Taste Cooking Class database in Notion...\n");

  const parentPageId = process.env.NOTION_PARENT_PAGE_ID;
  if (!parentPageId) {
    throw new Error('NOTION_PARENT_PAGE_ID is not set in your .env file');
  }

  const database = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    icon:   { type: 'emoji', emoji: '🍽️' },
    cover: {
      type: 'external',
      external: { url: 'https://www.cahuitastaste.com/banner.jpg' }
    },
    title: [
      {
        type: 'text',
        text: { content: "Cahuita's Taste — Cooking Classes" },
      },
    ],
    properties: {
      // ── Primary field ─────────────────────────────────────────────────────
      'Guest Name': { title: {} },

      // ── Guest Contact ──────────────────────────────────────────────────────
      'Email':  { email: {} },
      'Phone':  { phone_number: {} },

      // ── Class Details ──────────────────────────────────────────────────────
      'Class Date':       { date: {} },
      'Class Time':       { rich_text: {} },
      'Number of Guests': { number: { format: 'number' } },
      'Booking Reference':{ rich_text: {} },

      // ── Financials ─────────────────────────────────────────────────────────
      'Total Booking Value': { number: { format: 'dollar' } },
      'Invoice Amount':      { number: { format: 'dollar' } },
      'Revenue Expected':    { number: { format: 'dollar' } },
      'Revenue Collected':   { number: { format: 'dollar' } },
      'Payment Type': {
        select: {
          options: [
            { name: '50% Deposit', color: 'yellow' },
            { name: 'Full Payment', color: 'green'  },
          ],
        },
      },

      // ── Status ─────────────────────────────────────────────────────────────
      'Booking Status': {
        select: {
          options: [
            { name: 'Confirmed',  color: 'green'  },
            { name: 'Pending',    color: 'yellow' },
            { name: 'Cancelled',  color: 'red'    },
            { name: 'Completed',  color: 'blue'   },
          ],
        },
      },
      'Invoice Status': {
        select: {
          options: [
            { name: 'Sent',    color: 'yellow' },
            { name: 'Paid',    color: 'green'  },
            { name: 'Overdue', color: 'red'    },
            { name: 'Void',    color: 'gray'   },
          ],
        },
      },
      'Payment Status': {
        select: {
          options: [
            { name: 'Pending',           color: 'yellow' },
            { name: 'Deposit Paid',      color: 'blue'   },
            { name: 'Paid',              color: 'green'  },
            { name: 'Refunded',          color: 'red'    },
            { name: 'Payment Failed',    color: 'red'    },
          ],
        },
      },
      'Menu Selection': {
        select: {
          options: [
            { name: 'Pending',  color: 'yellow' },
            { name: 'Received', color: 'green'  },
          ],
        },
      },

      // ── Source ─────────────────────────────────────────────────────────────
      'Source': {
        select: {
          options: [
            { name: 'Website / Calendly', color: 'purple' },
            { name: 'GetYourGuide',        color: 'orange' },
            { name: 'Viator',              color: 'blue'   },
            { name: 'WhatsApp / Direct',   color: 'green'  },
            { name: 'Walk-In',             color: 'gray'   },
          ],
        },
      },

      // ── Notes ──────────────────────────────────────────────────────────────
      'Notes': { rich_text: {} },
    },
  });

  console.log('✅ Database created successfully!');
  console.log(`📒 Database ID: ${database.id}`);
  console.log(`🔗 URL: ${database.url}`);
  console.log('\n👉 Add this to your .env file:');
  console.log(`NOTION_DATABASE_ID=${database.id}`);

  return database;
}

createCookingClassDatabase().catch(err => {
  console.error('❌ Error creating database:', err.message);
  process.exit(1);
});
