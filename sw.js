// Labertal Buchhaltung – Service Worker
// 1) App offline startbar  2) Belegbilder (_blob/<id>) aus dem privaten GitHub-Repo laden und zwischenspeichern
const APP = "lb-app-v5", BLOBS = "lb-blobs", CFG = "lb-cfg";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-180.png"];

self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(APP).then(c => c.addAll(SHELL)).catch(() => { })); });
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("lb-app-") && k !== APP) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("message", e => {
  const m = e.data || {};
  if (m.type === "gh" && m.token) e.waitUntil(caches.open(CFG).then(c => c.put("/cfg", new Response(JSON.stringify({ token: m.token, repo: m.repo })))));
});

function sniff(u8) {
  if (u8[0] === 0x25 && u8[1] === 0x50 && u8[2] === 0x44 && u8[3] === 0x46) return "application/pdf";
  if (u8[0] === 0xff && u8[1] === 0xd8) return "image/jpeg";
  if (u8[0] === 0x89 && u8[1] === 0x50) return "image/png";
  if (u8[0] === 0x52 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x46) return "image/webp";
  if (u8[0] === 0x3c) return "application/xml";
  return "application/octet-stream";
}

async function blob(id) {
  const bc = await caches.open(BLOBS);
  const key = new Request(new URL("_blob/" + id, self.registration.scope).href);
  const hit = await bc.match(key); if (hit) return hit;
  const cfgR = await (await caches.open(CFG)).match("/cfg");
  if (!cfgR) return new Response("Kein GitHub-Zugang", { status: 404 });
  const { token, repo } = await cfgR.json();
  const r = await fetch(`https://api.github.com/repos/${repo}/contents/dateien/${encodeURIComponent(id)}`, { headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github.raw", "X-GitHub-Api-Version": "2022-11-28" } });
  if (!r.ok) return new Response("Nicht gefunden", { status: r.status });
  const buf = new Uint8Array(await r.arrayBuffer());
  const resp = new Response(buf, { headers: { "Content-Type": sniff(buf), "Cache-Control": "max-age=31536000" } });
  await bc.put(key, resp.clone());
  return resp;
}

async function shareIn(req) {
  // Dateien aus dem Teilen-Menü (z. B. Brother Mobile Connect) zwischenspeichern, die App übernimmt sie beim Öffnen
  try {
    const fd = await req.formData(); const c = await caches.open("lb-share"); let i = 0;
    for (const f of fd.getAll("files")) { if (!f || typeof f === "string") continue;
      await c.put(new Request(new URL("share/" + Date.now() + "_" + (i++), self.registration.scope).href), new Response(f, { headers: { "Content-Type": f.type || "application/octet-stream", "X-Name": encodeURIComponent(f.name || "scan.pdf") } })); }
  } catch (x) { }
  return Response.redirect(new URL("./#share", self.registration.scope).href, 303);
}

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method === "POST" && url.origin === location.origin && url.pathname.endsWith("/share-target")) { e.respondWith(shareIn(e.request)); return; }
  if (url.origin === location.origin && url.pathname.includes("/_blob/")) {
    const id = decodeURIComponent(url.pathname.split("/_blob/")[1] || "");
    e.respondWith(blob(id)); return;
  }
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  // App-Dateien: erst Netz (damit Updates sofort da sind), sonst Cache
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(APP).then(x => x.put(e.request, c)); } return r; }).catch(() => caches.match(e.request).then(r => r || caches.match("./index.html"))));
});
