/**
 * Cahuita's Taste — Gmail Confirmation Email Tool
 * Sends branded HTML confirmation email to the guest
 */

const { google }   = require('googleapis');
const fs           = require('fs');
const path         = require('path');
const Handlebars = require('handlebars');
Handlebars.registerHelper('eq', (a, b) => a === b);

// ── Build Gmail OAuth2 client ─────────────────────────────────────────────────
function getGmailClient() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth });
}

// ── Send confirmation email ───────────────────────────────────────────────────
async function sendConfirmationEmail(params) {
  const {
    guestName, guestEmail, headcount,
    classDate, classTime, totalAmount,
    invoiceAmount, isDeposit, balanceDue, daysUntilClass
  } = params;

  // Load and compile the HTML template
  const templatePath = path.join(__dirname, '../templates/confirmation_email.html');
  const templateSource = fs.readFileSync(templatePath, 'utf8');
  const template = Handlebars.compile(templateSource);

  // Balance due date (3 days before class)
  const classDt = new Date(classDate);
  const balanceDueDt = new Date(classDt);
  balanceDueDt.setDate(balanceDueDt.getDate() - 3);
  const balanceDueDate = balanceDueDt.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const firstName = guestName.split(' ')[0];

  const html = template({
    guestName,
    firstName,
    guestEmail,
    headcount,
    classDate,
    classTime,
    totalAmount:   totalAmount.toFixed(2),
    invoiceAmount: invoiceAmount.toFixed(2),
    balanceDue:    balanceDue.toFixed(2),
    balanceDueDate,
    isDeposit,
    daysUntilClass,
    menuLink:       'https://heyzine.com/flip-book/4b8a8b7f7f.html',
    youtubeLink:    'https://youtube.com/shorts/Tu_UYIuQ_vc?si',
    directionsLink: 'https://maps.app.goo.gl/WmWjgkQhcTuRZR9y5',
    whatsapp:       '+506 8484 8107',
    websiteUrl:     'www.cahuitastaste.com',
  });

  // Build the email
  const subject = `🌴 You're Confirmed! Caribbean Cooking Class — ${classDate}`;
  const emailLines = [
    `From: "Cahuita's Taste" <${process.env.GMAIL_SENDER_EMAIL}>`,
    `To: ${guestEmail}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    html,
  ];

  const raw = Buffer.from(emailLines.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const gmail = getGmailClient();
  const result = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  console.log(`📧 Confirmation email sent to ${guestEmail} (Message ID: ${result.data.id})`);

  return {
    success: true,
    messageId: result.data.id,
    message: `Confirmation email sent to ${guestEmail}`,
  };
}

module.exports = { sendConfirmationEmail };
