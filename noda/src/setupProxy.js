const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: true,      // why: 백엔드가 호스트 헤더 의존 시 문제 방지
      xfwd: true,              // why: 원본 IP 등 전달
      logLevel: 'warn',
    })
  );
};