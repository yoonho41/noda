const mongoose = require('mongoose');  // Mongoose 모듈을 임포트

// --- 1. 스키마 정의 ---
// 할 일에 대한 데이터를 구조화한 스키마 정의
const todoSchema = new mongoose.Schema({
    
    // 지원님 추가: 사용자 ID
    userId: { 
        type: String, 
        required: true  // 필수 필드 (할 일과 관련된 사용자 ID)
    },

    // 할 일의 제목
    title: {
        type: String,
        required: true,  // 필수 필드
        trim: true        // 저장 전에 양 끝의 공백을 제거
    },
    
    // 할 일에 대한 상세 설명
    description: {
        type: String,
        default: ''       // 기본값은 빈 문자열
    },
    
    // 이 할 일을 소유한 사용자 (참조 관계)
    user: {
        type: mongoose.Schema.Types.ObjectId, // ObjectId 타입 (다른 문서 참조용)
        ref: 'User',                          // 참조하는 모델 이름 (User 모델)
        required: true                        // 할 일은 반드시 사용자에게 속해야 함
    },
    
    // 할 일의 현재 진행 상태
    status: {
        type: String,
        enum: ['todo', 'in_progress', 'done'], // 허용되는 값 목록 (할 일 상태)
        default: 'todo'  // 기본값은 'todo' 상태
    },
    
    // 할 일의 중요도
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'], // 허용되는 값 목록 (우선순위)
        default: 'medium'  // 기본값은 'medium' (중간 우선순위)
    },
    
    // 할 일의 마감 기한
    dueDate: {
        type: Date,
        default: null // 기본값은 null (마감 기한이 없을 경우)
    },
    
    // 할 일에 붙일 수 있는 태그 목록 (문자열 배열)
    tags: [{
        type: String,
        trim: true  // 태그를 저장할 때 앞뒤 공백을 제거
    }],
    
    // 할 일의 완료 여부 (Boolean 플래그)
    isCompleted: {
        type: Boolean,
        default: false  // 기본값은 false (완료되지 않음)
    },
    
    // 할 일이 완료된 시점의 타임스탬프
    completedAt: {
        type: Date,
        default: null // 기본값은 null (완료되지 않은 경우)
    }
}, {
    // 스키마 옵션
    timestamps: true // createdAt, updatedAt 필드를 자동으로 생성 및 관리
});

// --- 2. 인스턴스 메서드 ---
// 할 일을 완료 상태로 업데이트하는 메서드
todoSchema.methods.complete = function() {
    this.isCompleted = true;           // 완료 플래그를 true로 설정
    this.status = 'done';              // 상태를 'done'으로 변경
    this.completedAt = new Date();     // 완료 시각을 현재 시각으로 기록
    return this.save();                // 변경된 내용을 데이터베이스에 저장하고 Promise 반환
};

// --- 3. 스키마 인덱스 설정 ---
// 사용자별(user)로 할 일을 조회하고, 생성일(createdAt)의 내림차순(-1)으로 정렬하기 위한 복합 인덱스
// 이 인덱스는 특정 사용자의 할 일 목록을 빠르게 찾는 데 도움을 줍니다.
todoSchema.index({ user: 1, createdAt: -1 });  // user 필드와 createdAt 필드를 기반으로 인덱스 설정

// --- 4. 모델 내보내기 ---
// 'Todo'라는 이름으로 모델 생성 및 외부로 내보내기
module.exports = mongoose.model('Todo', todoSchema);  // 'Todo' 모델을 mongoose 모델로 생성
