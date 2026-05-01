# LAUNCH_CHECKLIST.md — AIRA Study Centre Production Launch

## Pre-Launch Checklist

### 1. DNS & HTTPS
- [ ] Domain (`airastudycentre.com`) pointed to hosting provider (Netlify/Vercel)
- [ ] SSL certificate provisioned and active (automatic on Netlify/Vercel)
- [ ] HTTPS redirect verified — visit `http://` and confirm redirect to `https://`
- [ ] HSTS header confirmed via [securityheaders.com](https://securityheaders.com)
- [ ] All pages load without mixed content warnings

### 2. Environment Variables
- [ ] Copy `.env.example` to `.env` and fill in ALL values
- [ ] Run `node build.js` — verify no warnings in output
- [ ] Deploy from `dist/` directory (not `src/`)

### 3. Google Analytics 4 (GA4)
- [ ] Create GA4 property at [analytics.google.com](https://analytics.google.com)
- [ ] Copy Measurement ID (G-XXXXXXXXXX) to `.env`
- [ ] Rebuild and deploy
- [ ] Visit site → check GA4 Realtime → confirm page view appears
- [ ] Click a CTA button → verify `cta_click` event in GA4 DebugView
- [ ] Click WhatsApp float → verify `whatsapp_click` event
- [ ] Scroll to bottom → verify `scroll_depth` events (25/50/75/100)
- [ ] Focus a form input → verify `form_start` event

### 4. Cookie Consent
- [ ] Clear cookies → visit site → consent banner appears
- [ ] Click "Decline" → verify banner disappears, GA4 NOT loaded
- [ ] Clear cookies → visit site → click "Accept" → verify GA4 loads
- [ ] Navigate to another page → verify consent persists (no banner)
- [ ] Check `aira_consent` cookie exists in browser DevTools

### 5. Google Apps Script
- [ ] Create Google Sheet with tabs: Raw Submissions, Duplicates, SuspiciousSubmissions, Errors, Dashboard
- [ ] Deploy Code.gs as Web App (see Code.gs header comments)
- [ ] Copy deployment URL to `.env` as `SHEET_WEBHOOK_URL`
- [ ] Test: `curl -X POST {URL} -H "Content-Type: application/json" -d '{"form_type":"demo","student_name":"Test","grade":9,"subject":"Maths","phone":"9876543210","timestamp":"2026-01-01T00:00:00Z"}'`
- [ ] Verify row appears in "Raw Submissions" sheet
- [ ] Verify admin email notification received
- [ ] Set up triggers (Edit → Triggers) for:
  - [ ] `buildDashboard()` — Daily 6 AM IST
  - [ ] `sendDailyReport()` — Daily 7 AM IST
  - [ ] `runIntegrityChecks()` — Daily 5 AM IST

### 6. Supabase
- [ ] Create Supabase project at [supabase.com](https://supabase.com)
- [ ] Run `supabase/schema.sql` in SQL Editor
- [ ] Verify tables created: leads, audit_log, integrity_checks
- [ ] Copy project URL and anon key to `.env`
- [ ] Test RLS: as anon, INSERT should work; SELECT should be blocked
- [ ] Test RLS: as authenticated admin, SELECT/UPDATE/DELETE should work
- [ ] Deploy Edge Function: `supabase functions deploy submit-lead`
- [ ] Set Edge Function secrets: `supabase secrets set RECAPTCHA_SECRET_KEY=... SHEET_WEBHOOK_URL=...`
- [ ] Test Edge Function endpoint with curl

### 7. reCAPTCHA v3
- [ ] Create site at [google.com/recaptcha/admin](https://www.google.com/recaptcha/admin)
- [ ] Select reCAPTCHA v3
- [ ] Add production domain
- [ ] Copy Site Key to `.env` as `RECAPTCHA_SITE_KEY`
- [ ] Copy Secret Key to `.env` as `RECAPTCHA_SECRET_KEY`
- [ ] Also set Secret Key in Apps Script `Code.gs` and Supabase Edge Function secrets
- [ ] Rebuild and deploy
- [ ] Submit a form → check reCAPTCHA badge appears in bottom-right

### 8. Form Submission End-to-End
- [ ] Submit `#demoForm` with valid data → success message shown
- [ ] Verify data appears in: Supabase leads table AND Google Sheet
- [ ] Submit same phone number again within 60 seconds → rate limit message shown
- [ ] Submit same phone + form_type within 24 hours → duplicate handling works
- [ ] Submit with invalid phone (e.g., "123") → inline validation error shown
- [ ] Submit with empty name → inline validation error shown
- [ ] Disconnect internet → submit → reconnect → verify queued submission retries

### 9. Security Headers
- [ ] Visit [securityheaders.com](https://securityheaders.com) → scan production URL
- [ ] Target: Grade A or A+
- [ ] Verify CSP: open DevTools Console → no CSP violations on any page
- [ ] Verify X-Frame-Options: try embedding site in iframe → should be blocked
- [ ] Verify SRI: inspect CDN script tags → `integrity` attribute present

### 10. Performance & Visual Regression
- [ ] All 5 pages load without JavaScript errors (check DevTools Console)
- [ ] GSAP animations work (scroll down, cards animate in)
- [ ] Three.js hero scene renders on homepage
- [ ] Lenis smooth scroll functions
- [ ] Custom cursor works on desktop
- [ ] Mobile responsive: test at 375px, 768px, 1024px widths
- [ ] WhatsApp floating button visible and clickable on all pages
- [ ] Run Lighthouse audit → target: Performance > 85, Accessibility > 90

### 11. Backup & Monitoring
- [ ] (Optional) Set up GCS bucket for daily backups
- [ ] Verify Supabase PITR is enabled (Pro plan)
- [ ] Subscribe to GA4 email alerts for traffic anomalies
- [ ] Set up Uptime monitoring (e.g., UptimeRobot) for production URL

## Post-Launch (First 48 Hours)
- [ ] Monitor GA4 Realtime for traffic
- [ ] Check Apps Script Errors sheet for any failures
- [ ] Verify daily email report arrives at 7 AM IST
- [ ] Verify Dashboard sheet updates at 6 AM IST
- [ ] Check Supabase leads table for incoming submissions
- [ ] Review reCAPTCHA analytics at [google.com/recaptcha/admin](https://www.google.com/recaptcha/admin)
