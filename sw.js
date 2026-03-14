// KERN Service Worker — background notifications
const SW_VERSION = 'kern-sw-v1';

// ── INSTALL & ACTIVATE ──────────────────────────────────────────────────────
self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

// ── NOTIFICATION CLICK ──────────────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients => {
      // If app is already open, focus it
      for(const client of clients){
        if(client.url.includes('kern') && 'focus' in client){
          return client.focus();
        }
      }
      // Otherwise open it
      if(self.clients.openWindow){
        return self.clients.openWindow('./kern.html');
      }
    })
  );
});

// ── PUSH EVENTS (from server push — future use) ─────────────────────────────
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  const title = data.title || 'KERN_OS';
  const body  = data.body  || 'You have a new notification.';
  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: data.icon || './favicon.ico',
      badge: data.badge || './favicon.ico',
      tag: data.tag || 'kern-notif',
      renotify: true,
    })
  );
});

// ── MESSAGE HANDLER — schedule alarms from the app ──────────────────────────
// The app posts messages here to schedule notifications via SW
self.addEventListener('message', e => {
  const {type, payload} = e.data || {};

  if(type === 'SCHEDULE_DAILY'){
    // payload: { hour, minute, title, body }
    const {hour, minute, title, body} = payload;
    scheduleDailyAlarm(hour, minute, title, body);
  }

  if(type === 'CANCEL_DAILY'){
    clearDailyAlarm();
  }

  if(type === 'TEST_NOTIF'){
    self.registration.showNotification(payload.title || 'KERN_OS ✦', {
      body: payload.body || 'Good morning, Akosaemeka. Your daily briefing is ready.',
      icon: payload.icon || './favicon.ico',
      badge: payload.icon || './favicon.ico',
      tag: 'kern-test',
      vibrate: [200, 100, 200],
    });
  }
});

// ── DAILY ALARM ENGINE ───────────────────────────────────────────────────────
let _alarmTimer = null;

function clearDailyAlarm(){
  if(_alarmTimer){ clearTimeout(_alarmTimer); _alarmTimer = null; }
}

function scheduleDailyAlarm(hour, minute, title, body){
  clearDailyAlarm();

  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);

  // If time has passed today, schedule for tomorrow
  if(next <= now) next.setDate(next.getDate() + 1);

  const msUntil = next - now;

  _alarmTimer = setTimeout(() => {
    fireAlarm(title, body);
    // Re-schedule every 24 hours
    _alarmTimer = setInterval(() => fireAlarm(title, body), 24 * 60 * 60 * 1000);
  }, msUntil);
}

function fireAlarm(title, body){
  self.registration.showNotification(title || 'KERN_OS ✦', {
    body: body || 'Good morning, Akosaemeka. Open KERN to start your day.',
    icon: './favicon.ico',
    badge: './favicon.ico',
    tag: 'kern-daily',
    renotify: true,
    vibrate: [300, 100, 300, 100, 300],
    actions: [
      {action: 'open', title: 'Open KERN'},
      {action: 'dismiss', title: 'Dismiss'},
    ]
  });
}
