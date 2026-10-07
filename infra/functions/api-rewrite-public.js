// CloudFront Function（viewer-request）：公开访问模式（-c publicAccess=true）下的 /api/*，只去掉 /api 前缀，不校验访问密码。
function handler(event) {
  var request = event.request;
  request.uri = request.uri.replace(/^\/api/, '') || '/';
  return request;
}
