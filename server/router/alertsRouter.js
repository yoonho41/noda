// router/alertsRouter.js
const express = require("express");
const router = express.Router();

// DB 연결 없이, 로그인된 userId 기준으로 "가짜 알림" 반환
router.get("/", (req, res) => {
  const userId = req.query.userId || "testUser";
  const today = new Date().toISOString().slice(0, 10);

  const dummyAlerts = [
    {
      type: "info",
      title: "AI 비서 환영 알림",
      lines: [`${userId}님, 오늘도 좋은 하루 되세요!`],
    },
    {
      type: "warning",
      title: "오늘 마감 업무",
      lines: [
        "보고서 제출 (D-day)",
        "팀 회의 준비 (D-1)",
      ],
    },
    {
      type: "danger",
      title: "지연된 업무",
      lines: [
        "고객 피드백 정리 (2일 지연)",
      ],
    },
  ];

  res.json({ date: today, alerts: dummyAlerts });
});

module.exports = router;
