# CHANGELOG.md — AIRA Study Centre

## [1.0.0] — 2026-04-24 — Production Readiness Release

### Module 1 — Website Traffic Monitoring

| File | Purpose |
|------|---------|
| `src/analytics.js` | GA4 event tracking (CTA clicks, WhatsApp clicks, scroll depth, form interactions), UTM persistence in sessionStorage |
| `src/consent-banner.js` | GDPR-style cookie consent banner; gates GA4 and Hotjar loading behind user consent |
| `src/web-vitals-report.js` | Core Web Vitals (LCP, FID, CLS, TTFB, INP) reporting to GA4 custom events |

### Module 2 — Form Data → Google Sheets with Dashboard

| File | Purpose |
|------|---------|
| `apps-script/Code.gs` | Google Apps Script POST endpoint with deduplication, reCAPTCHA verification, rate limiting, admin email notifications |
| `apps-script/Dashboard.gs` | Dashboard builder (daily/weekly/monthly stats), daily email report, integrity checks, GCS backup |
| `src/form-handler.js` | Unified form submission handler with validation, rate limiting, reCAPTCHA, async POST, offline queue fallback |

### Module 3 — Security & Hardening

| File | Purpose |
|------|---------|
| `src/sanitize.js` | Client-side input sanitization: HTML stripping, Indian phone validation, grade/subject validation, inline error display |
| `netlify.toml` | Netlify deployment config with CSP, HSTS, and security headers |
| `vercel.json` | Vercel deployment config with equivalent security headers |
| `SECURITY.md` | Dependency audit: all CDN libraries, versions, SRI hashes, CVE status |

### Module 4 — Database & Data Integrity

| File | Purpose |
|------|---------|
| `supabase/schema.sql` | PostgreSQL schema (leads, audit_log, integrity_checks), RLS policies, deduplication index, audit triggers |
| `supabase/functions/submit-lead/index.ts` | Deno Edge Function: Zod validation, reCAPTCHA, duplicate check, lead insert, Sheet sync |
| `src/offline-queue.js` | IndexedDB offline queue using idb-keyval for failed submission retry |

### Configuration & Documentation

| File | Purpose |
|------|---------|
| `.env.example` | Environment variable template with all required secrets |
| `build.js` | Build script: .env injection, SRI hash generation, src/ → dist/ output |
| `CHANGELOG.md` | This file — documents all new files and their purpose |
| `LAUNCH_CHECKLIST.md` | Production launch checklist covering DNS, HTTPS, GA4, Apps Script, Supabase, reCAPTCHA, consent |

### Modified Files

| File | Changes |
|------|---------|
| `src/script.js` | Removed form submission handler (replaced by `form-handler.js`); kept navbar and mobile toggle logic |
| `src/contact.html` | Added `name` attributes to form inputs, added phone field to #diagnosticForm |
| `src/Aira_website.html` | Added new `<script>` tags for analytics, consent, web-vitals, sanitize, form-handler, reCAPTCHA, idb-keyval; added HTTPS redirect and CSP meta tag |
| `src/about.html` | Same script additions as above |
| `src/programs.html` | Same script additions as above |
| `src/results.html` | Same script additions as above |

### NOT Modified (Protected Files)

| File | Status |
|------|--------|
| `src/style.css` | ✅ Untouched |
| `src/animations.js` | ✅ Untouched |
| `src/three-scene.js` | ✅ Untouched |
| `src/smooth-scroll.js` | ✅ Untouched |
| `src/cursor.js` | ✅ Untouched |
