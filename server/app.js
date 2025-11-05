// ===============================================
// 1. 기본 모듈
// ===============================================
require("dotenv").config();
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
const session = require("express-session");
const passport = require("./config/passport");
const fs = require("fs");

// ===============================================
// 2. 앱 생성
// ===============================================
const app = express();
const PORT = process.env.PORT || 5000;

// ===============================================
// 3. 미들웨어
// ===============================================
app.use(cors({
  origin: true, // 요청한 Origin을 자동으로 허용
  credentials: true,
  methods: ["GET", "POST", "PUT", 'PATCH',"DELETE", "OPTIONS"],
  // ✅ PATCH 추가!-25.11.01
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("uploads"));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "noda-secret",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// ===============================================
// 4. MongoDB 연결
// ===============================================
mongoose.set("strictQuery", false);
mongoose
  .connect(process.env.MONGO_URI || "mongodb://192.168.0.61:27017/nodaDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB 연결 성공!"))
  .catch((err) => console.error("❌ MongoDB 연결 실패:", err));

  require("./models/Log");
  require("./models/calSchma");
  require("./models/messageSchema");
  require("./models/reservationSchema");
  require("./models/ApprovalDocument");
  require("./models/Chat");
  require("./models/Department");
  require("./models/TeamProject");
  require("./models/Todo");
  require("./models/User");

// ===============================================
// 5. 라우터 통합 등록
// ===============================================
// 기존 app.js 라우터
app.use("/api/auth", require("./router/authRoutes"));
app.use("/api/dashboard", require("./router/dashboardRoutes"));
app.use("/api/users", require("./router/userRoutes"));
app.use("/api/todos", require("./router/todoRoutes"));
app.use("/api/departments", require("./router/departmentRoutes"));
app.use("/api/approvals", require("./router/approvalRoutes"));
app.use("/api/alerts", require("./router/alertsRouter"));
app.use("/api/ai", require("./router/aiRouter"));
app.use('/api/admin/logs', require('./router/logRoutes'));
app.use('/api/projects', require('./router/teamProjectRoutes'));



// 기존 server.js 라우터
require("./router/messageRouters")(app);
require("./router/messageFilesRouters")(app);
require("./router/reservationRouters")(app);
require("./router/calRouters")(app);

// ===============================================
// 6. 프론트엔드 빌드 파일 서빙 (배포 모드)
// ===============================================
if (process.env.NODE_ENV === "production") {
  const buildPath = path.join(__dirname, "../noda/build");
  if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(buildPath, "index.html"));
    });
  }
} else {
  app.get("/", (req, res) => res.send("✅ Noda 통합 서버 실행 중"));
}

// ===============================================
// 7. 서버 시작
// ===============================================
const server = http.createServer(app);
server.listen(PORT, () => {
  console.log(`🚀 통합 서버 실행 중: http://localhost:${PORT} (또는 http://192.168.0.56:${PORT})`);
});
