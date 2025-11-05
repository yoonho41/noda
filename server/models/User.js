const mongoose = require('mongoose');  // Mongoose 모듈을 임포트
const bcrypt = require('bcrypt');  // bcrypt 모듈: 비밀번호 해싱 및 비교에 사용됨

// --- 1. 스키마 정의 ---
// 사용자 데이터에 대한 스키마 정의
const userSchema = new mongoose.Schema({
    // 사용자 이메일 설정
    email: {
        type: String,
        required: false,  // 이메일은 필수는 아니며, OAuth 사용자는 이메일을 가지지 않음
        unique: true,  // 이메일은 고유해야 함
        lowercase: true,  // 이메일을 소문자로 자동 변환
        trim: true  // 앞뒤 공백 제거
    },
    // 사용자 이름
    name: {
        type: String,
        required: true    // 필수 필드
    },
    // 비밀번호 (로컬 로그인용)
    password: {
        type: String,
        required: false    // OAuth 사용자는 비밀번호가 없으므로 필수가 아님
    },
    // OAuth 제공자 ('local'은 일반 회원가입)
    oauthProvider: {
        type: String,
        enum: ['local', 'google', 'kakao'], // 허용되는 값 목록
        default: 'local'  // 기본 값은 'local'
    },
    // OAuth 고유 ID (제공자별로 다름)
    oauthId: {
        type: String,
        required: function() {
            return this.oauthProvider !== 'local';  // 'local' 계정이 아닐 경우 oauthId는 필수
        },
        unique: true, 
        sparse: true  // 중복 허용
    },
    // 사용자 권한/역할
    role: {
        type: String,
        enum: ['admin', 'manager', 'user'], // 허용되는 값 목록
    },
    // 소속 부서 (Department 모델 참조)
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department', // 참조할 모델 이름
        required: false  // 부서 필드는 필수가 아님
    },
    // 프로필 이미지 URL
    profileImage: {
        type: String,
        default: null  // 기본값은 null
    },
    // 계정 활성화 상태
    isActive: {
        type: Boolean,
        default: true  // 기본값은 true (계정 활성화)
    },
    // 개인정보 동의 필드
    privacyConsent: {
        type: Boolean,
        required: true,  // 필수 필드
        default: false  // 기본값은 false
    },
    termsConsent: {
        type: Boolean,
        required: true,  // 필수 필드
        default: false  // 기본값은 false
    },
    consentDate: {
        type: Date,
        default: null  // 동의 날짜 기본값은 null
    }
}, {
    // 스키마 옵션
    timestamps: true // createdAt, updatedAt 필드를 자동으로 생성 및 관리
});

// --- 2. 미들웨어 (저장 전 실행) ---
// 비밀번호가 수정되었을 때 비밀번호를 해싱하는 미들웨어
userSchema.pre('save', async function(next) {
    // 비밀번호가 수정되지 않았거나, 비밀번호 필드가 아예 없으면 (OAuth 사용자) 다음 단계로 이동
    if (!this.isModified('password') || !this.password) {
        // OAuth 사용자가 신규 가입 시 필수 동의 필드를 자동으로 'true'로 설정
        if (this.isNew && this.oauthProvider !== 'local') {
            this.privacyConsent = true;
            this.termsConsent = true;
            if (!this.consentDate) {
                this.consentDate = new Date();  // 동의 날짜 설정
            }
        }

        // 신규 계정은 여기서 'user'로 설정
        if (this.isNew && !this.role) {
            this.role = 'user';  // 기본 역할을 'user'로 설정
        }

        return next();
    }

    // 비밀번호가 새로 설정되거나 수정되었을 경우 해싱 진행
    try {
        const salt = await bcrypt.genSalt(10);  // 솔트(Salt) 생성 (보안 강화)
        this.password = await bcrypt.hash(this.password, salt);  // 비밀번호를 해싱하여 덮어씀

        // 신규 로컬 계정 생성 시 role이 설정되지 않았다면 'user'로 설정
        if (this.isNew && !this.role) {
            this.role = 'user';  // 기본 역할을 'user'로 설정
        }

        next();  // 미들웨어에서 비밀번호 해싱이 완료되면 다음 단계로 진행
    } catch (error) {
        next(error);  // 에러 발생 시 처리
    }
});

// --- 3. 인스턴스 메서드 ---

// 로그인 시 입력된 비밀번호와 저장된 해시 비밀번호를 비교하는 메서드
userSchema.methods.comparePassword = async function(candidatePassword) {
    // bcrypt.compare()를 사용하여 비교 (저장된 해시값과 솔트 처리까지 자동 수행)
    return await bcrypt.compare(candidatePassword, this.password);  // 비밀번호 비교
};

// JSON 변환 시 특정 필드를 제외하는 메서드 (response로 보낼 때 사용)
userSchema.methods.toJSON = function() {
    const obj = this.toObject();  // Mongoose Document를 일반 JavaScript 객체로 변환
    delete obj.password;  // 객체에서 비밀번호 필드를 제거 (보안)
    return obj;  // 비밀번호를 제외한 나머지 필드 반환
};

// --- 4. 모델 내보내기 ---
// User 모델 내보내기
module.exports = mongoose.model('User', userSchema);  // User 스키마를 기반으로 'User' 모델 생성 및 내보내기
