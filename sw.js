const CACHE = "meal-pa-v22";
const FILES = [
  "./",
  "./meal-pa.html",
  "./manifest.json",
  "./icon-180.png",
  "./icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(FILES.map(f => c.add(f).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 캐시 우선: 비행기 모드에서도 저장된 화면을 그대로 연다
self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  // 인식기(tesseract) 파일은 외부에서 오지만 캐시해 둬야 오프라인에서 쓸 수 있다
  const external = url.origin !== self.location.origin;
  if(external && !/jsdelivr|tessdata|unpkg/.test(url.hostname)) return;  // API 호출은 통과
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if(res && res.ok){
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(err => {
      // 화면 이동일 때만 저장된 앱 화면으로 돌려준다.
      // 스크립트나 wasm 요청에 HTML 을 주면 인식기가 통째로 망가진다.
      if(req.mode === "navigate") return caches.match("./meal-pa.html");
      throw err;
    }))
  );
});
