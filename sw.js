const CACHE = ‘poker-tracker-v1’;
const ASSETS = [
‘./’,
‘./index.html’
];

// Install — cache the shell
self.addEventListener(‘install’, e => {
e.waitUntil(
caches.open(CACHE).then(c => c.addAll(ASSETS))
);
self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener(‘activate’, e => {
e.waitUntil(
caches.keys().then(keys =>
Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
)
);
self.clients.claim();
});

// Fetch — cache first, network fallback
self.addEventListener(‘fetch’, e => {
e.respondWith(
caches.match(e.request).then(cached => {
if (cached) return cached;
return fetch(e.request).then(res => {
if (!res || res.status !== 200 || res.type !== ‘basic’) return res;
const copy = res.clone();
caches.open(CACHE).then(c => c.put(e.request, copy));
return res;
}).catch(() => caches.match(’./index.html’));
})
);
});