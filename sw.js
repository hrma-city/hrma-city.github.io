/* RMC收益管理社区 · Service Worker（离线优先）
   策略：
   - 导航请求：网络优先，失败回退缓存首页（保证离线能开 App）
   - 静态资源：缓存优先，命中即返回，未命中则网络并写入缓存
   - 跨域 / 非 GET：直接放行，不进缓存
*/
const CACHE = "hrma-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/css/mobile.css",
  "./assets/css/main.css",
  "./assets/css/site.css",
  "./assets/css/community.css",
  "./assets/css/auth.css",
  "./assets/css/notify.css",
  "./assets/css/global-ux.css",
  "./assets/js/app.js",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // 容忍个别资源缺失，不整体失败
      return Promise.allSettled(
        SHELL.map(function (u) {
          return fetch(u).then(function (r) { return r.ok ? c.put(u, r) : null; }).catch(function () {});
        })
      );
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 跨域（如 Supabase CDN）放行

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(function (r) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); return r; })
        .catch(function () { return caches.match(req).then(function (r) { return r || caches.match("./index.html"); }); })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (resp) {
        if (resp.ok && resp.type === "basic") {
          var cp = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(req, cp); });
        }
        return resp;
      }).catch(function () { return hit; });
    })
  );
});
