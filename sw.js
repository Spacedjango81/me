// KERN Service Worker — background notifications + cache management
const SW_VERSION = 'kern-sw-v5'; // bump this with every update
const CACHE_NAME = 'kern-cache-v5';
const FILES_TO_CACHE = ['./kern.html', './sw.js'];

// ── INSTALL — cache key files ───────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

// ── ACTIVATE — delete old caches ────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── FETCH — network first, cache fallback ───────────────────────────────────
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if(!url.pathname.endsWith('kern.html') && !url.pathname.endsWith('sw.js')) return;
  e.respondWith(
    fetch(e.request, {cache: 'no-store'})
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ── NOTIFICATION CLICK ──────────────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({type:'window', includeUncontrolled:true}).then(clients => {
      for(const client of clients){
        if(client.url.includes('kern') && 'focus' in client) return client.focus();
      }
      if(self.clients.openWindow) return self.clients.openWindow('./kern.html');
    })
  );
});

// ── MESSAGE HANDLER ──────────────────────────────────────────────────────────
self.addEventListener('message', e => {
  const {type, payload} = e.data || {};
  if(type === 'SCHEDULE_DAILY'){
    const {hour, minute, title, body} = payload;
    scheduleDailyAlarm(hour, minute, title, body);
  }
  if(type === 'CANCEL_DAILY') clearDailyAlarm();
  if(type === 'TEST_NOTIF'){
    self.registration.showNotification(payload.title || 'KERN_OS ✦', {
      body: payload.body || 'Good morning, Akosaemeka. Your daily briefing is ready.',
      icon: './favicon.ico',
      tag: 'kern-test',
      vibrate: [200, 100, 200],
    });
  }
  if(type === 'SKIP_WAITING') self.skipWaiting();
});

// ── DAILY ALARM ENGINE ───────────────────────────────────────────────────────
let _alarmTimer = null;
function clearDailyAlarm(){
  if(_alarmTimer){ clearTimeout(_alarmTimer); _alarmTimer = null; }
}
function scheduleDailyAlarm(hour, minute, title, body){
  clearDailyAlarm();
  const now = new Date(), next = new Date();
  next.setHours(hour, minute, 0, 0);
  if(next <= now) next.setDate(next.getDate() + 1);
  _alarmTimer = setTimeout(() => {
    fireAlarm(title, body);
    _alarmTimer = setInterval(() => fireAlarm(title, body), 86400000);
  }, next - now);
}
function fireAlarm(title, body){
  self.registration.showNotification(title || 'KERN_OS ✦', {
    body: body || 'Good morning, Akosaemeka. Open KERN to start your day.',
    icon: './favicon.ico',
    tag: 'kern-daily',
    renotify: true,
    vibrate: [300, 100, 300, 100, 300],
    actions: [{action:'open', title:'Open KERN'}, {action:'dismiss', title:'Dismiss'}]
  });
}
