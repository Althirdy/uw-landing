# UrbanWatch Landing Docker Deploy

## 1) Start landing container

From this folder:

```bash
docker compose up -d
```

## 2) Confirm it is reachable on the server

```bash
curl -I http://localhost:8088/
curl -I http://localhost:8088/index.js
curl -I http://localhost:8088/index.css
```

## 3) Configure Cloudflare Dashboard (zero-config tunnel mode)

In Cloudflare Zero Trust:
- `Networks` -> `Tunnels` -> your tunnel -> `Public Hostname` -> `Add a public hostname`
- Hostname: `landing.yourdomain.com`
- Service Type: `HTTP`
- URL: `localhost:8088`

## 4) Validate public URL

```bash
curl -I https://landing.yourdomain.com/
curl -I https://landing.yourdomain.com/index.js
curl -I https://landing.yourdomain.com/index.css
```

`index.js` and `index.css` must return `200` and must not return HTML.
