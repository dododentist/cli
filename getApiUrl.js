/* Copyright 2025 DodoDentist LLC */

// Production DodoDentist API. Override with DODODENTIST_API_URL when testing
// against a non-production deployment.
//
// Resolved here rather than through @dododentist/client on purpose: that
// package pulls in @monorepool/env, whose product roster is internal and has
// no business inside a published npm bundle.
export default function getApiUrl() {
  return process.env.DODODENTIST_API_URL || 'https://api.dododentist.com'
}
