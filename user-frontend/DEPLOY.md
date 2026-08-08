# Deploying the viewer to Vercel

The viewer is a static-first Next.js app that talks to one API. Vercel's free
tier covers it, and there is nothing to configure beyond the root directory and
a single environment variable.

---

## 1. Import the project

New Project → import the repository.

**Set Root Directory to `user-frontend`.** This is the one setting that is not
optional. The repository is a monorepo — `frontend/`, `admin-backend/`,
`ffmpeg-service/` and `user-backend/` all sit alongside — and Vercel defaults to
the repository root, where there is no Next.js app. Left unchanged, the build
fails with "No Next.js version detected".

Everything else is detected: framework Next.js, build `next build`, install
`npm install`, output `.next`.

---

## 2. Set the environment variable

Project Settings → Environment Variables:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | Your Lambda Function URL |

Add it for **Production, Preview and Development**, or preview deployments will
silently fall back to the bundled sample catalogue and look like they work.

Either shape is accepted:

```
https://<id>.lambda-url.<region>.on.aws
https://<id>.lambda-url.<region>.on.aws/api/v1
```

The client appends `/api/v1` when it is missing. That normalisation exists
because a Function URL ends at the host, so pasting it verbatim previously
produced requests to `/contents` instead of `/api/v1/contents` — every one a
404, on a deployment that otherwise looked correct.

> `NEXT_PUBLIC_` variables are **inlined into the browser bundle at build time**.
> Changing this value requires a redeploy, not just a restart, and nothing
> secret may ever be put behind that prefix.

---

## 3. Let the API accept the new origin

Once Vercel gives you a domain, add it to the Lambda:

```bash
aws lambda update-function-configuration --function-name cartoonflix-user-api --region ap-south-1 --environment "Variables={MONGO_URI=...,JWT_SECRET=...,ALLOWED_ORIGINS=https://your-app.vercel.app}"
```

`update-function-configuration` **replaces the whole environment map**, so pass
every variable, not just the one being changed.

While `ALLOWED_ORIGINS` is `*` the site works, but browsers refuse to send
credentialed requests to a wildcard origin — set the real domain before relying
on anything beyond anonymous browsing.

Preview deployments get their own generated domains. Either add them as needed
or leave `*` until the production domain is settled.

---

## 4. Check it

- `/` — billboard and rails, populated from the API rather than the sample file.
  If the titles look plausible but never change, the API URL is wrong and you
  are seeing `public/streamingContents.json`.
- `/title/<id>` — cast, credits, likes and reviews all require the API.
- `/watch/<id>` — playback. HLS and subtitles come from CloudFront, so this also
  proves the CDN's CORS is right.
- Sign up, then reload — the session should survive, which proves both the
  token round-trip and that CORS permits the `Authorization` header.

Verified locally against the deployed Lambda before writing this: 24 titles,
rails built from real genre data, no console errors.

---

## Notes

- **Artwork uses plain `<img>`, not `next/image`.** CloudFront already serves
  correctly sized files, and Vercel's optimizer bills per transform against a
  free-tier quota. There is no `remotePatterns` config to maintain as a result.
- **Security headers** are set in `next.config.mjs`: `nosniff`, `DENY` framing,
  `frame-ancestors 'none'`, and a strict referrer policy. `Permissions-Policy`
  deliberately does **not** deny fullscreen or picture-in-picture — the player
  needs both.
- **Node is pinned to >=20** via `engines`.
- The `/watch` route is the heavy one (~223 kB) because hls.js is bundled rather
  than fetched from a CDN at runtime. That is deliberate: playback should not
  depend on a third party being reachable.
