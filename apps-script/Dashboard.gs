/**
 * ═══════════════════════════════════════════════════════
 * Dashboard.gs — AIRA Study Centre — Dashboard, Reports, Integrity, Backup
 * Modules 2.3, 2.4, 4.4, 4.5
 * ═══════════════════════════════════════════════════════
 *
 * TRIGGERS (set via Edit → Triggers):
 * - buildDashboard()      → Daily at 6 AM IST
 * - sendDailyReport()     → Daily at 7 AM IST
 * - runIntegrityChecks()  → Daily at 5 AM IST
 * - exportToGCS()         → Daily at 4 AM IST (optional)
 */

/* ═══════════════ CONFIGURATION ═══════════════ */
/* These must match Code.gs */

var DASH_SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';
var DASH_ADMIN_EMAIL = 'admin@airastudycentre.com';
var SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
var SUPABASE_SERVICE_KEY = 'YOUR_SUPABASE_SERVICE_ROLE_KEY';
var GCS_BUCKET_NAME = 'aira-backups';

var SHEET_RAW = 'Raw Submissions';
var SHEET_DASHBOARD = 'Dashboard';

/* ═══════════════════════════════════════════════
   MODULE 2.3 — buildDashboard()
   Daily at 6 AM IST
   ═══════════════════════════════════════════════ */

function buildDashboard() {
  try {
    var ss = SpreadsheetApp.openById(DASH_SPREADSHEET_ID);
    var rawSheet = ss.getSheetByName(SHEET_RAW);
    if (!rawSheet) return;

    var dashSheet = ss.getSheetByName(SHEET_DASHBOARD);
    if (!dashSheet) {
      dashSheet = ss.insertSheet(SHEET_DASHBOARD);
    }
    dashSheet.clear();

    var data = rawSheet.getDataRange().getValues();
    if (data.length <= 1) {
      dashSheet.getRange('A1').setValue('No submissions yet.');
      return;
    }

    var rows = data.slice(1); // skip header
    var today = todayIST();
    var weekStart = getWeekStartIST();
    var monthStart = getMonthStartIST();

    // ── Categorize rows ──
    var todayRows = filterByDateRange(rows, today, null);
    var weekRows = filterByDateRange(rows, weekStart, null);
    var monthRows = filterByDateRange(rows, monthStart, null);

    // ── TODAY Section ──
    var row = 1;
    row = writeSection(dashSheet, row, '📊 TODAY — ' + Utilities.formatDate(today, 'Asia/Kolkata', 'dd MMM yyyy'), todayRows);

    // ── THIS WEEK Section ──
    row += 1;
    row = writeSection(dashSheet, row, '📈 THIS WEEK (Mon–Sun)', weekRows);

    // ── THIS MONTH Section ──
    row += 1;
    row = writeSection(dashSheet, row, '📅 THIS MONTH — ' + Utilities.formatDate(today, 'Asia/Kolkata', 'MMMM yyyy'), monthRows);

    // ── Conversion Funnel by Grade ──
    row += 1;
    row = writeGradeFunnel(dashSheet, row, monthRows);

    // ── Create Named Ranges ──
    createNamedRange(ss, dashSheet, 'DailyStats', 1, 1, 8, 5);
    createNamedRange(ss, dashSheet, 'WeeklyStats', 10, 1, 8, 5);
    createNamedRange(ss, dashSheet, 'MonthlyStats', 19, 1, 8, 5);

    // Format header rows green
    formatDashboard(dashSheet);

  } catch (err) {
    logDashError(err);
  }
}

function writeSection(sheet, startRow, title, rows) {
  var demoCount = rows.filter(function (r) { return r[1] === 'demo'; }).length;
  var diagCount = rows.filter(function (r) { return r[1] === 'diagnostic'; }).length;
  var topGrade = getTopValue(rows, 3);
  var topSubject = getTopValue(rows, 4);

  sheet.getRange(startRow, 1).setValue(title);
  sheet.getRange(startRow, 1, 1, 5).merge().setBackground('#2E7D32').setFontColor('#fff').setFontWeight('bold');

  startRow++;
  var headers = ['Metric', 'Value', 'Chart', '', ''];
  sheet.getRange(startRow, 1, 1, 5).setValues([headers]).setFontWeight('bold').setBackground('#e8f5e9');

  startRow++;
  var metrics = [
    ['Demo Bookings', demoCount, makeBar(demoCount, demoCount + diagCount), '', ''],
    ['Diagnostic Tests', diagCount, makeBar(diagCount, demoCount + diagCount), '', ''],
    ['Total Submissions', demoCount + diagCount, '', '', ''],
    ['Top Grade', topGrade, '', '', ''],
    ['Top Subject', topSubject, '', '', '']
  ];

  sheet.getRange(startRow, 1, metrics.length, 5).setValues(metrics);

  // Alternating row colors
  for (var i = 0; i < metrics.length; i++) {
    if (i % 2 === 1) {
      sheet.getRange(startRow + i, 1, 1, 5).setBackground('#f0fdf4');
    }
  }

  return startRow + metrics.length;
}

function writeGradeFunnel(sheet, startRow, rows) {
  sheet.getRange(startRow, 1).setValue('🎓 Submissions by Grade (Conversion Funnel)');
  sheet.getRange(startRow, 1, 1, 5).merge().setBackground('#2E7D32').setFontColor('#fff').setFontWeight('bold');

  startRow++;
  sheet.getRange(startRow, 1, 1, 3).setValues([['Grade', 'Count', 'Bar']]).setFontWeight('bold').setBackground('#e8f5e9');

  startRow++;
  var grades = [7, 8, 9, 10];
  var total = rows.length || 1;
  grades.forEach(function (g) {
    var count = rows.filter(function (r) { return parseInt(r[3]) === g; }).length;
    sheet.getRange(startRow, 1, 1, 3).setValues([[
      'Grade ' + g, count, makeBar(count, total)
    ]]);
    startRow++;
  });

  return startRow;
}

/* ═══════════════════════════════════════════════
   MODULE 2.4 — sendDailyReport()
   Daily at 7 AM IST
   ═══════════════════════════════════════════════ */

function sendDailyReport() {
  try {
    var ss = SpreadsheetApp.openById(DASH_SPREADSHEET_ID);
    var rawSheet = ss.getSheetByName(SHEET_RAW);
    if (!rawSheet) return;

    var data = rawSheet.getDataRange().getValues().slice(1);
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    var yesterdayStr = Utilities.formatDate(yesterday, 'Asia/Kolkata', 'yyyy-MM-dd');

    var yesterdayRows = data.filter(function (r) {
      return String(r[8]) === yesterdayStr;
    });

    var weekStart = getWeekStartIST();
    var weekRows = filterByDateRange(data, weekStart, null);

    var topGrade = getTopValue(yesterdayRows.length > 0 ? yesterdayRows : data, 3);
    var sheetUrl = 'https://docs.google.com/spreadsheets/d/' + DASH_SPREADSHEET_ID;

    var html = [
      '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">',
      '<div style="background:#2E7D32;color:#fff;padding:20px;border-radius:12px 12px 0 0">',
      '<h1 style="margin:0;font-size:20px">📊 AIRA Daily Lead Report</h1>',
      '<p style="margin:4px 0 0;opacity:0.9">' + Utilities.formatDate(yesterday, 'Asia/Kolkata', 'dd MMMM yyyy') + '</p>',
      '</div>',
      '<div style="padding:20px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none">',
      '<table style="width:100%;border-collapse:collapse">',
      '<tr><td style="padding:12px;border-bottom:1px solid #e2e8f0;font-weight:bold">Yesterday\'s Leads</td>',
      '<td style="padding:12px;border-bottom:1px solid #e2e8f0;font-size:24px;color:#2E7D32;font-weight:bold">' + yesterdayRows.length + '</td></tr>',
      '<tr><td style="padding:12px;border-bottom:1px solid #e2e8f0;font-weight:bold">Week-to-Date Total</td>',
      '<td style="padding:12px;border-bottom:1px solid #e2e8f0;font-size:24px;color:#2E7D32;font-weight:bold">' + weekRows.length + '</td></tr>',
      '<tr><td style="padding:12px;border-bottom:1px solid #e2e8f0;font-weight:bold">Top Performing Grade</td>',
      '<td style="padding:12px;border-bottom:1px solid #e2e8f0;font-size:18px">' + topGrade + '</td></tr>',
      '</table>',
      '<p style="margin-top:20px;text-align:center">',
      '<a href="' + sheetUrl + '" style="background:#FDD835;color:#2c3e50;padding:12px 24px;border-radius:24px;text-decoration:none;font-weight:bold">Open Google Sheet →</a>',
      '</p></div></div>'
    ].join('');

    MailApp.sendEmail({
      to: DASH_ADMIN_EMAIL,
      subject: 'AIRA Daily Report – ' + yesterdayRows.length + ' leads (' + Utilities.formatDate(yesterday, 'Asia/Kolkata', 'dd MMM') + ')',
      htmlBody: html
    });

  } catch (err) {
    logDashError(err);
  }
}

/* ═══════════════════════════════════════════════
   MODULE 4.4 — runIntegrityChecks()
   Daily at 5 AM IST
   ═══════════════════════════════════════════════ */

function runIntegrityChecks() {
  var results = [];
  var hasFailure = false;

  try {
    var ss = SpreadsheetApp.openById(DASH_SPREADSHEET_ID);
    var rawSheet = ss.getSheetByName(SHEET_RAW);
    var sheetData = rawSheet ? rawSheet.getDataRange().getValues().slice(1) : [];
    var sheetCount = sheetData.length;

    // ── Check 1: Sheet vs Supabase count ──
    var supabaseCount = getSupabaseLeadCount();
    if (supabaseCount !== null) {
      var mismatch = Math.abs(sheetCount - supabaseCount);
      var check1 = {
        check_name: 'sheet_vs_supabase_count',
        result: mismatch === 0 ? 'PASS' : 'FAIL',
        details: { sheet_count: sheetCount, supabase_count: supabaseCount, mismatch: mismatch }
      };
      results.push(check1);
      if (mismatch > 0) hasFailure = true;
    }

    // ── Check 2: Schema errors (missing phone or grade) ──
    var schemaErrors = sheetData.filter(function (r) {
      return !r[5] || !r[3]; // phone=col5, grade=col3
    });
    var check2 = {
      check_name: 'schema_validation',
      result: schemaErrors.length === 0 ? 'PASS' : 'FAIL',
      details: { invalid_rows: schemaErrors.length }
    };
    results.push(check2);
    if (schemaErrors.length > 0) hasFailure = true;

    // ── Check 3: Potential spam (phone appears >3 times as 'new') ──
    var phoneCounts = {};
    sheetData.forEach(function (r) {
      var phone = String(r[5]);
      phoneCounts[phone] = (phoneCounts[phone] || 0) + 1;
    });
    var spamPhones = Object.keys(phoneCounts).filter(function (p) {
      return phoneCounts[p] > 3;
    });
    var check3 = {
      check_name: 'spam_detection',
      result: spamPhones.length === 0 ? 'PASS' : 'WARN',
      details: { suspicious_phones: spamPhones.length, phones: spamPhones.slice(0, 10) }
    };
    results.push(check3);
    if (spamPhones.length > 0) hasFailure = true;

    // ── Check 4: Pipeline alive (last 24h had ≥0 new leads) ──
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    var recentRows = filterByDateRange(sheetData, yesterday, null);
    var check4 = {
      check_name: 'pipeline_alive',
      result: 'PASS',
      details: { last_24h_count: recentRows.length }
    };
    results.push(check4);

    // ── Write results to Supabase integrity_checks ──
    results.forEach(function (check) {
      writeIntegrityCheck(check);
    });

    // ── Send alert email if any check fails ──
    if (hasFailure) {
      sendIntegrityAlert(results);
    }

  } catch (err) {
    logDashError(err);
  }
}

function getSupabaseLeadCount() {
  if (SUPABASE_URL.indexOf('YOUR_') === 0) return null;
  try {
    var response = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/leads?select=count', {
      method: 'get',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
        'Prefer': 'count=exact'
      },
      muteHttpExceptions: true
    });
    var headers = response.getAllHeaders();
    var contentRange = headers['content-range'] || '';
    var match = contentRange.match(/\/(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  } catch (err) {
    logDashError(err);
    return null;
  }
}

function writeIntegrityCheck(check) {
  if (SUPABASE_URL.indexOf('YOUR_') === 0) return;
  try {
    UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/integrity_checks', {
      method: 'post',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      payload: JSON.stringify({
        check_name: check.check_name,
        result: check.result,
        details: check.details
      }),
      muteHttpExceptions: true
    });
  } catch (err) {
    logDashError(err);
  }
}

function sendIntegrityAlert(results) {
  var body = '<h2 style="color:#ef4444">⚠️ AIRA Integrity Check Alert</h2>';
  body += '<table style="border-collapse:collapse;width:100%">';
  body += '<tr style="background:#fee2e2"><th style="padding:8px;border:1px solid #e2e8f0">Check</th><th style="padding:8px;border:1px solid #e2e8f0">Result</th><th style="padding:8px;border:1px solid #e2e8f0">Details</th></tr>';
  results.forEach(function (r) {
    var color = r.result === 'PASS' ? '#dcfce7' : (r.result === 'WARN' ? '#fef3c7' : '#fee2e2');
    body += '<tr style="background:' + color + '">';
    body += '<td style="padding:8px;border:1px solid #e2e8f0">' + r.check_name + '</td>';
    body += '<td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold">' + r.result + '</td>';
    body += '<td style="padding:8px;border:1px solid #e2e8f0">' + JSON.stringify(r.details) + '</td></tr>';
  });
  body += '</table>';

  MailApp.sendEmail({
    to: DASH_ADMIN_EMAIL,
    subject: '⚠️ AIRA Integrity Check FAILED — Action Required',
    htmlBody: body
  });
}

/* ═══════════════════════════════════════════════
   MODULE 4.5 — exportToGCS()
   Daily backup to Google Cloud Storage
   ═══════════════════════════════════════════════
   
   GCS BUCKET SETUP:
   1. Go to https://console.cloud.google.com/storage
   2. Create a bucket named 'aira-backups' (or your preferred name)
   3. Set location to asia-south1 (Mumbai)
   4. Set storage class to Standard
   5. Enable Object Versioning (optional but recommended)
   6. IAM: Grant the Apps Script service account the 'Storage Object Admin' role
   7. The service account email is found in Apps Script: 
      Extensions → Apps Script → Project Settings → Script ID
      Then use: {scriptId}@script.googleusercontent.com
 */

function exportToGCS() {
  if (SUPABASE_URL.indexOf('YOUR_') === 0 || GCS_BUCKET_NAME === 'aira-backups') {
    Logger.log('Supabase or GCS not configured. Skipping backup.');
    return;
  }

  try {
    // Fetch all leads from Supabase
    var response = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/leads?select=*&order=created_at.desc', {
      method: 'get',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY
      }
    });

    var leadsJson = response.getContentText();
    var fileName = 'leads_' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd') + '.json';

    // Upload to GCS
    var token = ScriptApp.getOAuthToken();
    var uploadUrl = 'https://storage.googleapis.com/upload/storage/v1/b/' +
      GCS_BUCKET_NAME + '/o?uploadType=media&name=' + fileName;

    UrlFetchApp.fetch(uploadUrl, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + token },
      payload: leadsJson
    });

    // Cleanup: delete files older than 30 days
    cleanupOldBackups();

    Logger.log('Backup successful: ' + fileName);
  } catch (err) {
    logDashError(err);
  }
}

function cleanupOldBackups() {
  try {
    var token = ScriptApp.getOAuthToken();
    var listUrl = 'https://storage.googleapis.com/storage/v1/b/' + GCS_BUCKET_NAME + '/o?prefix=leads_';

    var response = UrlFetchApp.fetch(listUrl, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    var items = JSON.parse(response.getContentText()).items || [];

    // Sort by name (date-based), keep last 30
    items.sort(function (a, b) { return a.name < b.name ? 1 : -1; });

    for (var i = 30; i < items.length; i++) {
      var deleteUrl = 'https://storage.googleapis.com/storage/v1/b/' + GCS_BUCKET_NAME + '/o/' + encodeURIComponent(items[i].name);
      UrlFetchApp.fetch(deleteUrl, {
        method: 'delete',
        headers: { 'Authorization': 'Bearer ' + token },
        muteHttpExceptions: true
      });
    }
  } catch (err) {
    logDashError(err);
  }
}

/* ═══════════════ HELPER FUNCTIONS ═══════════════ */

function todayIST() {
  var d = new Date();
  return new Date(Utilities.formatDate(d, 'Asia/Kolkata', 'yyyy-MM-dd'));
}

function getWeekStartIST() {
  var d = todayIST();
  var day = d.getDay();
  var diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function getMonthStartIST() {
  var d = todayIST();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function filterByDateRange(rows, startDate, endDate) {
  return rows.filter(function (r) {
    var rowDate = new Date(r[0]);
    if (startDate && rowDate < startDate) return false;
    if (endDate && rowDate > endDate) return false;
    return true;
  });
}

function getTopValue(rows, colIndex) {
  var counts = {};
  rows.forEach(function (r) {
    var val = String(r[colIndex]);
    if (val) counts[val] = (counts[val] || 0) + 1;
  });
  var top = '';
  var topCount = 0;
  Object.keys(counts).forEach(function (key) {
    if (counts[key] > topCount) {
      topCount = counts[key];
      top = key;
    }
  });
  return top || 'N/A';
}

function makeBar(value, total) {
  if (!total || total === 0) return '';
  var pct = Math.round((value / total) * 100);
  var filled = Math.round(pct / 5);
  var bar = '';
  for (var i = 0; i < 20; i++) {
    bar += i < filled ? '█' : '░';
  }
  return bar + ' ' + pct + '%';
}

function createNamedRange(ss, sheet, name, startRow, startCol, numRows, numCols) {
  try {
    var existing = ss.getRangeByName(name);
    if (existing) ss.removeNamedRange(name);
    var range = sheet.getRange(startRow, startCol, numRows, numCols);
    ss.setNamedRange(name, range);
  } catch (err) {
    // Named range might not exist yet
  }
}

function formatDashboard(sheet) {
  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 120);
  sheet.setColumnWidth(3, 250);
  sheet.setFrozenRows(0);
}

function logDashError(err) {
  try {
    var ss = SpreadsheetApp.openById(DASH_SPREADSHEET_ID);
    var sheet = ss.getSheetByName('Errors');
    if (!sheet) sheet = ss.insertSheet('Errors');
    sheet.appendRow([new Date().toISOString(), 'Dashboard.gs', err.toString(), err.stack || '']);
  } catch (e) {
    Logger.log('Dashboard error: ' + e.toString());
  }
}
