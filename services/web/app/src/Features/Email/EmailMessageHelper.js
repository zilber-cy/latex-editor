const sanitizeHtml = require('sanitize-html')
const sanitizeOptions = {
  html: {
    allowedTags: ['span', 'b', 'br', 'i'],
    allowedAttributes: {
      span: ['style', 'class'],
    },
  },
  plainText: {
    allowedTags: [],
    allowedAttributes: {},
  },
}

function cleanHTML(text, isPlainText) {
  if (!isPlainText) return sanitizeHtml(text, sanitizeOptions.html)
  return sanitizeHtml(text, sanitizeOptions.plainText)
}

function displayLink(text, url, isPlainText) {
  return isPlainText ? `${text} (${url})` : `<a href="${url}">${text}</a>`
}

module.exports = {
  cleanHTML,
  displayLink,
}
