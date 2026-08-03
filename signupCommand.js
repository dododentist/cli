/* Copyright 2025 DodoDentist LLC */
const signupCommand = require('@monorepool/agentfirst/signupCommand.js')
const getApiUrl = require('./getApiUrl.js')
const session = require('./session.js')
const { binaryName, appUrl } = require('./constants.js')

// The step that used to need a person. `login` assumes the account already
// exists; an agent pointed at dododentist.com for the first time has nothing
// to log into, and the browser flow it fell back to blocked with nobody there
// to complete it.
//
//   dododentist signup --email dentist@example.com --json
//
// drives the same public POST /api/signup the web signup form posts to — which
// also seeds the organization's first clinic — then stores the session in the
// same ~/.dododentist/ the browser login writes, so every other command works
// immediately afterwards.
module.exports = () =>
  signupCommand({ binaryName, getApiUrl, appUrl, session })
