// KERN Service Worker v6 — notifications only, NO caching
const SW_VERSION = 'kern-sw-v6';

self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  // Clear ALL caches
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    .then(() => self.clients.claim())
  );
});

// NO fetch handler — let browser fetch everything fresh every time

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients => {
      for(const c of clients){
        if(c.url.includes('kern') && 'focus' in c) return c.focus();
      }
      if(self.clients.openWindow) return self.clients.openWindow('./kern.html');
    })
  );
});

self.addEventListener('message', e => {
  const {type, payload} = e.data || {};
  if(type === 'SCHEDULE_DAILY') scheduleDailyAlarm(payload.hour, payload.minute, payload.title, payload.body);
  if(type === 'CANCEL_DAILY') clearDailyAlarm();
  if(type === 'TEST_NOTIF'){
    self.registration.showNotification(payload.title || 'KERN_OS ✦', {
      body: payload.body || 'Good morning, Akosaemeka.',
      icon: './favicon.ico', tag: 'kern-test', vibrate: [200,100,200],
    });
  }
  if(type === 'SKIP_WAITING') self.skipWaiting();
});

let _alarmTimer = null;
function clearDailyAlarm(){ if(_alarmTimer){clearTimeout(_alarmTimer);_alarmTimer=null;} }
function scheduleDailyAlarm(hour, minute, title, body){
  clearDailyAlarm();
  const now=new Date(), next=new Date();
  next.setHours(hour,minute,0,0);
  if(next<=now) next.setDate(next.getDate()+1);
  _alarmTimer=setTimeout(()=>{
    fireAlarm(title,body);
    _alarmTimer=setInterval(()=>fireAlarm(title,body),86400000);
  }, next-now);
}
function fireAlarm(title,body){
  self.registration.showNotification(title||'KERN_OS ✦',{
    body: body||'Good morning, Akosaemeka. Open KERN to start your day.',
    icon:'./favicon.ico', tag:'kern-daily', renotify:true, vibrate:[300,100,300,100,300],
    actions:[{action:'open',title:'Open KERN'},{action:'dismiss',title:'Dismiss'}]
  });
}
