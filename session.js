/* Copyright 2025 DodoDentist LLC */
import createSessionStore from '@monorepool/agentfirst/sessionStore.js'

// ~/.dododentist/ holds both credentials a session can carry: the
// accessToken + refreshToken pair a browser login stores, and an API key
// secret pasted through `login --with-key`. The directory is only created on
// first use — `dododentist --help` leaves nothing behind.
export default createSessionStore({ productDirName: 'dododentist' })
