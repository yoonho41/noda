const jwt = require("jsonwebtoken");  // JWT를 생성하고 검증하는 라이브러리
const User = require("../models/User");  // User 모델을 임포트
const Log = require("../models/Log");  // ✅ 추가!

// 1. 토큰 생성 함수
const generateToken = (user) => {
    // JWT 토큰을 생성. 토큰에는 사용자 ID와 역할(role)을 포함.
    return jwt.sign(
        { userId: user._id, role: user.role },  // payload로 사용자 ID와 역할 포함
        process.env.JWT_SECRET,  // 비밀 키 (환경 변수로 설정)
        { expiresIn: "7d" }  // 토큰 만료 시간: 7일
    );
};

// 2. 일반 회원가입
const register = async (req, res) => {
    try {
        const { email, password, name, role, isConsentChecked, privacyConsent, termsConsent } = req.body;
        const finalPrivacyConsent = isConsentChecked || privacyConsent;
        const finalTermsConsent = isConsentChecked || termsConsent;

        if (!finalPrivacyConsent || !finalTermsConsent) {
            return res.status(400).json({ success: false, message: "개인정보 처리방침 및 이용약관에 동의해주세요." });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "이미 가입된 이메일입니다." });
        }

        const newUser = new User({
            email,
            password,
            name,
            role: role || "user",
            oauthProvider: "local",
            privacyConsent: finalPrivacyConsent,
            termsConsent: finalTermsConsent,
            consentDate: new Date(),
        });

        await newUser.save();

        // ✅ 회원가입 로그 기록
        try {
            await Log.create({
                action: 'USER_CREATE',
                user: newUser._id,
                message: `${newUser.name}님이 회원가입했습니다. (권한: ${newUser.role})`,
                details: {
                    email: newUser.email,
                    role: newUser.role,
                },
                ipAddress: req.ip || req.socket.remoteAddress,
                userAgent: req.get('user-agent'),
            });
        } catch (logError) {
            console.error('❌ 회원가입 로그 기록 실패:', logError);
        }
        const token = generateToken(newUser);
        res.status(201).json({
            success: true,
            message: "회원가입 성공",
            data: { token, user: newUser, redirectUrl: "/template/dashboard" },
        });
    } catch (error) {
        console.error("회원가입 오류:", error);
        res.status(500).json({ success: false, message: "서버 오류가 발생했습니다." });
    }
};

// 3. 일반 로그인
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(401).json({ success: false, message: "등록되지 않은 이메일입니다." });
        }
        // ✅ 비활성화 계정 체크
        if (!user.isActive) {
            return res.status(403).json({ 
                success: false, 
                message: "비활성화된 계정입니다. 관리자에게 문의하세요." 
            });
        }
        if (!user.password) {
            return res.status(400).json({ success: false, message: "이 계정은 소셜 로그인 전용입니다." });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "비밀번호가 올바르지 않습니다." });
        }
        const userWithLatestRole = await User.findById(user._id)
            .select("-password")
            .populate("department", "departmentName");
        if (!userWithLatestRole) {
            return res.status(404).json({ success: false, message: "최신 사용자 정보를 찾을 수 없습니다." });
        }
        const token = generateToken(userWithLatestRole);

        // ✅ 로그인 로그 기록
        try {
            await Log.create({
                action: 'LOGIN',
                user: userWithLatestRole._id,
                message: `${userWithLatestRole.name}님이 로그인했습니다.`,
                ipAddress: req.ip || req.socket.remoteAddress,
                userAgent: req.get('user-agent'),
            });
        } catch (logError) {
            console.error('❌ 로그인 로그 기록 실패:', logError);
        }
        res.status(200).json({
            success: true,
            message: "로그인 성공",
            data: {
                token,
                user: userWithLatestRole.toJSON(),
                redirectUrl:
                    userWithLatestRole.role === "admin"
                        ? "/admin/dashboard"
                        : userWithLatestRole.role === "manager"
                        ? "/manager/dashboard"
                        : "/template/dashboard",
            },
        });
    } catch (error) {
        console.error("로그인 오류:", error);
        res.status(500).json({ success: false, message: "서버 오류가 발생했습니다." });
    }
};

// 4. ✅ 구글 / 카카오 OAuth 콜백
const oauthCallback = async (req, res) => {
    try {
        const user = req.user;
        
        console.log('✅ OAuth 콜백 성공');
        console.log('🔍 사용자 정보:', { email: user.email, role: user.role });
        
        const userWithLatestRole = await User.findById(user._id)
            .select("-password")
            .populate("department", "departmentName");
        if (!userWithLatestRole) {
            console.error('❌ 사용자 정보를 찾을 수 없습니다.');
            return res.redirect("http://localhost:3000/login?error=user_not_found");
        }
        console.log('🔍 최신 사용자 역할:', userWithLatestRole.role);
        const token = generateToken(userWithLatestRole);
        // ✅ OAuth 로그인 로그 기록
        try {
            await Log.create({
                action: 'LOGIN',
                user: userWithLatestRole._id,
                message: `${userWithLatestRole.name}님이 OAuth로 로그인했습니다.`,
                ipAddress: req.ip || req.socket.remoteAddress,
                userAgent: req.get('user-agent'),
            });
        } catch (logError) {
            console.error('❌ OAuth 로그인 로그 기록 실패:', logError);
        }
        const redirectUrl = `http://localhost:3000/auth/callback?token=${token}`;
        console.log("✅ OAuth 콜백 완료, 리다이렉트:", redirectUrl);
        res.redirect(redirectUrl);
    } catch (error) {
        console.error("❌ OAuth 콜백 오류:", error);
        res.redirect("http://localhost:3000/login?error=oauth_failed");
    }
};

// 5. 현재 로그인된 사용자 정보
const getCurrentUser = async (req, res) => {
    try {
        console.log('getCurrentUser 호출됨');
        console.log('req.user:', req.user ? req.user.email : 'undefined');

        const user = await User.findById(req.user._id)
            .select("-password")
            .populate('department', 'departmentName');

        if (!user) { 
            return res.status(404).json({ success: false, message: "사용자를 찾을 수 없습니다." }); 
        }

        console.log('사용자 조회 성공:', user.email);

        res.status(200).json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                profileImage: user.profileImage,
                isActive: user.isActive,
            },
        });
    } catch (error) {
        console.error("getCurrentUser 오류:", error);
        res.status(500).json({ success: false, message: "서버 오류가 발생했습니다." });
    }
};

// 6. 로그아웃
const logout = async (req, res) => {  // ✅ async 추가
    try {
        // ✅ 로그아웃 로그 기록 (세션 삭제 전에!)
        if (req.user) {
            try {
                await Log.create({
                    action: 'LOGOUT',
                    user: req.user._id,
                    message: `${req.user.name}님이 로그아웃했습니다.`,
                    ipAddress: req.ip || req.socket.remoteAddress,
                    userAgent: req.get('user-agent'),
                });
            } catch (logError) {
                console.error('❌ 로그아웃 로그 기록 실패:', logError);
            }
        }
        req.logout(() => {
            req.session.destroy(() => {
                res.clearCookie("connect.sid");
                console.log("세션 및 쿠키 정리 완료");
                res.status(200).json({ success: true, message: "로그아웃 성공" });
            });
        });
    } catch (error) {
        console.error("로그아웃 오류:", error);
        res.status(500).json({ success: false, message: "로그아웃 처리 중 오류가 발생했습니다." });
    }
};

module.exports = {
    register,
    login,
    oauthCallback,  // ✅ 수정 완료된 콜백
    getCurrentUser,
    logout,
};
