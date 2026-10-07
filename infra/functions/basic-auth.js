// CloudFront Function（viewer-request）：开发环境访问密码。用户名任意，只校验密码。
var PASSWORD = '<ACCESS_PASSWORD>';

function authorized(request) {
  var h = request.headers.authorization;
  if (!h || h.value.indexOf('Basic ') !== 0) return false;
  var decoded = Buffer.from(h.value.slice(6), 'base64').toString('utf8');
  return decoded.slice(decoded.indexOf(':') + 1) === PASSWORD;
}

function deny() {
  return {
    statusCode: 401,
    statusDescription: 'Unauthorized',
    headers: { 'www-authenticate': { value: 'Basic realm="Private IM", charset="UTF-8"' } },
  };
}

function handler(event) {
  return authorized(event.request) ? event.request : deny();
}
