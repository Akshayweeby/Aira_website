/**
 * ═══════════════════════════════════════════════════════
 * Code.gs — AIRA Study Centre — Google Apps Script Backend
 * Module 2.1 + Module 3.2 (reCAPTCHA) + Module 3.4 (Rate Limit)
 * ═══════════════════════════════════════════════════════
 *
 * DEPLOYMENT INSTRUCTIONS:
 * ─────────────────────────
 * 1. Go to https://script.google.com and create a new project.
 * 2. Name it "AIRA Lead Submissions".
 * 3. Replace the default Code.gs with this file's contents.
 * 4. Create a second file Dashboard.gs and paste Dashboard.gs contents.
 * 5. Create a Google Sheet and copy its ID from the URL:
 *    https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
 * 6. Replace SPREADSHEET_ID below with your sheet's ID.
 * 7. Create these sheets (tabs) in your spreadsheet:
 *    - "Raw Submissions"
 *    - "Duplicates"
 *    - "SuspiciousSubmissions"
 *    - "Errors"
 *    - "Dashboard"
 * 8. Deploy: Extensions → Apps Script → Deploy → New Deployment
 *    - Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 9. Copy the deployment URL and set it as SHEET_WEBHOOK_URL in .env
 * 10. Set up triggers: Edit → Triggers → Add trigger for:
 *     - buildDashboard() → Time-driven → Day timer → 6am-7am
 *     - sendDailyReport() → Time-driven → Day timer → 7am-8am
 *     - runIntegrityChecks() → Time-driven → Day timer → 5am-6am
 */

/* ═══════════════ CONFIGURATION ═══════════════ */

var SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';
var ADMIN_EMAIL = 'admin@airastudycentre.com';
var RECAPTCHA_SECRET_KEY = 'YOUR_RECAPTCHA_SECRET_KEY';

/* ═══════════════ SHEET NAMES ═══════════════ */

var SHEET_RAW = 'Raw Submissions';
var SHEET_DUPLICATES = 'Duplicates';
var SHEET_SUSPICIOUS = 'SuspiciousSubmissions';
var SHEET_ERRORS = 'Errors';

/* ═══════════════ MAIN POST ENDPOINT ═══════════════ */

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);

    // Extract fields
    var formType = payload.form_type || '';
    var studentName = payload.student_name || '';
    var grade = payload.grade || '';
    var subject = payload.subject || '';
    var phone = payload.phone || '';
    var pageUrl = payload.page_url || '';
    var utmSource = payload.utm_source || '(direct)';
    var recaptchaToken = payload.recaptcha_token || '';
    var timestamp = payload.timestamp || new Date().toISOString();

    // Basic validation
    if (!formType || !studentName || !grade || !phone) {
      return jsonResponse(400, { error: 'Missing required fields' });
    }

    // ── reCAPTCHA Verification (Module 3.2) ──
    if (recaptchaToken && RECAPTCHA_SECRET_KEY !== 'YOUR_RECAPTCHA_SECRET_KEY') {
      var recaptchaResult = verifyRecaptcha(recaptchaToken);
      if (recaptchaResult.score < 0.5) {
        logToSheet(SHEET_SUSPICIOUS, [
          timestamp, formType, studentName, grade, subject, phone,
          pageUrl, utmSource, recaptchaResult.score, recaptchaResult.action
        ]);
        return jsonResponse(403, { error: 'Suspicious submission detected' });
      }
    }

    // ── Server-Side Rate Limiting (Module 3.4) ──
    var rateLimitKey = 'ratelimit_' + phone + '_' + todayStr();
    var props = PropertiesService.getScriptProperties();
    var currentCount = parseInt(props.getProperty(rateLimitKey) || '0', 10);

    if (currentCount >= 3) {
      logToSheet(SHEET_SUSPICIOUS, [
        timestamp, formType, studentName, grade, subject, phone,
        pageUrl, utmSource, 'RATE_LIMITED', currentCount + 1
      ]);
      return jsonResponse(429, { error: 'Too many submissions. Please try again tomorrow.' });
    }

    props.setProperty(rateLimitKey, (currentCount + 1).toString());

    // ── Deduplication Check (Module 2.1) ──
    if (isDuplicate(phone, formType)) {
      logToSheet(SHEET_DUPLICATES, [
        timestamp, formType, studentName, grade, subject, phone,
        pageUrl, utmSource, todayStr(), getWeekNumber(), getMonthName()
      ]);
      return jsonResponse(409, { error: 'Duplicate submission within 24 hours' });
    }

    // ── Append to Raw Submissions ──
    var dateStr = todayStr();
    var weekNum = getWeekNumber();
    var monthName = getMonthName();

    logToSheet(SHEET_RAW, [
      timestamp, formType, studentName, grade, subject, phone,
      pageUrl, utmSource, dateStr, weekNum, monthName
    ]);

    // ── Send Admin Email Notification ──
    sendAdminNotification(formType, studentName, grade, subject, phone, pageUrl);

    return jsonResponse(200, { success: true, message: 'Submission recorded' });

  } catch (err) {
    logError(err);
    return jsonResponse(500, { error: 'Internal server error' });
  }
}

/* Allow GET for testing */
function doGet(e) {
  return jsonResponse(200, { status: 'AIRA Webhook is running', timestamp: new Date().toISOString() });
}

/* ═══════════════ reCAPTCHA VERIFICATION ═══════════════ */

function verifyRecaptcha(token) {
  try {
    var response = UrlFetchApp.fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'post',
      payload: {
        secret: RECAPTCHA_SECRET_KEY,
        response: token
      }
    });
    var result = JSON.parse(response.getContentText());
    return {
      success: result.success || false,
      score: result.score || 0,
      action: result.action || ''
    };
  } catch (err) {
    logError(err);
    return { success: false, score: 1, action: 'error' };
  }
}

/* ═══════════════ DEDUPLICATION ═══════════════ */

function isDuplicate(phone, formType) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_RAW);
    if (!sheet) return false;

    var data = sheet.getDataRange().getValues();
    var now = new Date();
    var twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (var i = data.length - 1; i >= 1; i--) {
      var rowTimestamp = new Date(data[i][0]);
      if (rowTimestamp < twentyFourHoursAgo) break;

      var rowFormType = data[i][1];
      var rowPhone = data[i][5];

      if (String(rowPhone) === String(phone) && String(rowFormType) === String(formType)) {
        return true;
      }
    }
    return false;
  } catch (err) {
    logError(err);
    return false;
  }
}

/* ═══════════════ ADMIN EMAIL ═══════════════ */

function sendAdminNotification(formType, studentName, grade, subject, phone, pageUrl) {
  try {
    var subjectLine = 'New AIRA Lead – ' + formType;
    var body = [
      '<h2 style="color:#2E7D32">New Lead from AIRA Website</h2>',
      '<table style="border-collapse:collapse;width:100%;max-width:500px">',
      '<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold">Form Type</td>',
      '<td style="padding:8px;border:1px solid #e2e8f0">' + formType + '</td></tr>',
      '<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold">Student Name</td>',
      '<td style="padding:8px;border:1px solid #e2e8f0">' + studentName + '</td></tr>',
      '<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold">Grade</td>',
      '<td style="padding:8px;border:1px solid #e2e8f0">' + grade + '</td></tr>',
      '<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold">Subject</td>',
      '<td style="padding:8px;border:1px solid #e2e8f0">' + subject + '</td></tr>',
      '<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold">Phone</td>',
      '<td style="padding:8px;border:1px solid #e2e8f0">' + phone + '</td></tr>',
      '<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold">Page URL</td>',
      '<td style="padding:8px;border:1px solid #e2e8f0">' + pageUrl + '</td></tr>',
      '</table>',
      '<p style="color:#64748b;margin-top:1rem">This is an automated notification from the AIRA website.</p>'
    ].join('');

    MailApp.sendEmail({
      to: ADMIN_EMAIL,
      subject: subjectLine,
      htmlBody: body
    });
  } catch (err) {
    logError(err);
  }
}

/* ═══════════════ HELPER FUNCTIONS ═══════════════ */

function logToSheet(sheetName, rowData) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    sheet.appendRow(rowData);
  } catch (err) {
    Logger.log('Error writing to sheet ' + sheetName + ': ' + err.toString());
  }
}

function logError(err) {
  try {
    logToSheet(SHEET_ERRORS, [
      new Date().toISOString(),
      err.toString(),
      err.stack || ''
    ]);
  } catch (e) {
    Logger.log('Fatal error logging: ' + e.toString());
  }
}

function jsonResponse(statusCode, data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function todayStr() {
  var d = new Date();
  return Utilities.formatDate(d, 'Asia/Kolkata', 'yyyy-MM-dd');
}

function getWeekNumber() {
  var d = new Date();
  var start = new Date(d.getFullYear(), 0, 1);
  var diff = d - start;
  var oneWeek = 604800000;
  return Math.ceil((diff / oneWeek));
}

function getMonthName() {
  return Utilities.formatDate(new Date(), 'Asia/Kolkata', 'MMMM yyyy');
}
