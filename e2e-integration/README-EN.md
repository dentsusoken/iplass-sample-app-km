lang: [English](./README-EN.md) | [日本語](./README.md)

# Integration Test Setup

## Playwright Configuration

- Config file: `playwright.integration.config.ts`
- baseURL: generated from `e2e-integration/e2e.config.json`
- Browser: Chromium only
- workers: 1 (serial execution)
- Timeout: 60 seconds per test, 15 seconds per action

## Helpers

### `helpers/login.ts`

Logs in by driving the iPLAss login form.
Default credentials: `testresponder` / `testresponder` (inquiry_responder role)

## Test Data Prerequisites

### Tag master (`km.tag.Tag`)

`tag-editing.integration.spec.ts` requires the following tags to exist:

| name |
|---|
| test1 |
| test2 |
| test3 |

### Metadata (Admin Console)

| Setting | Details |
|---|---|
| Binary WebAPI (GET) | Allowed for inquiry_responder |
| Entity WebAPI DELETE (`km.inquiry.Post`) | Allowed for inquiry_responder |
