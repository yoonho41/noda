const mongoose = require('mongoose')

//스키마 정의
const messageSchema = mongoose.Schema({
    /** PK (자동 증가) */
    no: { type: Number, unique: true, index: true },

    /** 발신/수신 식별자(참조 테이블은 나중에 FK로 전환 가능) */
    sender_id: { type: String, required: true, trim: true },
    receiver_id: { type: String, required: true, trim: true },

    /** 제목/내용 */
    subject: { type: String, required: true, trim: true, maxlength: 300 },
    content: { type: String, required: true },

    /** 날짜들 */
    send_date: { type: Date, default: Date.now }, // sysdate
    read_date: { type: Date, default: null },

    /** 메타 */
    reply: { type: Number, default: 0 }, // 답장 번호(없으면 0)
    is_read: { type: Boolean, default: false },
    is_deleted_by_sender: { type: Boolean, default: false },
    is_deleted_by_receiver: { type: Boolean, default: false },
    is_important: { type: Boolean, default: false },
})
console.log('스키마 정의')


/* === 최소 추가: auto-increment counter === */
// why: 충돌 없이 보수적으로 카운터 컬렉션 사용
const counterSchema = new mongoose.Schema(
  { _id: { type: String, required: true }, seq: { type: Number, default: 0 } },
  { collection: 'counters' }
)
// 재등록 방지
const Counter =
  mongoose.models._Counter || mongoose.model('_Counter', counterSchema, 'counters')

// 신규 저장 시 no 자동 증가
messageSchema.pre('save', async function autoIncNo(next) {
  try {
    if (!this.isNew || this.no != null) return next()
    const counter = await Counter.findByIdAndUpdate(
      'messagedbs.no',                // 모델명 기반 키
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

