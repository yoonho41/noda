const mongoose = require('mongoose');  // Mongoose 모듈을 임포트

// --- 1. 스키마 정의 ---
// 팀 프로젝트에 대한 데이터를 구조화한 스키마 정의
const teamProjectSchema = new mongoose.Schema({
    // 프로젝트의 이름 (필수)
    projectName: {
        type: String,
        required: true  // 필수 필드
    },
    
    // 프로젝트에 대한 상세 설명
    description: {
        type: String,
        default: ''  // 기본값은 빈 문자열
    },

    // 프로젝트가 속한 부서 (Department 모델 참조, 필수 아님)
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department', // 참조할 모델 이름 (Department 모델)
        required: false  // 필수가 아니므로 선택적
    },

    // 프로젝트를 생성한 사용자 (User 모델 참조, 필수)
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // 참조할 모델 이름 (User 모델)
        required: true  // 필수 필드 (프로젝트 생성자)
    },

    // 프로젝트의 현재 진행 상태
    status: {
        type: String,
        enum: ['planning', 'in_progress', 'completed', 'hold'], // 허용되는 값 목록
        default: 'planning'  // 기본값은 'planning'
    },

    // 프로젝트 시작일
    startDate: {
        type: Date,
        default: null  // 기본값은 null (시작일이 없을 경우)
    },

    // 프로젝트 예상 또는 실제 종료일
    endDate: {
        type: Date,
        default: null  // 기본값은 null (종료일이 없을 경우)
    },

    // 프로젝트 참여 멤버 목록 (하위 문서 배열)
    members: [{
        // 멤버로 참여하는 사용자 ID
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // 참조할 모델 이름 (User 모델)
            required: true  // 필수 필드 (프로젝트 멤버)
        },
        
        // 프로젝트 내 역할
        role: {
            type: String,
            enum: ['leader', 'member'], // 허용되는 역할
            default: 'member'  // 기본값은 'member' (일반 멤버)
        },
        
        // 프로젝트에 배정된 시각
        assignedAt: {
            type: Date,
            default: Date.now  // 기본값은 현재 시각
        }
    }],

    // 프로젝트 내의 세부 할 일/태스크 목록 (하위 문서 배열)
    tasks: [{
        taskName: String,  // 태스크 이름
        
        // 태스크 담당자 (User 모델 참조)
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'  // 참조할 모델 이름 (User 모델)
        },

        // 태스크의 진행 상태
        status: {
            type: String,
            enum: ['todo', 'in_progress', 'done'],  // 허용되는 상태값
            default: 'todo'  // 기본값은 'todo' (할 일 상태)
        },

        // 태스크의 마감 기한
        dueDate: Date  // 마감 기한 (선택 사항)
    }]
}, {
    // 스키마 옵션
    timestamps: true  // createdAt (생성 시각), updatedAt (마지막 업데이트 시각) 필드를 자동으로 생성하고 관리
});

// --- 2. 모델 내보내기 ---
// 'TeamProject'라는 이름으로 모델 생성 및 외부로 내보내기
module.exports = mongoose.model('TeamProject', teamProjectSchema);  // 'TeamProject' 모델을 mongoose 모델로 생성하여 내보냄
