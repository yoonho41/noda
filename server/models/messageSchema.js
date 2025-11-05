const mongoose = require('mongoose')

//스키마 정의
const messageSchema = mongoose.Schema({
    // PK (1씩 증가하도록 아래에 만들어둠)
    no: { type: Number, unique: true, index: true },

    // 발신/수신 식별자(참조 테이블은 나중에 User 테이블 만들어지면 FK로 전환 가능)
    sender_id: { type: String, required: true, trim: true },
    sender_name: { type: String, required: true, trim: true },
    receiver_id: { type: String, required: true, trim: true },

    // 제목/내용 
    subject: { type: String, required: true, trim: true, maxlength: 300 },
    content: { type: String, required: true },

    // 날짜
    send_date: { type: Date, default: Date.now }, // sysdate
    read_date: { type: Date, default: null },

    // 그 외
    reply: { type: Number, default: 0 }, // 답장 번호(없으면 0)
    is_read: { type: Boolean, default: false },
    is_deleted_by_sender: { type: Boolean, default: false },
    is_deleted_by_receiver: { type: Boolean, default: false },
    is_important: { type: Boolean, default: false },
})
console.log('스키마 정의')


//auto-increment (counter라는 이름으로 등록됨)
const counterSchema = new mongoose.Schema(
  { _id: { type: String, required: true }, seq: { type: Number, default: 0 } },
  { collection: 'counters' }
)
// 재등록 방지
const Counter = mongoose.models._Counter || mongoose.model('_Counter', counterSchema, 'counters')

// 신규 저장 시 no 자동 증가
messageSchema.pre('save', async function autoIncNo(next) {
  try {
    if (!this.isNew || this.no != null) return next()
    const counter = await Counter.findByIdAndUpdate(
      'messagedbs.no', 
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    )
    this.no = counter.seq
    return next()
  } catch (err) {
    return next(err)
  }
})



//모델 정의
mongoose.model('messagedbs',messageSchema)
console.log('모델 정의')





const messageFileSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    checksum: { type: String, required: true }, // sha256 hex
    data: { type: Buffer, required: true },
    messageId: { type: Number }, // why: 메시지-파일 연결이 필요할 수 있음
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false }, collection: 'message_files' }
);

messageFileSchema.index({ createdAt: -1 });
messageFileSchema.index({ checksum: 1 });

mongoose.model('message_files', messageFileSchema);