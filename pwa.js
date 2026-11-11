(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else api.start(root);
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';

  function canRegister(location, navigator) {
    if (!navigator || !('serviceWorker' in navigator)) return false;
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
    return location.protocol === 'https:' || local;
  }

  function installMode({ standalone = false, direct = false, prompt = false, ios = false } = {}) {
    if (standalone) return 'hidden';
    if (direct) return 'direct';
    if (prompt) return 'prompt';
    if (ios) return 'ios';
    return 'hidden';
  }

  function start(win) {
    const doc = win.document;
    const nav = win.navigator;
    let deferredPrompt = null;
    let registration = null;
    let reloading = false;
    const standalone = () => win.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
    const ios = /iphone|ipad|ipod/i.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
    const direct = typeof nav.install === 'function';
    const mode = () => installMode({ standalone: standalone(), direct, prompt: !!deferredPrompt, ios });

    function paintInstall() {
      const current = mode();
      doc.querySelectorAll('[data-pwa-install]').forEach(button => {
        button.hidden = current === 'hidden';
        button.setAttribute('aria-label', current === 'ios' ? 'How to install MindRise' : 'Install MindRise');
      });
      doc.querySelectorAll('[data-pwa-install-detail]').forEach(detail => {
        const message = current === 'ios' ? 'Add MindRise to your Home Screen.' : 'Open MindRise from your device like an app.';
        if (detail.textContent !== message) detail.textContent = message;
      });
    }

    function iosHelp() {
      let dialog = doc.getElementById('pwa-install-help');
      if (!dialog) {
        dialog = doc.createElement('dialog');
        dialog.id = 'pwa-install-help';
        dialog.className = 'pwa-dialog';
        dialog.setAttribute('aria-labelledby', 'pwa-install-title');
        dialog.innerHTML = '<button class="pwa-dialog-close" type="button" aria-label="Close installation help">×</button><img src="/assets/icons/icon-192.png" alt="" width="72" height="72"><h2 id="pwa-install-title">Install MindRise</h2><p>Open this page in Safari, tap the Share button, then choose <strong>Add to Home Screen</strong>.</p><button class="btn" type="button" data-pwa-close>Got it</button>';
        doc.body.append(dialog);
        dialog.addEventListener('click', event => {
          if (event.target.closest('[data-pwa-close],.pwa-dialog-close')) dialog.close();
        });
      }
      dialog.showModal();
    }

    async function requestInstall() {
      const current = mode();
      try {
        if (current === 'ios') return iosHelp();
        if (current === 'direct') await nav.install();
        else if (current === 'prompt' && deferredPrompt) {
          const prompt = deferredPrompt;
          deferredPrompt = null;
          await prompt.prompt();
          await prompt.userChoice;
        }
      } catch (error) {
        if (error?.name !== 'AbortError') console.warn('MindRise installation could not start.', error);
      }
      paintInstall();
    }

    function offerUpdate(worker) {
      if (!worker || doc.getElementById('pwa-update')) return;
      const notice = doc.createElement('section');
      notice.id = 'pwa-update';
      notice.className = 'pwa-update';
      notice.setAttribute('aria-label', 'MindRise update available');
      notice.innerHTML = '<div><strong>A MindRise update is ready.</strong><span>Save any open form, then update.</span></div><button class="btn small" type="button">Update now</button><button class="pwa-update-later" type="button">Later</button>';
      notice.querySelector('.btn').addEventListener('click', () => {
        reloading = true;
        worker.postMessage({ type: 'SKIP_WAITING' });
      });
      notice.querySelector('.pwa-update-later').addEventListener('click', () => notice.remove());
      doc.body.append(notice);
    }

    function watchRegistration(nextRegistration) {
      registration = nextRegistration;
      if (registration.waiting) offerUpdate(registration.waiting);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && nav.serviceWorker.controller) offerUpdate(worker);
        });
      });
    }

    win.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      deferredPrompt = event;
      paintInstall();
    });
    win.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      paintInstall();
    });
    doc.addEventListener('click', event => {
      if (event.target.closest('[data-pwa-install]')) void requestInstall();
    });
    new win.MutationObserver(paintInstall).observe(doc.getElementById('app') || doc.body, { childList: true, subtree: true });
    paintInstall();

    if (!canRegister(win.location, nav)) return;
    nav.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) win.location.reload();
    });
    win.addEventListener('load', () => {
      nav.serviceWorker.register('/sw.js').then(watchRegistration).catch(error => console.warn('MindRise offline support unavailable.', error));
    });
  }

  return { canRegister, installMode, start };
});
