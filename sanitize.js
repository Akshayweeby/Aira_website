/**
 * sanitize.js — Client-Side Input Sanitisation
 * Module 3.3 — Security & Hardening
 *
 * Exposes window.AiraSanitize with validation methods.
 * Strips HTML tags, validates phone/grade/subject, limits field length.
 * Shows inline validation errors styled with red #ef4444.
 */
(function () {
  'use strict';

  var VALID_GRADES = ['7', '8', '9', '10'];
  var VALID_SUBJECTS = ['Maths', 'Science', 'Both'];
  var PHONE_REGEX = /^[6-9]\d{9}$/;
  var MAX_TEXT_LENGTH = 200;

  /** Strip all HTML tags from a string using regex whitelist */
  function stripHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/<[^>]*>/g, '').trim();
  }

  /** Validate Indian mobile phone number */
  function validatePhone(str) {
    if (typeof str !== 'string') return false;
    var cleaned = str.replace(/[\s\-\(\)\+]/g, '');
    // Remove leading +91 or 91 country code
    if (cleaned.indexOf('91') === 0 && cleaned.length > 10) {
      cleaned = cleaned.substring(cleaned.length - 10);
    }
    return PHONE_REGEX.test(cleaned);
  }

  /** Extract clean 10-digit phone number */
  function cleanPhone(str) {
    if (typeof str !== 'string') return '';
    var cleaned = str.replace(/[\s\-\(\)\+]/g, '');
    if (cleaned.indexOf('91') === 0 && cleaned.length > 10) {
      cleaned = cleaned.substring(cleaned.length - 10);
    }
    return cleaned;
  }

  /** Validate grade is one of [7, 8, 9, 10] */
  function validateGrade(val) {
    return VALID_GRADES.indexOf(String(val)) !== -1;
  }

  /** Validate subject is one of [Maths, Science, Both] */
  function validateSubject(val) {
    return VALID_SUBJECTS.indexOf(String(val)) !== -1;
  }

  /** Truncate string to max length */
  function truncate(str, max) {
    max = max || MAX_TEXT_LENGTH;
    if (typeof str !== 'string') return '';
    return str.substring(0, max);
  }

  /**
   * Validate an entire form element.
   * @param {HTMLFormElement} formEl
   * @returns {{ valid: boolean, data: object, errors: object }}
   */
  function validateForm(formEl) {
    var errors = {};
    var data = {};

    // Student Name
    var nameInput = formEl.querySelector('[name="student_name"]');
    if (nameInput) {
      var nameVal = truncate(stripHTML(nameInput.value));
      if (!nameVal || nameVal.length < 2) {
        errors.student_name = 'Please enter the student\'s name (at least 2 characters).';
      } else {
        data.student_name = nameVal;
      }
    }

    // Grade
    var gradeInput = formEl.querySelector('[name="grade"]');
    if (gradeInput) {
      var gradeVal = gradeInput.value;
      if (!validateGrade(gradeVal)) {
        errors.grade = 'Please select a valid grade (7, 8, 9, or 10).';
      } else {
        data.grade = parseInt(gradeVal, 10);
      }
    }

    // Subject
    var subjectInput = formEl.querySelector('[name="subject"]');
    if (subjectInput) {
      var subjectVal = subjectInput.value;
      if (!validateSubject(subjectVal)) {
        errors.subject = 'Please select a valid subject (Maths, Science, or Both).';
      } else {
        data.subject = subjectVal;
      }
    }

    // Phone
    var phoneInput = formEl.querySelector('[name="phone"]');
    if (phoneInput) {
      var phoneVal = phoneInput.value;
      if (!validatePhone(phoneVal)) {
        errors.phone = 'Please enter a valid 10-digit Indian mobile number.';
      } else {
        data.phone = cleanPhone(phoneVal);
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      data: data,
      errors: errors
    };
  }

  /**
   * Show inline validation errors below form fields.
   * Uses red #ef4444 with the existing .form-control border pattern.
   */
  function showInlineErrors(formEl, errors) {
    clearErrors(formEl);

    Object.keys(errors).forEach(function (fieldName) {
      var input = formEl.querySelector('[name="' + fieldName + '"]');
      if (!input) return;

      // Style the input with error state
      input.style.borderColor = '#ef4444';
      input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.15)';

      // Create error message element
      var msg = document.createElement('div');
      msg.className = 'aira-field-error';
      msg.textContent = errors[fieldName];
      msg.style.cssText = [
        'color: #ef4444',
        'font-size: 0.8rem',
        'margin-top: 0.35rem',
        'font-weight: 500',
        'animation: airaShake 0.3s ease'
      ].join(';');

      // Insert after the input (or after its parent .form-group if applicable)
      var container = input.closest('.form-group') || input.parentElement;
      container.appendChild(msg);
    });

    // Inject shake animation if not already present
    if (!document.getElementById('aira-error-styles')) {
      var style = document.createElement('style');
      style.id = 'aira-error-styles';
      style.textContent = '@keyframes airaShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}';
      document.head.appendChild(style);
    }
  }

  /** Remove all inline validation errors from a form */
  function clearErrors(formEl) {
    // Remove error messages
    var errorMsgs = formEl.querySelectorAll('.aira-field-error');
    errorMsgs.forEach(function (msg) { msg.remove(); });

    // Reset input styles
    var inputs = formEl.querySelectorAll('input, select, textarea');
    inputs.forEach(function (input) {
      input.style.borderColor = '';
      input.style.boxShadow = '';
    });
  }

  // Expose public API
  window.AiraSanitize = {
    stripHTML: stripHTML,
    validatePhone: validatePhone,
    cleanPhone: cleanPhone,
    validateGrade: validateGrade,
    validateSubject: validateSubject,
    truncate: truncate,
    validateForm: validateForm,
    showInlineErrors: showInlineErrors,
    clearErrors: clearErrors
  };
})();
