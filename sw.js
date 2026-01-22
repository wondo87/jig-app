// Service Worker for Design Jig Admin PWA
const CACHE_VERSION = 'designjig-admin-v17';
const CACHE_FILES = [
    './adminwonpro.html',
    './admin_config.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// 설치 이벤트 - 정적 파일 캐시
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => {
                console.log('캐시 열림');
                return cache.addAll(CACHE_FILES);
            })
            .then(() => {
                console.log('모든 파일 캐시 완료');
                return self.skipWaiting();
            })
            .catch((err) => {
                console.log('캐시 실패:', err);
            })
    );
});

// 활성화 이벤트 - 이전 캐시 삭제
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_VERSION) {
                            console.log('이전 캐시 삭제:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('서비스 워커 활성화 완료');
                return self.clients.claim();
            })
    );
});

// Fetch 이벤트 - 캐시 우선, 네트워크 폴백
self.addEventListener('fetch', (event) => {
    // API 요청은 항상 네트워크로 처리
    if (event.request.url.includes('script.google.com') ||
        event.request.url.includes('cloudinary.com') ||
        event.request.url.includes('cdn.jsdelivr.net')) {
        event.respondWith(fetch(event.request));
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // 캐시에서 응답 반환하고, 백그라운드에서 네트워크 업데이트
                    fetch(event.request)
                        .then((networkResponse) => {
                            if (networkResponse && networkResponse.status === 200) {
                                caches.open(CACHE_VERSION)
                                    .then((cache) => {
                                        cache.put(event.request, networkResponse);
                                    });
                            }
                        })
                        .catch(() => {});
                    return cachedResponse;
                }

                // 캐시에 없으면 네트워크 요청
                return fetch(event.request)
                    .then((networkResponse) => {
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        // 응답을 복제해서 캐시에 저장
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_VERSION)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    });
            })
    );
});
