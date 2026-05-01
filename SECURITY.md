# SECURITY.md — AIRA Study Centre

## Third-Party Dependency Audit

**Audit Date**: 2026-04-24  
**Audited By**: Build automation (build.js generates SRI hashes)

### CDN Dependencies

| Library | Version | CDN URL | SRI | Status |
|---------|---------|---------|-----|--------|
| Three.js | r160 | `https://cdnjs.cloudflare.com/ajax/libs/three.js/r160/three.min.js` | Generated at build time | ✅ No known CVEs |
| GSAP | 3.12.5 | `https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js` | Generated at build time | ✅ No known CVEs |
| GSAP ScrollTrigger | 3.12.5 | `https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js` | Generated at build time | ✅ No known CVEs |
| Lenis | 1.0.42 | `https://unpkg.com/lenis@1.0.42/dist/lenis.min.js` | Generated at build time | ✅ No known CVEs |
| web-vitals | 3.x | `https://unpkg.com/web-vitals@3/dist/web-vitals.iife.js` | Generated at build time | ✅ No known CVEs |
| idb-keyval | 6.x | `https://unpkg.com/idb-keyval@6/dist/umd.js` | Generated at build time | ✅ No known CVEs |
| Google reCAPTCHA v3 | Latest | `https://www.google.com/recaptcha/api.js` | N/A (Google-managed) | ✅ Google-maintained |

### Version Pinning Rationale

All CDN dependencies are **version-pinned** to specific releases to prevent supply-chain attacks:

- **Three.js r160**: Pinned to r160 (latest stable as of audit date). Three.js uses revision numbers, not semver. Upgrading requires testing the 3D hero scene.
- **GSAP 3.12.5**: Pinned to 3.12.5 (latest in 3.12.x line). GSAP uses a custom license; the free version is sufficient for this project's use.
- **Lenis 1.0.42**: Pinned to 1.0.42. Lenis handles smooth scrolling; upgrading may change scroll behavior.
- **web-vitals 3.x**: Pinned to major version 3. Minor updates are safe as the API is stable.
- **idb-keyval 6.x**: Pinned to major version 6. Simple key-value IndexedDB wrapper with stable API.

### Subresource Integrity (SRI)

SRI hashes are **generated at build time** by `build.js`. The build script:

1. Fetches each CDN resource
2. Computes SHA-384 hash
3. Injects `integrity="sha384-..."` and `crossorigin="anonymous"` into `<script>` tags

This ensures that if a CDN is compromised, the browser will refuse to execute the tampered script.

### Content Security Policy (CSP)

CSP is enforced via:
- **Production**: HTTP headers in `netlify.toml` or `vercel.json`
- **Local development**: `<meta http-equiv="Content-Security-Policy">` tag

The CSP allows scripts only from:
- `'self'` (our domain)
- `cdnjs.cloudflare.com` (Three.js, GSAP)
- `unpkg.com` (Lenis, web-vitals, idb-keyval)
- `www.googletagmanager.com` (GA4)
- `static.hotjar.com` (Hotjar)
- `www.google.com` / `www.gstatic.com` (reCAPTCHA)

### Security Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Forces HTTPS |
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer data |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Restricts browser APIs |

### Reporting Vulnerabilities

If you discover a security vulnerability in this project, please contact: **admin@airastudycentre.com**

Do NOT open public issues for security vulnerabilities.
