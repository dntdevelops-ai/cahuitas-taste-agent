# 🌴 Cahuita's Taste — Cooking Class Booking Agent

A Claude AI-powered automation agent that handles the entire cooking class booking process automatically — from Calendly confirmation to PayPal invoice, Gmail confirmation email, and Notion database logging.

---

## What It Does

When a guest books a cooking class via your website + Calendly, this agent automatically:

1. **Creates & sends a PayPal invoice** — 50% deposit if 8+ days away, 100% if 7 days or less
2. **Sends a branded confirmation email** via Gmail with class details, menu link, directions, and YouTube preview
3. **Logs the booking** to your Cahuita's Taste Notion database with all guest info, financials, and status fields

**All of this happens in under 10 seconds — with zero manual work.**

---

## Setup Guide

### Step 1 — Install Node.js & Dependencies

```bash
# Make sure Node.js 18+ is installed
node --version

# Install dependencies
npm install
```

---

### Step 2 — Get Your API Credentials

#### A) Anthropic (Claude)
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. Copy it → paste as `ANTHROPIC_API_KEY` in `.env`

#### B) PayPal
1. Go to [developer.paypal.com](https://developer.paypal.com)
2. Log in with your Cahuita's Taste PayPal business account
3. Go to **My Apps & Credentials**
4. Create a new app (name it "Cahuita's Taste Agent")
5. Copy **Client ID** and **Secret** → paste in `.env`
6. Start with `PAYPAL_ENV=sandbox` for testing, change to `production` when ready

#### C) Gmail
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (name it "Cahuita's Taste")
3. Go to **APIs & Services → Enable APIs → Gmail API** → Enable it
4. Go to **APIs & Services → Credentials → Create OAuth 2.0 Client ID**
   - Application type: **Web Application**
   - Authorized redirect URI: `https://developers.google.com/oauthplayground`
5. Copy **Client ID** and **Client Secret** → paste in `.env`
6. Go to [OAuth Playground](https://developers.google.com/oauthplayground)
   - Click the gear icon ⚙️ → check "Use your own OAuth credentials"
   - Enter your Client ID and Secret
   - In Step 1, find and authorize **Gmail API v1** → `https://mail.google.com/`
   - Click **Authorize APIs** → sign in with `experiencecahuitastaste@gmail.com`
   - Click **Exchange authorization code for tokens**
   - Copy the **Refresh Token** → paste as `GMAIL_REFRESH_TOKEN` in `.env`

#### D) Notion
1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **New Integration**
   - Name: "Cahuita's Taste Agent"
   - Associated workspace: your Notion workspace
3. Copy the **Internal Integration Token** → paste as `NOTION_TOKEN` in `.env`
4. Open your **Cahuita's Taste** page in Notion
5. Copy the page ID from the URL:
   - URL format: `notion.so/Your-Page-Name-**XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX**`
   - The ID is the 32-character string at the end
6. Paste as `NOTION_PARENT_PAGE_ID` in `.env`
7. **Share the page with your integration:**
   - Open the Cahuita's Taste page in Notion
   - Click **Share** (top right) → **Invite** → search for "Cahuita's Taste Agent" → invite with **Full access**

---

### Step 3 — Create Your `.env` File

```bash
cp .env.example .env
# Fill in all credentials
nano .env
```

---

### Step 4 — Create the Notion Database

Run the setup script once — it creates the full Cooking Class database under your Cahuita's Taste Notion page:

```bash
npm run setup-notion
```

It will print the `NOTION_DATABASE_ID` — copy that into your `.env` file.

---

### Step 5 — Start the Agent

```bash
npm start
# Agent running on port 3000 ✅
```

---

### Step 6 — Connect Calendly Webhook

1. In Calendly, go to **Integrations → Webhooks**
2. Click **New Webhook Subscription**
3. Set the URL to: `https://your-domain.com/webhook/calendly`
4. Select event: **invitee.created**
5. Copy the **signing key** → paste as `CALENDLY_WEBHOOK_SECRET` in `.env`

---

### Step 7 — Deploy to Production

**Recommended: Railway.app (easiest)**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login & deploy
railway login
railway init
railway up
```

After deploy, Railway gives you a URL like `https://cahuitas-agent.up.railway.app`
Use that as your Calendly webhook URL.

**Alternative: Render.com**
- Connect your GitHub repo
- Set environment variables in the Render dashboard
- Deploy automatically on every push

---

## Testing the Agent

Send a test booking without Calendly:

```bash
curl -X POST http://localhost:3000/webhook/calendly \
  -H "Content-Type: application/json" \
  -d '{
    "event": "invitee.created",
    "payload": {
      "invitee": {
        "name": "Test Guest",
        "email": "test@example.com",
        "timezone": "America/Costa_Rica"
      },
      "event": {
        "name": "Caribbean Cooking Class",
        "start_time": "2026-06-15T17:00:00Z",
        "end_time": "2026-06-15T20:00:00Z"
      },
      "uri": "TEST-REF-001"
    }
  }'
```

---

## Notion Database Fields

| Field | Type | Description |
|-------|------|-------------|
| Guest Name | Title | Full name |
| Email | Email | Guest email |
| Phone | Phone | Guest phone |
| Class Date | Date | Date of class |
| Class Time | Text | Time of class |
| Number of Guests | Number | Headcount |
| Booking Reference | Text | Calendly ref |
| Total Booking Value | Currency | Full amount |
| Invoice Amount | Currency | Charged now |
| Revenue Expected | Currency | Total expected |
| Revenue Collected | Currency | Paid to date |
| Payment Type | Select | Deposit / Full |
| Booking Status | Select | Confirmed / Cancelled / Completed |
| Invoice Status | Select | Sent / Paid / Overdue |
| Payment Status | Select | Pending / Paid |
| Menu Selection | Select | Pending / Received |
| Source | Select | Calendly / GYG / Viator / Direct |
| Notes | Text | Special requests |

---

## Questions or Issues?

Contact DNT Develops for technical support.
# cahuitas-taste-agent
