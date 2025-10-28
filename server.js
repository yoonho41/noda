// // project/server.js
// const express = require('express');
// const http = require('http');
// const mongoose = require('mongoose');
// const path = require('path');
// const fs = require('fs');
// const { createProxyMiddleware } = require('http-proxy-middleware'); // why: dev에서 8080→3000 프록시

// mongoose.set('strictQuery', false);
// require('./models/taxiSchema');

// const app = express();
// const router = express.Router();

// app.set('port', process.env.PORT || 8080);
// app.use(express.static('uploads'));
// app.use(express.json());

// // DB 연결
// mongoose.connect('mongodb://192.168.0.61:27017/nodaDB');
// console.log('데이터베이스 연결');

// // 디버그 로그(경로 확인)
// app.use((req, _res, next) => {
//   console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
//   next();
// });

// // 헬스체크
// const healthHandler = (_req, res) => res.json({ ok: true, ts: Date.now() });
// app.get('/health', healthHandler);
// app.get('/api/health', healthHandler);

// // 라우터 등록(기존 유지)
// require('./routers/taxiRouters')(app);
// require('./routers/imageRouters')(app, router);



// // 서버 시작
// http.createServer(app).listen(app.get('port'), () => {
//   console.log('서버를 시작했습니다 : ' + app.get('port'));
// });




// C:\VSCode\react\project\server.js  (보수 패치: 동작 동일, 가시성↑)
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

mongoose.set('strictQuery', false);
require('./models/taxiSchema');
require('./models/messageSchema');


const app = express();
const router = express.Router();

const PORT = Number(process.env.PORT || 8080);
app.set('port', PORT);

app.use(express.static('uploads'));
app.use(express.json());

// 요청 로깅
// app.use((req, _res, next) => {
//   console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
//   next();
// });

// 헬스체크(둘 다 허용)
const healthHandler = (_req, res) => res.json({ ok: true, ts: Date.now() });
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// 라우터(기존 유지)
require('./routers/taxiRouters')(app);
require('./routers/messageRouters')(app);
require('./routers/imageRouters')(app, router);
require('./routers/messageFilesRouters')(app, router);



// 운영에서만 정적 서빙(있을 때만)
const isProd = process.env.NODE_ENV === 'production';
const clientRoot = path.join(__dirname, 'noda');
const builtDir = ['build', 'dist']
  .map((d) => path.join(clientRoot, d))
  .find((p) => fs.existsSync(path.join(p, 'index.html')));
if (isProd && builtDir) {
  console.log(`[web] Serving static UI from: ${builtDir}`);
  app.use(express.static(builtDir));
  app.get('*', (_req, res) => res.sendFile(path.join(builtDir, 'index.html')));
}

// 서버 시작(가시성/안정성 보강)
const server = http.createServer(app);
server.requestTimeout = 60000;
server.headersTimeout = 65000;
if (typeof server.setTimeout === 'function') server.setTimeout(65000);

server.on('listening', () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
server.on('error', (err) => {
  console.error('SERVER ERROR:', err.code || err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. 다른 프로세스가 점유 중입니다.`);
  }
  process.exit(1);
});

server.listen(PORT);

// Mongo 연결(서버와 독립; 실패해도 서버는 계속 뜸)
mongoose
  .connect('mongodb://192.168.0.61:27017/nodaDB', {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 20000,
  })
  .then(() => console.log('데이터베이스 연결'))
  .catch((e) => console.error('Mongo 연결 실패:', e.message));

// 전역 에러 가드
process.on('unhandledRejection', (e) => console.error('unhandledRejection', e));
process.on('uncaughtException', (e) => console.error('uncaughtException', e));
