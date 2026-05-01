/**
 * form-handler.js — Unified Form Submission Handler
 * Modules 2.2, 3.2, 3.4, 4.3
 *
 * Intercepts #demoForm and #diagnosticForm submissions.
 * Flow: Validate → Rate Limit → reCAPTCHA → Show Success → POST async → Queue on failure
 */
(function () {
  'use strict';

  /* ========================================================
     CONSTANTS — replaced at build time by build.js
     ======================================================== */
  var SUPABASE_EDGE_FUNCTION_URL = '__SUPABASE_EDGE_FUNCTION_URL__';
  var SHEET_WEBHOOK_URL = '__SHEET_WEBHOOK_URL__';
  var RECAPTCHA_SITE_KEY = '__RECAPTCHA_SITE_KEY__';

  /* ========================================================
     RATE LIMITING (Module 3.4)
     60-second cooldown per form ID
     ======================================================== */
  var COOLDOWN_SECONDS = 60;

  function getLastSubmitTime(formId) {
    var ts = localStorage.getItem('aira_submit_ts_' + formId);
    return ts ? parseInt(ts, 10) : 0;
  }

  function setLastSubmitTime(formId) {
    localStorage.setItem('aira_submit_ts_' + formId, Date.now().toString());
  }

  function getCooldownRemaining(formId) {
    var last = getLastSubmitTime(formId);
    if (!last) return 0;
    var elapsed = (Date.now() - last) / 1000;
    return Math.max(0, Math.ceil(COOLDOWN_SECONDS - elapsed));
  }

  function showCooldownMessage(formEl, seconds) {
    var existing = formEl.querySelector('.aira-cooldown-msg');
    if (existing) existing.remove();

    var msg = document.createElement('div');
    msg.className = 'aira-cooldown-msg';
    msg.style.cssText = 'color:#ef4444;font-size:0.85rem;text-align:center;margin-top:0.75rem;font-weight:500;padding:0.5rem;background:rgba(239,68,68,0.05);border-radius:8px';
    msg.textContent = 'Please wait ' + seconds + ' seconds before submitting again.';

    var btn = formEl.querySelector('button[type="submit"]');
    if (btn) btn.parentNode.insertBefore(msg, btn.nextSibling);

    // Auto-remove and update countdown
    var interval = setInterval(function () {
      seconds--;
      if (seconds <= 0) {
        clearInterval(interval);
        msg.remove();
      } else {
        msg.textContent = 'Please wait ' + seconds + ' seconds before submitting again.';
      }
    }, 1000);
  }

  /* ========================================================
     reCAPTCHA v3 TOKEN (Module 3.2)
     ======================================================== */
  function getRecaptchaToken() {
    if (RECAPTCHA_SITE_KEY.indexOf('__') === 0) {
      // reCAPTCHA not configured — return empty token
      return Promise.resolve('');
    }
    if (typeof grecaptcha === 'undefined' || typeof grecaptcha.execute !== 'function') {
      return Promise.resolve('');
    }
    return grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'submit_form' });
  }

  /* ========================================================
     SUBMIT TO BACKEND
     Primary: Supabase Edge Function
     Fallback: Google Apps Script webhook
     ======================================================== */
  function submitToBackend(payload) {
    var url = SUPABASE_EDGE_FUNCTION_URL.indexOf('__') === 0
      ? SHEET_WEBHOOK_URL
      : SUPABASE_EDGE_FUNCTION_URL;

    if (url.indexOf('__') === 0) {
      console.warn('[AIRA Form] No backend URL configured. Data not sent.');
      return Promise.reject(new Error('No backend URL'));
    }

    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      mode: 'cors'
    }).then(function (response) {
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      return response.json();
    });
  }

  /* ========================================================
     SHOW SUCCESS UI
     Uses existing .form-success pattern from contact.html
     ======================================================== */
  function showSuccess(formEl) {
    var btn = formEl.querySelector('button[type="submit"]');
    var successMsg = formEl.parentElement.querySelector('.form-success');

    if (successMsg) {
      formEl.classList.add('hidden');
      formEl.style.display = 'none';
      successMsg.classList.remove('hidden');
      successMsg.style.display = 'block';
    } else if (btn) {
      var originalText = btn.innerHTML;
      btn.innerHTML = '✅ Submitted Successfully!';
      btn.style.background = '#2E7D32';
      formEl.reset();
      setTimeout(function () {
        btn.innerHTML = originalText;
        btn.style.background = '';
      }, 3000);
    }
  }

  /* ========================================================
     FORM SUBMISSION HANDLER
     ======================================================== */
  function handleFormSubmit(e) {
    e.preventDefault();
    var form = e.target;
    var formId = form.id;

    // Determine form type
    var formType = formId === 'demoForm' ? 'demo' : 'diagnostic';

    // 1. Clear previous errors
    if (window.AiraSanitize) {
      window.AiraSanitize.clearErrors(form);
    }

    // 2. Validate inputs (Module 3.3)
    if (window.AiraSanitize) {
      var validation = window.AiraSanitize.validateForm(form);
      if (!validation.valid) {
        window.AiraSanitize.showInlineErrors(form, validation.errors);
        return;
      }
    }

    // 3. Check rate limit (Module 3.4)
    var cooldown = getCooldownRemaining(formId);
    if (cooldown > 0) {
      showCooldownMessage(form, cooldown);
      return;
    }

    // 4. Collect validated data
    var data;
    if (window.AiraSanitize) {
      data = window.AiraSanitize.validateForm(form).data;
    } else {
      // Fallback: read values directly
      data = {
        student_name: (form.querySelector('[name="student_name"]') || {}).value || '',
        grade: parseInt((form.querySelector('[name="grade"]') || {}).value || '0', 10),
        subject: (form.querySelector('[name="subject"]') || {}).value || '',
        phone: (form.querySelector('[name="phone"]') || {}).value || ''
      };
    }

    // 5. Show submitting state on button
    var btn = form.querySelector('button[type="submit"]');
    var originalText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.innerHTML = 'Submitting...';
      btn.style.opacity = '0.8';
      btn.disabled = true;
    }

    // 6. Set rate limit timestamp
    setLastSubmitTime(formId);

    // 7. Get reCAPTCHA token, then submit
    getRecaptchaToken().then(function (token) {
      var payload = {
        form_type: formType,
        student_name: data.student_name,
        grade: data.grade,
        subject: data.subject,
        phone: data.phone,
        page_url: window.location.href,
        utm_source: window.__AiraAnalytics ? window.__AiraAnalytics.getUTMSource() : '(direct)',
        recaptcha_token: token,
        timestamp: new Date().toISOString()
      };

      // 8. Show success immediately (non-blocking UX)
      setTimeout(function () {
        showSuccess(form);
        if (btn) {
          btn.disabled = false;
          btn.style.opacity = '';
        }
      }, 800);

      // 9. Track form_submit event
      if (window.__AiraAnalytics) {
        window.__AiraAnalytics.trackEvent('form_submit', {
          form_id: formId,
          form_type: formType,
          grade: data.grade,
          page_url: window.location.pathname
        });
      }

      // 10. Redirect to Gmail compose in browser
      setTimeout(function() {
        var subjectText = 'New Enquiry from ' + (data.student_name || 'Website');
        var bodyText = 'Student Name: ' + (data.student_name || 'N/A') + '\n' +
                       'Grade: ' + (data.grade || 'N/A') + '\n' +
                       'Subject: ' + (data.subject || 'N/A') + '\n' +
                       'Phone: ' + (data.phone || 'N/A');
        var gmailUrl = 'https://mail.google.com/mail/?view=cm&fs=1' +
                       '&to=' + encodeURIComponent('airastudycentre@gmail.com') +
                       '&su=' + encodeURIComponent(subjectText) +
                       '&body=' + encodeURIComponent(bodyText);
        window.open(gmailUrl, '_blank');
      }, 900); // Trigger shortly after showing the success UI

    }).catch(function (err) {
      console.error('[AIRA Form] reCAPTCHA error:', err);
      // Still show success and attempt submit without token
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = '';
      }
    });
  }

  /* ========================================================
     FLUSH QUEUED SUBMISSIONS ON PAGE LOAD (Module 4.3)
     ======================================================== */
  function flushQueue() {
    if (window.AiraQueue) {
      window.AiraQueue.flush(submitToBackend).catch(function (err) {
        console.warn('[AIRA Queue] Flush failed:', err);
      });
    }

    // Also check localStorage fallback queue
    try {
      var lsQueue = JSON.parse(localStorage.getItem('aira_form_queue') || '[]');
      if (lsQueue.length > 0) {
        var remaining = [];
        lsQueue.forEach(function (payload) {
          submitToBackend(payload).catch(function () {
            remaining.push(payload);
          });
        });
        setTimeout(function () {
          localStorage.setItem('aira_form_queue', JSON.stringify(remaining));
        }, 5000);
      }
    } catch (e) { /* ignore */ }
  }

  /* ========================================================
     INIT
     ======================================================== */
  function init() {
    // Attach to specific forms only
    var demoForm = document.getElementById('demoForm');
    var diagnosticForm = document.getElementById('diagnosticForm');

    if (demoForm) {
      demoForm.addEventListener('submit', handleFormSubmit);
    }
    if (diagnosticForm) {
      diagnosticForm.addEventListener('submit', handleFormSubmit);
    }

    // Flush queued submissions on every page load
    setTimeout(flushQueue, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
