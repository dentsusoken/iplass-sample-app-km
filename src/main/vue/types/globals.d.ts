/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
export {}
declare global {
  interface Window {
    lang: string
    tcPath: string
    staticContentPath: string
  }
  var lang: string
  var tcPath: string
  var staticContentPath: string
  var __INITIAL_AUTH__: {
    user: { oid: string; name: string }
    roles: string[]
  }
}
