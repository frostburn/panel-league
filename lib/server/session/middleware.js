/* eslint-env node */
const uuidV4 = require('uuid/v4');

function sessionCookie() {
  return (req, res, next) => {
    let sessionId = req.cookies.sessionId;
    if (!sessionId) {
      sessionId = uuidV4();
    }
    res.cookie('sessionId', sessionId, { httpOnly: false, maxAge: 30 * 24 * 60 * 60 * 1000 });
    next();
  };
}

module.exports = sessionCookie;
