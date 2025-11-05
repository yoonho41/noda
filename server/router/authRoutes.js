const express = require('express');
const passport = require('passport');
const router = express.Router();
const User = require('../models/User');

// 컨트롤러 불러오기
const {
  register,
  login,
  oauthCallback,
  getCurrentUser,
  logout,
} = require('../controllers/authController');

// 인증 미들웨어 불러오기
const { protect } = require('../middleware/authMiddleware');

// ===============================================
// ✅ 환경변수에서 프론트엔드 URL 가져오기
// ===============================================
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ===============================================
// 일반 회원가입 및 로그인 라우트
// ===============================================
router.post('/register', register);
router.post('/login', login);  // ✅ 하나만! authController.js에서 로그 기록


// ===============================================
// 카카오 OAuth 로그인
// ===============================================
router.get('/kakao', passport.authenticate('kakao'));
router.get(
  '/kakao/callback',
  passport.authenticate('kakao', {
    failureRedirect: `${FRONTEND_URL}/login`,
    session: false,
  }),
  oauthCallback  // ✅ authController.js에서 로그 기록
);


// ===============================================
// 구글 OAuth 로그인
// ===============================================
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
  })
);
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${FRONTEND_URL}/login`,
    session: false,
  }),
  oauthCallback  // ✅ authController.js에서 로그 기록
);


// ===============================================
// 현재 로그인된 사용자 정보 조회 (GET /api/auth/me)
// ===============================================
router.get('/me', protect, getCurrentUser);


// ===============================================
// 로그아웃 (POST /api/auth/logout)
// ===============================================
router.post('/logout', protect, logout);  // ✅ authController.js에서 로그 기록

module.exports = router;