/* Copyright 2025 DodoDentist LLC */
const createRequest = require('@monorepool/agentfirst/request.js')
const getApiUrl = require('./getApiUrl.js')
const session = require('./session.js')
const { binaryName, envKeyName } = require('./constants.js')

// Dual-mode transport from @monorepool/agentfirst:
//
//   token mode — `Authorization: Token base64(jwt)` after a browser login,
//                with a single refresh against /api/refresh-access-token
//                on a 401
//   key mode   — `Authorization: Basic base64(<key secret>)` from the stored
//                secret or the DODODENTIST_API_KEY environment variable. The
//                secret is the WHOLE credential — dododentist/api's withKey.js
//                base64-decodes it and looks the key up by secret alone, so
//                there is no `key:secret` pair to assemble. API keys are
//                long-lived, so there is no refresh.
//
// Credential precedence lives in agentfirst's resolveCredential.js: stored
// session > stored key > environment key. Errors carry `.status` and `.body`,
// and end with the login hint (naming both `dododentist login` and
// DODODENTIST_API_KEY) when the caller never authenticated.
module.exports = createRequest({ getApiUrl, session, envKeyName, binaryName })
