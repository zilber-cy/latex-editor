const {
  acceptsJson,
} = require('../../infrastructure/RequestContentTypeDetection')

module.exports = {
  redirect,
}

// redirect the request via headers or JSON response depending on the request
// format
function redirect(req, res, redir) {
  if (acceptsJson(req)) {
    res.json({ redir })
  } else {
    res.redirect(redir)
  }
}
