(() => {
  const widget = document.getElementById('support-widget');
  const anchor = document.querySelector('.support-anchor');
  const bubble = document.getElementById('support-bubble');
  const dismiss = document.getElementById('support-dismiss');
  const panel = document.getElementById('support-chat');
  const panelClose = document.getElementById('support-panel-close');
  const messages = document.getElementById('support-messages');
  const quick = document.getElementById('support-quick-replies');
  const form = document.getElementById('support-form');
  const input = document.getElementById('support-input');
  const send = document.getElementById('support-send');
  const count = document.getElementById('support-count');
  const status = document.getElementById('support-status');
  const live = document.getElementById('support-live');
  const questions = [
    'How do I get started?',
    'How do I log sleep?',
    'How do I add a task?',
    'How do Garden rewards work?',
    'Where is my progress saved?',
  ];
  const conversation = [];
  const bubbleSize = 56;
  let position = null;
  let viewport = null;
  let drag = null;
  let frame = 0;
  let suppressClick = false;
  let busy = false;

  const clamp = (value, low, high) => Math.max(low, Math.min(value, high));
  const safeProbe = document.createElement('div');
  safeProbe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.append(safeProbe);

  function readViewport() {
    const visual = window.visualViewport;
    const style = getComputedStyle(safeProbe);
    const mobileApp = window.innerWidth <= 560 && !!document.querySelector('.shell');
    const left = visual?.offsetLeft || 0;
    const top = visual?.offsetTop || 0;
    const width = visual?.width || window.innerWidth;
    const height = visual?.height || window.innerHeight;
    return {
      left, top, right: left + width, bottom: top + height, width, height,
      marginLeft: Math.max(16, parseFloat(style.paddingLeft) || 0),
      marginRight: Math.max(16, parseFloat(style.paddingRight) || 0),
      marginTop: Math.max(16, parseFloat(style.paddingTop) || 0),
      // Keep the default above the phone's bottom navigation and the first row of dashboard controls.
      marginBottom: Math.max(mobileApp ? 200 : 20, (parseFloat(style.paddingBottom) || 0) + 16),
    };
  }

  function clampPosition(x, y) {
    const v = viewport;
    return {
      x: clamp(x, v.left + v.marginLeft + 50, Math.max(v.left + v.marginLeft + 50, v.right - v.marginRight - bubbleSize)),
      y: clamp(y, v.top + v.marginTop + 17, Math.max(v.top + v.marginTop + 17, v.bottom - v.marginBottom - bubbleSize)),
    };
  }

  function placePanel() {
    if (panel.hidden || !position || !viewport) return;
    const v = viewport;
    const margin = Math.max(v.marginLeft, v.marginRight);
    const width = Math.max(220, Math.min(370, v.width - margin * 2));
    const gap = 16;
    const above = position.y - (v.top + v.marginTop) - gap;
    const below = (v.bottom - v.marginBottom) - (position.y + bubbleSize) - gap;
    const useAbove = above >= 300 || above >= below;
    const available = Math.max(150, useAbove ? above : below);
    const height = Math.min(510, available);
    const suggestedLeft = (v.right - position.x - bubbleSize > position.x - v.left) ? position.x : position.x + bubbleSize - width;
    const x = clamp(suggestedLeft, v.left + margin, v.right - margin - width);
    const y = useAbove ? position.y - gap - height : position.y + bubbleSize + gap;
    panel.style.width = `${width}px`;
    panel.style.height = `${height}px`;
    panel.style.transform = `translate3d(${Math.round(x)}px,${Math.round(y)}px,0)`;
  }

  function paint() {
    frame = 0;
    if (!position) return;
    anchor.style.transform = `translate3d(${Math.round(position.x)}px,${Math.round(position.y)}px,0)`;
    placePanel();
  }

  function schedulePaint() { if (!frame) frame = requestAnimationFrame(paint); }

  function layout() {
    viewport = readViewport();
    if (!position) {
      position = clampPosition(viewport.right - viewport.marginRight - bubbleSize, viewport.bottom - viewport.marginBottom - bubbleSize);
    } else position = clampPosition(position.x, position.y);
    schedulePaint();
  }

  function setNavExpanded(value) {
    document.querySelectorAll('[data-support]').forEach(button => button.setAttribute('aria-expanded', String(value)));
  }

  function addMessage(role, content, kind = 'answer') {
    const item = document.createElement('div');
    item.className = 'support-message';
    item.dataset.role = role;
    item.dataset.kind = kind;
    item.textContent = content;
    messages.append(item);
    messages.scrollTop = messages.scrollHeight;
    return item;
  }

  function openPanel() {
    if (widget.hidden) return;
    panel.hidden = false;
    panel.inert = false;
    bubble.setAttribute('aria-expanded', 'true');
    bubble.setAttribute('aria-label', 'Close support chat');
    if (!conversation.length && !messages.children.length) addMessage('assistant', 'Hi! I can help you find and use MindRise features. What would you like to know?');
    layout();
    input.focus({ preventScroll: true });
  }

  function closePanel(restoreFocus = true) {
    if (panel.hidden) return;
    panel.hidden = true;
    panel.inert = true;
    bubble.setAttribute('aria-expanded', 'false');
    bubble.setAttribute('aria-label', 'Open support chat');
    if (restoreFocus && !widget.hidden) bubble.focus({ preventScroll: true });
  }

  function show() {
    if (widget.hidden) {
      widget.hidden = false;
      widget.classList.remove('is-visible');
      void widget.offsetWidth;
      widget.classList.add('is-visible');
    }
    setNavExpanded(true);
    layout();
    openPanel();
  }

  function hide() {
    closePanel(false);
    widget.hidden = true;
    widget.classList.remove('is-visible');
    setNavExpanded(false);
    const support = [...document.querySelectorAll('[data-support]')].find(button => button.getClientRects().length);
    (support || document.querySelector('.home-menu,.back-link,h1'))?.focus({ preventScroll: true });
    live.textContent = 'Support hidden.';
  }

  function announcePosition() {
    if (!position || !viewport) return;
    const x = (position.x - viewport.left) / viewport.width;
    const y = (position.y - viewport.top) / viewport.height;
    const horizontal = x < .34 ? 'left' : x > .66 ? 'right' : 'center';
    const vertical = y < .34 ? 'upper' : y > .66 ? 'lower' : 'middle';
    live.textContent = `Support moved to the ${vertical} ${horizontal} of the screen.`;
  }

  function moveTo(x, y) {
    position = clampPosition(x, y);
    schedulePaint();
  }

  bubble.addEventListener('pointerdown', event => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    if (!viewport) layout();
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: position.x, top: position.y, moved: false };
    bubble.setPointerCapture(event.pointerId);
  });
  bubble.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 6) {
      drag.moved = true;
      document.body.classList.add('support-dragging');
    }
    if (drag.moved) {
      event.preventDefault();
      moveTo(drag.left + dx, drag.top + dy);
    }
  });
  function endDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    if (drag.moved) {
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 100);
      announcePosition();
    }
    document.body.classList.remove('support-dragging');
    if (bubble.hasPointerCapture(event.pointerId)) bubble.releasePointerCapture(event.pointerId);
    drag = null;
  }
  bubble.addEventListener('pointerup', endDrag);
  bubble.addEventListener('pointercancel', endDrag);
  bubble.addEventListener('click', event => {
    if (suppressClick) { event.preventDefault(); suppressClick = false; return; }
    if (panel.hidden) openPanel(); else closePanel();
  });
  bubble.addEventListener('keydown', event => {
    const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!moves[event.key]) return;
    event.preventDefault();
    const step = event.shiftKey ? 48 : 20;
    moveTo(position.x + moves[event.key][0] * step, position.y + moves[event.key][1] * step);
    announcePosition();
  });
  dismiss.addEventListener('click', hide);
  panelClose.addEventListener('click', () => closePanel());
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !widget.hidden && !panel.hidden) { event.preventDefault(); closePanel(); }
  });

  async function ask(question) {
    const message = question.trim();
    if (!message || busy) return;
    const history = conversation.filter(item => item.kind === 'answer').slice(-6).map(({ role, content }) => ({ role, content }));
    conversation.push({ role: 'user', content: message, kind: 'answer' });
    addMessage('user', message);
    input.value = '';
    count.textContent = '0 / 400';
    busy = true;
    send.disabled = true;
    status.textContent = 'Thinking…';
    const loading = addMessage('assistant', 'Finding an answer…', 'loading');
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
      });
      const result = await response.json();
      loading.remove();
      if (!response.ok || typeof result.reply !== 'string') throw new Error('Unavailable');
      addMessage('assistant', result.reply, result.kind || 'answer');
      if (result.kind === 'answer') conversation.push({ role: 'assistant', content: result.reply, kind: 'answer' });
      status.textContent = '';
    } catch (_) {
      loading.remove();
      addMessage('assistant', 'The helper is unavailable right now. Please try again later.', 'error');
      status.textContent = 'Helper unavailable';
    } finally {
      busy = false;
      send.disabled = false;
    }
  }

  questions.forEach(question => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = question;
    button.addEventListener('click', () => ask(question));
    quick.append(button);
  });
  form.addEventListener('submit', event => { event.preventDefault(); ask(input.value); });
  input.addEventListener('input', () => { count.textContent = `${input.value.length} / 400`; });
  const observer = new MutationObserver(() => {
    setNavExpanded(!widget.hidden);
    if (!widget.hidden) layout();
  });
  observer.observe(document.getElementById('app'), { childList: true });
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', layout);
  window.visualViewport?.addEventListener('resize', layout);
  window.visualViewport?.addEventListener('scroll', layout);
  window.MindRiseSupport = { show, closePanel };
})();
