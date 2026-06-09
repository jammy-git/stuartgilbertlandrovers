(function () {
  var form = document.querySelector('form[action="/api/contact"]');
  if (!form) return;
  var submit = form.querySelector('button[type="submit"]');
  var statusEl = document.getElementById('ts-status');
  var loaded = false, queued = false, failed = false;

  function setStatus(msg) { if (statusEl) statusEl.textContent = msg; }

  function fail() {
    if (failed) return;
    failed = true;
    submit.disabled = false;
    setStatus("The spam check couldn't load. Please call us on 01795 843116 instead, or try again later.");
  }

  function load() {
    if (loaded || failed) return;
    loaded = true;
    submit.disabled = true;
    setStatus("Checking you're human…");
    var widget = form.querySelector('.cf-turnstile');
    var s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__tsReady';
    s.async = true;
    s.onerror = fail;
    var timer = setTimeout(fail, 8000);
    window.__tsReady = function () {
      clearTimeout(timer);
      try {
        turnstile.render(widget, {
          sitekey: widget.dataset.sitekey,
          callback: function () {
            submit.disabled = false;
            setStatus('');
            if (queued) form.submit();
          },
          'error-callback': fail
        });
      } catch (e) { fail(); }
    };
    document.head.appendChild(s);
  }

  form.addEventListener('focusin', load);
  form.addEventListener('touchstart', load, { passive: true });
  form.addEventListener('submit', function (e) {
    if (failed) return; // allow POST; the server returns the clear-error page
    var token = form.querySelector('[name="cf-turnstile-response"]');
    if (submit.disabled || !token || !token.value) {
      e.preventDefault();
      queued = true;
      load();
    }
  });
})();
