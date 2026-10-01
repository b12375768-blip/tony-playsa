/* PC Games vs PlayStation - shared behaviour
   No cloaking, no forced redirects, no affiliate redirects. */

(function () {
  'use strict';

  /* ---------- Mobile navigation ---------- */
  var toggle = document.querySelector('[data-nav-toggle]');
  var menu = document.querySelector('[data-nav-menu]');

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 880) {
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Smooth in-page scrolling ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var href = a.getAttribute('href');
      if (!href || href === '#' || href.length < 2) return;
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });

  /* ---------- Contact / newsletter forms ----------
     There is no server-side form backend, so instead of faking a
     successful submission we hand the message to the visitor's own
     mail client and say so plainly.

     CONTACT_EMAIL is deliberately empty until a real address is set.
     An empty value must not silently "succeed" by opening an email
     with no recipient, so we refuse the submission and say why. */
  var CONTACT_EMAIL = ''; /* set this to the real address before publishing */

  function contactConfigured() {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(CONTACT_EMAIL);
  }

  function mailtoHandler(form, statusEl) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!contactConfigured()) {
        if (statusEl) {
          statusEl.className = 'form-status form-status--err is-visible';
          statusEl.textContent =
            'This form cannot send anything yet: no contact address has been published on this site, so there is nobody for the message to go to. Nothing was sent and nothing was stored.';
        }
        return;
      }

      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });

      var errors = [];
      Object.keys(data).forEach(function (k) {
        var field = form.querySelector('[name="' + k + '"]');
        if (!field) return;
        var msgEl = form.querySelector('#' + k + '-error');
        var value = (data[k] || '').trim();

        if (field.required && !value) {
          errors.push(k);
          if (msgEl) msgEl.textContent = 'This field is required.';
          field.setAttribute('aria-invalid', 'true');
        } else if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
          errors.push(k);
          if (msgEl) msgEl.textContent = 'Enter a valid email address, e.g. name@example.com.';
          field.setAttribute('aria-invalid', 'true');
        } else {
          if (msgEl) msgEl.textContent = '';
          field.removeAttribute('aria-invalid');
        }
      });

      if (errors.length) {
        if (statusEl) {
          statusEl.className = 'form-status form-status--err is-visible';
          statusEl.textContent = 'Please fix the highlighted fields and try again.';
        }
        var firstBad = form.querySelector('[aria-invalid="true"]');
        if (firstBad) firstBad.focus();
        return;
      }

      var subject = '[Website enquiry] ' + (data.topic || 'General question') + ' from ' + data.name;
      var body =
        'Name: ' + data.name + '\n' +
        'Email: ' + data.email + '\n' +
        (data.topic ? 'Topic: ' + data.topic + '\n' : '') + '\n' +
        'Message:\n' + data.message;

      window.location.href =
        'mailto:' + CONTACT_EMAIL +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);

      if (statusEl) {
        statusEl.className = 'form-status form-status--ok is-visible';
        statusEl.textContent =
          'Your email app should now be open with the message ready to send. ' +
          'Check the recipient address before you send. If nothing opened, ' +
          'copy your message and email us directly.';
      }
      form.reset();
    });
  }

  document.querySelectorAll('form[data-mail-form]').forEach(function (form) {
    var statusEl = form.querySelector('[data-form-status]');
    mailtoHandler(form, statusEl);
  });

  /* Hide the "form cannot send yet" warning once a real address exists. */
  if (contactConfigured()) {
    document.querySelectorAll('[data-contact-unconfigured]').forEach(function (el) {
      el.parentNode.removeChild(el);
    });
  }

  /* ---------- Honest age / ratings notice ----------
     Informational only. It never blocks the page, never redirects
     off-site, and can always be dismissed. Shown once per session. */
  var NOTICE_KEY = 'pgp_age_notice_seen';

  function showAgeNotice() {
    if (!window.sessionStorage) return;
    var seen;
    try { seen = sessionStorage.getItem(NOTICE_KEY) === '1'; } catch (err) { seen = false; }
    if (seen) return;

    var backdrop = document.querySelector('[data-age-notice]');
    if (!backdrop) return;

    backdrop.classList.add('is-open');

    function dismiss() {
      backdrop.classList.remove('is-open');
      backdrop.remove();
      try { sessionStorage.setItem(NOTICE_KEY, '1'); } catch (err) { /* storage blocked */ }
    }

    var yes = backdrop.querySelector('[data-notice-ok]');
    var no = backdrop.querySelector('[data-notice-close]');
    if (yes) yes.addEventListener('click', dismiss);
    if (no) no.addEventListener('click', dismiss);

    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') dismiss();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showAgeNotice);
  } else {
    showAgeNotice();
  }
})();