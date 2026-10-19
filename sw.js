/* Preparados: guarda la app en el celular para que abra sin internet. */
const CACHE = "preparados-v21";
const BASE = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting())); });
const DATOS = "preparados-datos"; /* la lista de recordatorios que arma la app: no se borra al actualizar */
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== DATOS).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  /* La página: primero internet (para recibir las mejoras); si no hay, la copia guardada. */
  if(req.mode === "navigate" || (url.origin === location.origin && url.pathname.endsWith("index.html"))){
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put("index.html", cp)); return r; }).catch(() => caches.match("index.html").then(r => r || caches.match("./"))));
    return;
  }
  /* Íconos, manifiesto y tipografías: la copia guardada y, en segundo plano, se actualiza. */
  if(url.origin === location.origin || url.host === "fonts.googleapis.com" || url.host === "fonts.gstatic.com"){
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(r => { if(r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
  }
});

/* Recordatorios: Android despierta a la app de vez en cuando (si lo permite) y avisa lo que toca */
async function revisarRecordatorios(){
  const c = await caches.open(DATOS), r = await c.match("./__recordatorios.json");
  if(!r) return;
  const d = await r.json();
  if(!d.on || !Array.isArray(d.items)) return;
  const hoy = new Date().toISOString().slice(0, 10);
  if(d.avisado === hoy) return;
  const toca = d.items.filter(x => x.due <= Date.now());
  if(!toca.length) return;
  await self.registration.showNotification(toca.length === 1 ? "Preparados: 1 recordatorio" : `Preparados: ${toca.length} recordatorios`, {
    body:toca.slice(0, 3).map(x => x.t).join(" · ") + (toca.length > 3 ? " y más" : ""),
    icon:"icons/icon-192.png", badge:"icons/icon-192.png", tag:"recordatorios", data:{url:"./#recordatorios"}
  });
  d.avisado = hoy;
  await c.put("./__recordatorios.json", new Response(JSON.stringify(d), {headers:{"Content-Type":"application/json"}}));
}
self.addEventListener("periodicsync", e => { if(e.tag === "recordatorios") e.waitUntil(revisarRecordatorios()); });
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(self.clients.matchAll({type:"window", includeUncontrolled:true}).then(ws => {
    for(const w of ws){ if("focus" in w){ w.navigate(url).catch(() => {}); return w.focus(); } }
    return self.clients.openWindow(url);
  }));
});
