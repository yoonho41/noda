// // server/models/messageModels.js
// const mongoose = require('mongoose');
// // why: 'no'를 1씩 증가하는 int로 만들기 위해 사용
// const AutoIncrement = require('mongoose-sequence')(mongoose);

// // --------------------- MESSAGES ---------------------
// const messageSchema = new mongoose.Schema(
//   {
//     // PK: auto-increment int
//     no: { type: Number, unique: true },

//     // FK (일반적으로 사용자 컬렉션 ObjectId를 참조)
//     sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'USERS', required: true },
//     receiver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'USERS', required: true },

//     // 본문/제목
//     subject: { type: String, trim: true, required: true },
//     content: { type: String, required: true },

//     // 날짜
//     send_date: { type: Date, default: Date.now },
//     read_date: { type: Date, default: null },

//     // 답장: 대상 메시지의 no를 참조(없으면 0)
//     reply: { type: Number, default: 0 },

//     // 플래그
//     is_read: { type: Boolean, default: false },
//     is_deleted_by_sender: { type: Boolean, default: false },
//     is_deleted_by_receiver: { type: Boolean, default: false },
//     is_important: { type: Boolean, default: false },
//   },
//   {
//     collection: 'MESSAGES',
//     versionKey: false,
//   }
// );

// // auto-increment 설정
// messageSchema.plugin(AutoIncrement, { inc_field: 'no' });

// console.log('메시지 스키마 정의');

// // 모델 정의
// const Message = mongoose.model('Message', messageSchema);
// console.log('메시지 모델 정의');

// // --------------------- MESSAGE_FILES ---------------------
// const messageFileSchema = new mongoose.Schema(
//   {
//     // PK: auto-increment int
//     no: { type: Number, unique: true },

//     // MESSAGES.no를 참조
//     message_id: { type: Number, required: true },

//     // 파일 정보
//     original_file_name: { type: String, trim: true, required: true },
//     saved_file_name: { type: String, trim: true, required: true },
//     path: { type: String, trim: true, required: true },
//   },
//   {
//     collection: 'MESSAGE_FILES',
//     versionKey: false,
//   }
// );

// // auto-increment 설정
// messageFileSchema.plugin(AutoIncrement, { inc_field: 'no' });

// console.log('메시지 파일 스키마 정의');

// // 모델 정의
// const MessageFile = mongoose.model('MessageFile', messageFileSchema);
// console.log('메시지 파일 모델 정의');

// // 내보내기
// module.exports = {
//   Message,
//   MessageFile,
// };