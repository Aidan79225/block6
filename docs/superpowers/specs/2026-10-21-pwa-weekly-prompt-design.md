# PWA and the Weekly Prompt — Design Spec

**Date:** 2026-10-21
**Status:** Implemented (local reminder); server push is a follow-up
**Backlog item:** `docs/product-core.md` §九 #6 (PWA manifest + 提醒)

## Summary

Installable app, and a weekly reminder whose content is "這週有什麼不一樣嗎？"
— with a standing rhythm the week is already planned, so the only decision
left is what differs. It never says "come and plan".

## Decisions

| Topic | Decision |
|-------|----------|
| Install | `app/manifest.ts` (name, standalone, dark theme color, 192/512 and maskable icons drawn as the default week's 7×6 grid) and a minimal `public/sw.js`. The service worker caches nothing: without Supabase there is nothing useful to show offline. |
| In-app prompt | The first visit of each week shows "這週有什麼不一樣嗎？" above the grid until dismissed (remembered per week in localStorage). |
| System reminder | Opt-in from the prompt ("每週一提醒我"). With permission granted, a Monday 08:00 notification is shown through the service worker while the app is open in the background (an installed app counts), rescheduled each week. Clicking it brings the app forward. |
| Real push | Delivering the reminder while the app is closed needs Web Push: VAPID keys, stored subscriptions and a scheduled sender (e.g. a Vercel cron). Those need the owner's secrets and deploy settings, so they are recorded in `docs/tech-debt.md` rather than guessed at. |
