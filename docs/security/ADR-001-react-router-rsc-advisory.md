# ADR-001: React Router RSC advisory acceptance

- Status: accepted for the focused MVP
- Advisory: `GHSA-qwww-vcr4-c8h2` (React Router RSC Mode CSRF bypass)
- Decision date: 2026-08-04

## Decision

Thee Studio will keep React Router 7.18.1 for this release. The advisory affects
the unstable React Server Components action-processing path. The application
uses Declarative Mode only: `BrowserRouter`, `Routes`, and `Route` render a
client-side Vite/React 18 application. It imports no RSC server APIs, exposes no
RSC action endpoint, and cannot execute the affected server-action path.

CI permits this one advisory while failing on any additional production
dependency advisory. A source test also fails if an unstable React Router RSC
import or API is introduced.

## Review trigger

Review and remove this exception before any adoption of React Server
Components, React Router Framework/Data Mode server actions, an RSC-capable
server runtime, or a router upgrade. Also review it when a fixed compatible
React Router 7 release becomes available or the advisory scope changes.
