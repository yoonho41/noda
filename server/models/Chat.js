const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true, 
    index: true 
  },                                        // 사용자 ID (인덱스 추가)
  teamId: { 
    type: String, 
    required: false, 
    default: "defaultTeam", 
    index: true 
  },                                     // [추가] 팀/프로젝트 ID
  user: { 
    type: String, 
    required: true 
  },                                        // 사용자 메시지
  ai: { 
    type: String, 
    required: true 
  },                                        // AI 응답
  isAction: { 
    type: Boolean, 
    default: false 
  },                                    // [추가] AI 응답에 ##ACTION## JSON 포함 여부
  // [제거] feedback 필드 제거
  createdAt: { 
    type: Date, 
    default: Date.now, 
    index: true 
  }                                   // 생성 시각
});

module.exports = mongoose.model("Chat", chatSchema);