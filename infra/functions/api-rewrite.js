// CloudFront Function（viewer-request）：/api/* 先校验访问密码，再去掉 /api 前缀回源业务服务端（与线上 nginx 的 location /api/ 一致）。
var PASSWORD = '<ACCESS_PASSWORD>';

function authorized(request) {
  var h = request.headers.authorization;
  if (!h || h.value.indexOf('Basic ') !== 0) return false;
  var decoded = Buffer.from(h.value.slice(6), 'base64').toString('utf8');
  return decoded.slice(decoded.indexOf(':') + 1) === PASSWORD;
}

function handler(event) {
  var request = event.request;
  if (!authorized(request)) {
    return { statusCode: 401, statusDescription: 'Unauthorized', headers: { 'www-authenticate': { value: 'Basic realm="Private IM", charset="UTF-8"' } } };
  }
  request.uri = request.uri.replace(/^\/api/, '') || '/';
  return request;
}
