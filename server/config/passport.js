const passport = require('passport');  // Passport 모듈을 임포트
const GoogleStrategy = require('passport-google-oauth20').Strategy;  // Google OAuth 전략 임포트
const KakaoStrategy = require('passport-kakao').Strategy;  // Kakao OAuth 전략 임포트
const User = require('../models/User');  // User 모델을 임포트

// ===============================================
// Google OAuth 설정
// ===============================================
if (
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id.apps.googleusercontent.com'
) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,  // Google OAuth 클라이언트 ID
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,  // Google OAuth 클라이언트 시크릿
        callbackURL: process.env.GOOGLE_CALLBACK_URL,  // Google OAuth 콜백 URL
        prompt: 'select_account',  // Google 계정 선택을 강제
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const userEmail = profile.emails?.[0]?.value;  // 사용자 이메일 추출

          // 이메일이 없는 경우 처리
          if (!userEmail) {
            return done(new Error('Google에서 이메일 정보를 받지 못했습니다.'), null);
          }

          // 기존에 사용자가 있는지 확인
          let user = await User.findOne({ email: userEmail });

          if (user) {
            // 기존 사용자인 경우
            if (user.oauthProvider === 'local' && !user.oauthId) {
              // 로컬 계정에 Google 계정 연결
              user.oauthId = profile.id;
              user.oauthProvider = 'google';
              await user.save();
              console.log(`✅ 기존 로컬 계정(${userEmail})에 Google 연동 정보 추가 완료`);
            } else if (user.oauthProvider !== 'google' && user.oauthId) {
              // 이미 다른 OAuth 계정으로 연결된 경우
              console.log(`⚠️ ${user.oauthProvider} 계정으로 이미 연동된 사용자입니다: ${userEmail}`);
            }
            return done(null, user);  // 사용자 정보 반환
          } else {
            // 신규 Google 사용자 자동 가입
            user = await User.create({
              oauthId: profile.id,  // Google OAuth ID
              email: userEmail,  // 이메일
              name: profile.displayName,  // 사용자 이름
              oauthProvider: 'google',  // OAuth 제공자
              profileImage: profile.photos?.[0]?.value,  // 프로필 이미지
              privacyConsent: true,  // 개인정보 동의
              termsConsent: true,  // 이용약관 동의
              consentDate: new Date(),  // 동의 일자
            });
            console.log(`✨ 신규 Google 사용자 생성: ${userEmail}`);
            return done(null, user);  // 신규 사용자 반환
          }
        } catch (error) {
          console.error('❌ Google Strategy 처리 중 오류:', error.message);
          return done(error, null);  // 오류 발생 시 처리
        }
      }
    )
  );
  console.log('✅ Google OAuth 활성화됨');
} else {
  console.log('⚠️ Google OAuth 비활성화 (환경변수 미설정)');
}

// ===============================================
// Kakao OAuth 설정
// ===============================================
if (process.env.KAKAO_CLIENT_ID) {
  passport.use(
    new KakaoStrategy(
      {
        clientID: process.env.KAKAO_CLIENT_ID,  // Kakao OAuth 클라이언트 ID
        callbackURL: process.env.KAKAO_CALLBACK_URL,  // Kakao OAuth 콜백 URL
        prompt: 'select_account',  // Kakao 계정 선택을 강제
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log('🟡 Kakao OAuth 프로필 수신:', profile.id, profile.username);

          // 카카오 프로필 정보 구조 분해
          const kakaoAccount = profile._json?.kakao_account || {};
          const kakaoProfile = kakaoAccount.profile || {};

          // 카카오 ID, 이름, 프로필 이미지 추출
          const kakaoId = profile.id;
          const name = kakaoProfile.nickname || profile.displayName || 'Kakao User';
          const profileImage = kakaoProfile.profile_image_url || null;

          // 이메일이 없거나 null/빈문자열이면 임시 이메일 생성
          let email = kakaoAccount.email;
          if (!email || email === 'null' || email === undefined || email.trim() === '') {
            email = `kakao_${kakaoId}@kakao.temp`;  // 임시 이메일 생성
          }

          // DB에서 사용자 조회 (oauthId + provider 기준)
          let user = await User.findOne({ oauthId: kakaoId, oauthProvider: 'kakao' });

          if (!user) {
            // 신규 Kakao 사용자 생성
            console.log(`✨ 신규 Kakao 계정 사용자 생성: ID ${kakaoId}`);

            user = await User.create({
              oauthId: kakaoId,
              email,
              name,
              oauthProvider: 'kakao',
              profileImage,
              privacyConsent: true,
              termsConsent: true,
              consentDate: new Date(),
            });
          } else {
            console.log(`✅ 기존 Kakao 사용자 로그인: ${user.name}`);
          }

          console.log(`✅ 로그인 성공: ${user.name} (${user._id})`);
          return done(null, user);  // 로그인 성공한 사용자 반환
        } catch (error) {
          console.error('❌ Kakao Strategy 처리 중 오류:', error.message);
          return done(error, null);  // 오류 발생 시 처리
        }
      }
    )
  );
  console.log('✅ Kakao OAuth 활성화됨');
} else {
  console.log('⚠️ Kakao OAuth 비활성화 (환경변수 미설정)');
}


// ===============================================
// 세션 직렬화 / 역직렬화
// ===============================================
// 사용자를 세션에 직렬화하는 함수
passport.serializeUser((user, done) => {
  done(null, user.id);  // 사용자 ID만 직렬화하여 세션에 저장
});

// 세션에서 사용자 데이터를 역직렬화하는 함수
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);  // 사용자 ID로 DB에서 사용자 조회
    done(null, user);  // 사용자 정보 반환
  } catch (error) {
    done(error, null);  // 오류가 발생하면 처리
  }
});

// passport 객체를 외부에서 사용하도록 내보냄
module.exports = passport;
