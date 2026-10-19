/* Preparados: guarda la app en el celular para que abra sin internet. */
const CACHE = "preparados-v20";
const BASE = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
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
