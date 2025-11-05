const jwt = require('jsonwebtoken');  // JSON Web Token을 다루는 라이브러리 임포트
const User = require('../models/User');  // 사용자 모델을 임포트

// 1. 기본 보호 미들웨어 (모든 인증 라우트에 필요)
// 인증된 사용자인지 확인하는 미들웨어
const protect = async (req, res, next) => {
    let token;

    // Authorization 헤더에서 Bearer 토큰 확인
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Bearer <token> 형식에서 토큰 추출
            token = req.headers.authorization.split(' ')[1];

            // 토큰을 검증하고 사용자 ID 디코드
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 디코딩된 사용자 ID로 사용자 데이터 조회 (비밀번호는 제외)
            req.user = await User.findById(decoded.userId).select('-password');

            // 사용자가 존재하지 않는 경우
            if (!req.user) {
                return res.status(401).json({ success: false, message: "유효하지 않은 토큰입니다. (사용자 없음)" });
            }

            // 인증이 성공하면 다음 미들웨어로 진행
            next();
        } catch (error) {
            console.error("토큰 인증 오류:", error);
            // 토큰이 유효하지 않거나 만료된 경우
            return res.status(401).json({ success: false, message: "유효하지 않거나 만료된 토큰입니다." });
        }
    }

    // Authorization 헤더에 토큰이 없는 경우
    if (!token) {
        return res.status(401).json({ success: false, message: "인증되지 않았습니다. 토큰이 없습니다." });
    }
};

// 2. 관리자 전용 미들웨어
// 관리자 역할을 가진 사용자만 접근할 수 있도록 제한
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {  // 사용자가 admin 역할을 가지고 있는지 확인
        next();  // 관리자라면 요청을 다음 단계로 넘김
    } else {
        res.status(403).json({ success: false, message: '권한이 없습니다. 관리자만 접근 가능합니다.' });  // 권한 없음
    }
};

// 3. 매니저 또는 관리자 미들웨어
// 매니저나 관리자 역할을 가진 사용자만 접근할 수 있도록 제한
const managerOrAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'manager' || req.user.role === 'admin')) {  // 사용자가 manager 또는 admin인지 확인
        next();  // 해당 역할이라면 요청을 다음 단계로 넘김
    } else {
        res.status(403).json({ success: false, message: '권한이 없습니다. 관리자 또는 매니저만 접근 가능합니다.' });  // 권한 없음
    }
};

// 4. 소유자 또는 관리자 미들웨어 (userId 파라미터 필요)
// 사용자의 정보는 본인 또는 관리자가 접근할 수 있도록 제한
const isOwnerOrAdmin = (req, res, next) => {
    const targetUserId = req.params.userId;  // 요청된 userId 파라미터를 가져옴
    
    // 사용자가 관리자이거나, 요청된 userId가 현재 로그인된 사용자의 ID와 같으면 허용
    if (req.user && (req.user.role === 'admin' || req.user._id.toString() === targetUserId)) {
        next();  // 조건을 만족하면 요청을 다음 단계로 넘김
    } else {
        res.status(403).json({ success: false, message: '권한이 없습니다. 본인의 정보 또는 관리자만 접근 가능합니다.' });  // 권한 없음
    }
};

// 모듈 내보내기 (userRoutes.js에서 필요한 모든 함수를 내보냄)
module.exports = { 
    protect,  // 기본 보호 미들웨어
    adminOnly,  // 관리자 전용 미들웨어
    managerOrAdmin,  // 매니저 또는 관리자 전용 미들웨어
    isOwnerOrAdmin  // 소유자 또는 관리자 전용 미들웨어
};
