const mongoose = require('mongoose');  // Mongoose 모듈을 임포트

// --- 1. 스키마 정의 ---
// 부서에 대한 데이터를 구조화한 스키마 정의
const departmentSchema = new mongoose.Schema({
    // 부서의 이름
    departmentName: {
        type: String,
        required: true,  // 필수 필드
        unique: true     // 부서 이름은 중복될 수 없음
    },
    
    // 부서에 대한 설명
    description: {
        type: String,
        default: ''  // 기본값은 빈 문자열
    },
    
    // 상위 부서 (계층 구조 설정용)
    parentDepartment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department', // 자기 자신(Department) 모델을 참조 (재귀적 관계)
        default: null      // 최상위 부서일 경우 null
    },
    
    // 부서장/관리자 (User 모델 참조)
    manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // 참조할 모델 이름 (User 모델)
        default: null  // 기본값은 null (부서장이 지정되지 않은 경우)
    },
    
    // 부서에 속한 멤버 목록 (User 모델 참조 배열)
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'  // 참조할 모델 이름 (User 모델)
    }],
    
    // 부서의 활성화 상태
    isActive: {
        type: Boolean,
        default: true  // 기본값은 true (부서 활성화)
    }
}, {
    // 스키마 옵션
    timestamps: true  // createdAt (생성 시각), updatedAt (마지막 업데이트 시각) 필드를 자동으로 생성하고 관리
});

// --- 2. 모델 내보내기 ---
// 'Department'라는 이름으로 모델 생성 및 외부로 내보내기
module.exports = mongoose.model('Department', departmentSchema);  // 'Department' 모델을 mongoose 모델로 생성하여 내보냄
