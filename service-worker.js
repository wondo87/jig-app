const CACHE_NAME = 'dj-admin-v1';

// 설치 시 캐시할 파일들 (최소한의 오프라인 실행 보장)
const STATIC_ASSETS = [
    './icon.svg'
];

self.addEventListener('install', (event) => {
    self.skipWaiting(); // 즉시 활성화
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.map((key) => {
                if (key !== CACHE_NAME) return caches.delete(key);
            })
        ))
    );
    return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 1. Google Apps Script API 및 외부 API -> 항상 네트워크 (캐시 금지)
    if (url.hostname.includes('script.google.com') ||
        url.hostname.includes('sheets.googleapis.com') ||
        event.request.method !== 'GET') {
        return; // 브라우저 기본 동작 (네트워크) 수행
    }

    // 2. HTML, JS, CSS 등 정적 리소스 -> 네트워크 우선, 실패 시 캐시 (Network First)
    // 개발 중 변경사항 즉시 반영을 위해 Network First 전략 채택
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // 유효한 응답이면 캐시에 저장 (복사본)
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                // 네트워크 실패 시 캐시에서 조회
                return caches.match(event.request);
            })
    );
});
