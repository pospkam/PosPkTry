/**
 * TourHub Partner Widget — Embed Script
 *
 * Usage on partner site:
 * <script src="https://tourhab.ru/widget/embed.js"
 *         data-partner-id="fishingkam"
 *         data-theme="light">
 * </script>
 */
(function () {
  'use strict';

  var script = document.currentScript;
  if (!script) return;

  var partnerId = script.getAttribute('data-partner-id');
  if (!partnerId) {
    console.warn('[TourHub Widget] data-partner-id is required');
    return;
  }

  var theme = script.getAttribute('data-theme') || 'light';
  var position = script.getAttribute('data-position') || 'right';
  var baseUrl = script.src.replace(/\/widget\/embed\.js.*$/, '');

  // Prevent double-init
  if (document.getElementById('tourhub-widget-root')) return;

  // Styles
  var accent = '#D44A0C';
  var css = document.createElement('style');
  css.textContent = [
    '#tourhub-widget-root{position:fixed;bottom:20px;z-index:999999;font-family:system-ui,sans-serif}',
    position === 'left'
      ? '#tourhub-widget-root{left:20px}'
      : '#tourhub-widget-root{right:20px}',
    '#tourhub-widget-btn{width:56px;height:56px;border-radius:50%;border:none;background:' + accent + ';color:#fff;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;transition:transform .2s,box-shadow .2s}',
    '#tourhub-widget-btn:hover{transform:scale(1.08);box-shadow:0 6px 24px rgba(0,0,0,0.25)}',
    '#tourhub-widget-btn svg{width:24px;height:24px}',
    '#tourhub-widget-frame{position:absolute;bottom:70px;width:370px;height:520px;border:none;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,0.18);opacity:0;transform:translateY(10px) scale(0.95);transition:opacity .25s,transform .25s;pointer-events:none;background:#fff}',
    position === 'left'
      ? '#tourhub-widget-frame{left:0}'
      : '#tourhub-widget-frame{right:0}',
    '#tourhub-widget-frame.open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}',
    '@media(max-width:420px){#tourhub-widget-frame{width:calc(100vw - 32px);right:auto;left:50%;transform:translateX(-50%) translateY(10px) scale(0.95)}#tourhub-widget-frame.open{transform:translateX(-50%) translateY(0) scale(1)}}',
  ].join('\n');
  document.head.appendChild(css);

  // Root
  var root = document.createElement('div');
  root.id = 'tourhub-widget-root';

  // Chat icon SVG
  var chatIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var closeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  // Iframe
  var iframe = document.createElement('iframe');
  iframe.id = 'tourhub-widget-frame';
  iframe.src = baseUrl + '/widget/' + encodeURIComponent(partnerId) + '?theme=' + theme;
  iframe.title = 'TourHub AI Chat';
  iframe.setAttribute('loading', 'lazy');

  // Button
  var btn = document.createElement('button');
  btn.id = 'tourhub-widget-btn';
  btn.innerHTML = chatIcon;
  btn.setAttribute('aria-label', 'Open chat');

  var isOpen = false;

  btn.addEventListener('click', function () {
    isOpen = !isOpen;
    if (isOpen) {
      iframe.classList.add('open');
      btn.innerHTML = closeIcon;
      btn.setAttribute('aria-label', 'Close chat');
    } else {
      iframe.classList.remove('open');
      btn.innerHTML = chatIcon;
      btn.setAttribute('aria-label', 'Open chat');
    }
  });

  root.appendChild(iframe);
  root.appendChild(btn);
  document.body.appendChild(root);
})();
