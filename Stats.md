# AIRA Study Centre — Analytics & Email Setup Guide

> **No code changes needed** — this is a setup/configuration guide.

---

## 1. Google Analytics 4 (GA4) — See Who's Visiting

### Setup (one-time, ~5 minutes)

1. Go to [analytics.google.com](https://analytics.google.com) and sign in with your Gmail
2. Click **Admin** (gear icon) → **Create Property**
3. Name it `AIRA Study Centre`, set timezone to `India (GMT+5:30)`
4. Choose **Web** as platform → enter your domain (e.g., `www.airastudycentre.com`)
5. Copy the **Measurement ID** (looks like `G-XXXXXXXXXX`)
6. Paste it into your `.env` file:
   ```
   GA4_MEASUREMENT_ID=G-ABC1234567
   ```
7. Run `node build.js` and redeploy

### What You'll See in GA4

| Report | Where to Find | What It Shows |
|--------|---------------|---------------|
| **Realtime** | Reports → Realtime | Who's on your site RIGHT NOW |
| **Visitors** | Reports → Acquisition → Overview | Total visitors, where they came from (Google, WhatsApp, direct) |
| **Pages** | Reports → Engagement → Pages | Which pages are most visited |
| **Devices** | Reports → Tech → Overview | Mobile vs Desktop, browsers, screen sizes |
| **Location** | Reports → Demographics → Overview | Which cities your visitors are from |
| **CTA Clicks** | Reports → Engagement → Events → `cta_click` | Which buttons people click |
| **WhatsApp Clicks** | Events → `whatsapp_click` | How many people click WhatsApp |
| **Form Starts** | Events → `form_start` | How many people start filling a form |

---

## 2. Email Notifications — When Someone Submits a Form

### Setup (one-time, ~10 minutes)

1. Go to [script.google.com](https://script.google.com) → **New Project**
2. Paste the contents of `apps-script/Code.gs`
3. **Edit line 3** — change `ADMIN_EMAIL`:
   ```javascript
   var ADMIN_EMAIL = 'your.email@gmail.com';  // ← Your Gmail
   ```
4. **Edit line 2** — paste your Google Sheet ID:
   - Create a new Google Sheet
   - Copy the ID from the URL: `docs.google.com/spreadsheets/d/THIS_PART/edit`
   ```javascript
   var SPREADSHEET_ID = 'paste_sheet_id_here';
   ```
5. Click **Deploy** → **New Deployment** → **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy the deployment URL → paste in `.env`:
   ```
   SHEET_WEBHOOK_URL=https://script.google.com/macros/s/AKfycb.../exec
   ```
7. Run `node build.js` and redeploy

### What You'll Get via Email

Every time someone fills a form, you'll receive an email like:

> **Subject:** New AIRA Lead – demo

| Field | Value |
|-------|-------|
| Student Name | Rahul Kumar |
| Grade | 9 |
| Subject | Maths |
| Phone | 9876543210 |
| Page URL | /contact.html |

---

## 3. Daily Email Report — Morning Summary

### Setup (2 minutes, after step 2 is done)

1. In the same Apps Script project, create a second file → paste `apps-script/Dashboard.gs`
2. **Edit line 4**:
   ```javascript
   var DASH_ADMIN_EMAIL = 'your.email@gmail.com';
   ```
3. Go to **Triggers** (clock icon on left) → **Add Trigger**:
   - Function: `sendDailyReport`
   - Event source: Time-driven
   - Type: Day timer
   - Time: **7am to 8am**
4. Click **Save** (authorize when prompted)

### What You'll Get Every Morning at 7 AM

> **Subject:** AIRA Daily Report – 3 leads (23 Apr)

| Metric | Value |
|--------|-------|
| Yesterday's Leads | **3** |
| Week-to-Date Total | **12** |
| Top Performing Grade | **Grade 10** |

> **[Open Google Sheet →]**

---

## Quick Start Order

- [ ] Create GA4 property → get Measurement ID
- [ ] Create Google Sheet → get Sheet ID
- [ ] Deploy Apps Script → get Webhook URL
- [ ] Put all three values in `.env`
- [ ] Run `node build.js`
- [ ] Deploy `dist/` to Netlify/Vercel
- [ ] Set up daily report trigger

> After that, you'll get **real-time analytics in GA4** + **instant email on every lead** + **daily summary at 7 AM**.