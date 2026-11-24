// sw.js: service worker (minggu 8). Berjalan terpisah dari halaman dan
// hanya aktif setelah aplikasi diterbitkan lewat HTTPS (GitHub Pages).
importScripts("app.js"); // memakai strategiCache() dari app.js

const NAMA_CACHE = "agenda-v1";
const BERKAS_APLIKASI = ["./", "./index.html", "./style.css", "./app.js", "./penghubung.js", "./manifest.webmanifest"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(NAMA_CACHE).then(cache => cache.addAll(BERKAS_APLIKASI)));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(nama => Promise.all(nama.filter(n => n !== NAMA_CACHE).map(n => caches.delete(n))))
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const strategi = strategiCache(event.request.url, self.location.origin);
  if (strategi === "cache-dulu") {
    event.respondWith(caches.match(event.request).then(simpanan => simpanan || fetch(event.request)));
  } else if (strategi === "jaringan-dulu") {
    event.respondWith(
      fetch(event.request)
        .then(jawaban => {
          const salinan = jawaban.clone();
          caches.open(NAMA_CACHE).then(cache => cache.put(event.request, salinan));
          return jawaban;
        })
        .catch(() => caches.match(event.request))
    );
  }
  // "jaringan-saja": biarkan browser mengambil seperti biasa.
});
