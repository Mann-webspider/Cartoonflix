# CartoonFlix — product context

## What it is

A self-hosted streaming service for animated content. One operator (the owner)
ingests their own library on their own machine — transcoding each title into an
adaptive HLS ladder locally — then publishes the finished output to S3 and
CloudFront. Viewers browse and watch through a hosted web app.

It is deliberately not a marketplace, a social product, or a catalogue
aggregator. It is one person's library, served well.

## Unique mechanism

The expensive work happens on hardware the owner already pays for. Transcoding,
still extraction, and review all run locally; only finished segments and chosen
artwork ever reach the cloud. That is what keeps the running cost at roughly the
price of S3 storage instead of a always-on video pipeline.

## Audiences

**Viewer** — the person watching. Arrives on a phone or laptop, usually in the
evening, usually in low light, usually undecided. Success is starting something
good within a minute and picking up where they left off. Signed in, they get a
continue-watching rail, a saved list, and resume that follows them across
devices.

**Operator** — the person running it. Uses the local admin app to enter a
title's details, transcode the source, choose a poster from extracted stills,
and publish. Success is a predictable pipeline with visible progress and no
surprises on the bill.

## Surfaces

| Surface | Who | Runs |
|---|---|---|
| Viewer app (`user-frontend`) | Viewer | Hosted on Vercel |
| Viewer API (`user-backend`, Go) | Viewer | AWS Lambda behind API Gateway |
| Admin app (`frontend`) | Operator | Operator's machine |
| Admin API (`admin-backend`, Node) | Operator | Operator's machine |
| Ingest pipeline (`ffmpeg-service`) | Operator | Operator's machine |

## Content truth

- A title is a **movie** (one video) or a **series** (seasons of episodes).
- Every title carries: title, description, genres, tags, type, release date,
  poster, card thumbnail, and duration.
- Playback is HLS at 480p/720p/1080p, ~10s segments, delivered by CloudFront.
- Posters and stills come from frames the pipeline extracted from the source,
  chosen by the operator. There is no external artwork source.
- The catalogue is small and personal — tens of titles, not thousands. Layouts
  must not assume infinite scroll or a dense grid to hide behind.

## Accounts

Viewers sign up with a username, email, and password. Accounts exist for
personalisation only: continue watching, saved list, resume position. There is
no payment, no plan tier, no profile switching, and no social layer.

## Constraints

- Running cost must stay near S3-only pricing. No always-on compute.
- MongoDB Atlas free tier — keep write volume low.
- The viewer app is a static Next.js build talking to one Lambda API.
- HLS is served publicly through CloudFront (signed cookies are a later upgrade
  and need a custom domain).

## Brand commitments

**The viewer app commits to the streaming-category standard, played straight.**
This was chosen deliberately over three alternative visual worlds: viewers
arrive knowing how a streaming service works, and the familiar form is an
advantage here, not a failure of nerve. Build it at full fidelity — no irony,
no smuggled quirk, no half-measure toward something more unusual.

The craft bar is **Apple TV+ and Max**, fused:

- From Apple TV+ — generous spacing, restrained motion, large editorial
  artwork, light chrome, fewer titles per row. This suits a small personal
  catalogue, which cannot hide behind density.
- From Max — bold display typography, high-contrast dark ground, and a
  saturated colour used at page scale rather than sprinkled as an accent.

Dark ground is chosen from the use scene (evening, low ambient light, sofa or
bed), not from category habit.

No logo or wordmark is inherited; the previous viewer styling was a placeholder.

## Explicitly out of scope

Recommendations engines, ratings, reviews, comments on the viewer surface,
downloads, multiple profiles, and anything requiring a always-on server.
