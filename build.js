#!/usr/bin/env node

/**
 * build.js — AIRA Study Centre Build Script
 * Reads .env and injects environment variables into HTML/JS files.
 * Generates SRI hashes for CDN scripts.
 * Outputs to dist/ directory.
 *
 * Usage: node build.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

/* ═══════════════ CONFIGURATION ═══════════════ */

const SRC_DIR = path.join(__dirname, 'src');
const DIST_DIR = path.join(__dirname, 'dist');
const ENV_FILE = path.join(__dirname, '.env');

// Files to process for env variable injection
const PROCESS_EXTENSIONS = ['.html', '.js'];

// Placeholder tokens and their env variable names
const TOKEN_MAP = {
  '__GA4_MEASUREMENT_ID__': 'GA4_MEASUREMENT_ID',
  '__HOTJAR_SITE_ID__': 'HOTJAR_SITE_ID',
  '__SHEET_WEBHOOK_URL__': 'SHEET_WEBHOOK_URL',
  '__RECAPTCHA_SITE_KEY__': 'RECAPTCHA_SITE_KEY',
  '__SUPABASE_EDGE_FUNCTION_URL__': 'SUPABASE_EDGE_FUNCTION_URL',
  '__SUPABASE_URL__': 'SUPABASE_URL',
  '__SUPABASE_ANON_KEY__': 'SUPABASE_ANON_KEY',
  '__PRODUCTION_DOMAIN__': 'PRODUCTION_DOMAIN',
  'YOUR_RECAPTCHA_SITE_KEY': 'RECAPTCHA_SITE_KEY',
  'G-XXXXXXXXXX': 'GA4_MEASUREMENT_ID',
};

// CDN scripts that need SRI hashes
const CDN_SCRIPTS = [
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r160/three.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js',
  'https://unpkg.com/lenis@1.0.42/dist/lenis.min.js',
];

/* ═══════════════ PARSE .env ═══════════════ */

function parseEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) {
    console.warn('⚠️  No .env file found. Using .env.example as fallback.');
    const examplePath = path.join(__dirname, '.env.example');
    if (!fs.existsSync(examplePath)) return env;
    filePath = examplePath;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  content.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) return;
    const key = line.substring(0, eqIndex).trim();
    const value = line.substring(eqIndex + 1).trim();
    env[key] = value;
  });

  return env;
}

/* ═══════════════ FETCH & HASH ═══════════════ */

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchUrl(res.headers.location).then(resolve).catch(reject);
        return;
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function generateSRIHash(url) {
  try {
    const content = await fetchUrl(url);
    const hash = crypto.createHash('sha384').update(content).digest('base64');
    return 'sha384-' + hash;
  } catch (err) {
    console.warn(`⚠️  Could not fetch ${url} for SRI hash: ${err.message}`);
    return null;
  }
}

/* ═══════════════ FILE PROCESSING ═══════════════ */

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function processFile(filePath, env, sriMap) {
  const ext = path.extname(filePath);
  if (!PROCESS_EXTENSIONS.includes(ext)) return;

  let content = fs.readFileSync(filePath, 'utf8');

  // Replace env tokens
  Object.entries(TOKEN_MAP).forEach(([token, envKey]) => {
    if (env[envKey]) {
      content = content.split(token).join(env[envKey]);
    }
  });

  // Add SRI attributes to CDN script tags
  if (ext === '.html' && sriMap) {
    Object.entries(sriMap).forEach(([url, hash]) => {
      if (!hash) return;
      const srcPattern = `src="${url}"`;
      const replacement = `src="${url}" integrity="${hash}" crossorigin="anonymous"`;
      content = content.split(srcPattern).join(replacement);
    });
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

function processDirectory(dir, env, sriMap) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDirectory(fullPath, env, sriMap);
    } else {
      processFile(fullPath, env, sriMap);
    }
  }
}

/* ═══════════════ MAIN ═══════════════ */

async function main() {
  console.log('🔨 AIRA Build Script');
  console.log('═'.repeat(50));

  // 1. Parse environment variables
  const env = parseEnv(ENV_FILE);
  console.log(`✅ Loaded ${Object.keys(env).length} environment variables`);

  // 2. Generate SRI hashes
  console.log('🔐 Generating SRI hashes for CDN scripts...');
  const sriMap = {};
  for (const url of CDN_SCRIPTS) {
    console.log(`   Fetching: ${url}`);
    sriMap[url] = await generateSRIHash(url);
    if (sriMap[url]) {
      console.log(`   ✅ ${sriMap[url].substring(0, 30)}...`);
    }
  }

  // 3. Copy src/ to dist/
  console.log('📂 Copying src/ to dist/...');
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  copyDirRecursive(SRC_DIR, DIST_DIR);
  console.log('✅ Files copied');

  // 4. Process files in dist/
  console.log('🔄 Injecting environment variables and SRI hashes...');
  processDirectory(DIST_DIR, env, sriMap);
  console.log('✅ All tokens replaced');

  // 5. Summary
  console.log('');
  console.log('═'.repeat(50));
  console.log('✅ Build complete! Output: dist/');
  console.log('');
  console.log('Next steps:');
  console.log('  • Deploy dist/ to Netlify or Vercel');
  console.log('  • Verify GA4 Measurement ID is correct');
  console.log('  • Test reCAPTCHA with live keys');
  console.log('  • Run through LAUNCH_CHECKLIST.md');
}

main().catch(err => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
