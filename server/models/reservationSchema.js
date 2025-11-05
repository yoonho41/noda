// server/models/reservationSchema.js
// 왜: 프런트의 trySubmit 포맷(dateKey + 분 단위 start/end)과 1:1 매핑되는 예약 스키마
const mongoose = require('mongoose');

const ROOMS = ['A', 'B', 'C'];
const OPEN_MIN = 9 * 60;     // 540 (09:00)
const CLOSE_MIN = 21 * 60;   // 1260 (21:00)
const STEP_MIN = 30;

function isStep(min) { return Number.isInteger(min) && min % STEP_MIN === 0; }

const ReservationSchema = new mongoose.Schema(
  {
    room: { type: String, enum: ROOMS, required: true, index: true },
    // YYYY-MM-DD (KST 기준 처리 여부는 API 계층에서 보장)
    dateKey: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Invalid dateKey format (YYYY-MM-DD)'],
      index: true,
    },
    start: {
      type: Number,
      required: true,
      min: [0, 'start must be >= 0'],
      max: [24 * 60, 'start must be <= 1440'],
      validate: {
        validator: isStep,
        message: 'start must be a multiple of 30 minutes',
      },
    },
    end: {
      type: Number,
      required: true,
      min: [0, 'end must be >= 0'],
      max: [24 * 60, 'end must be <= 1440'],
      validate: {
        validator: isStep,
        message: 'end must be a multiple of 30 minutes',
      },
    },
    title: { type: String, trim: true, default: '(제목 없음)' },
    owner: { type: String, trim: true, default: '' },
    // 프런트는 쉼표구분 문자열을 보낼 수 있음. 마이그레이션 전까지 문자열로 저장.
    participants: { type: String, trim: true, default: '' },
    note: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

// 유니크(정확히 동일한 레인지 중복 방지)
ReservationSchema.index({ room: 1, dateKey: 1, start: 1, end: 1 }, { unique: true });

// 왜: 비즈니스 시간 09:00~21:00 정책을 DB 레벨에서 강제
ReservationSchema.pre('validate', function (next) {
  if (this.start >= this.end) return next(new mongoose.Error.ValidationError(this).addError('end', new mongoose.Error.ValidatorError({ message: 'end must be greater than start' })));
  if (this.start < OPEN_MIN || this.end > CLOSE_MIN) {
    return next(new mongoose.Error.ValidationError(this).addError('time', new mongoose.Error.ValidatorError({ message: 'Reservation must be within 09:00~21:00' })));
  }
  return next();
});

// 겹침 검사 쿼리
async function existsOverlap({ room, dateKey, start, end, excludeId }) {
  const query = {
    room,
    dateKey,
    start: { $lt: end }, // this.start < other.end
    end: { $gt: start }, // this.end > other.start
  };
  if (excludeId) query._id = { $ne: excludeId };
  const Model = mongoose.model('reservation', ReservationSchema);
  return await Model.exists(query);
}

// save 시 겹침 방지
ReservationSchema.pre('save', async function (next) {
  // 왜: 중복 인서트/업데이트 모두 차단
  try {
    const overlap = await existsOverlap({
      room: this.room,
      dateKey: this.dateKey,
      start: this.start,
      end: this.end,
      excludeId: this._id,
    });
    if (overlap) return next(new mongoose.Error.ValidationError(this).addError('time', new mongoose.Error.ValidatorError({ message: 'Overlapping reservation exists' })));
    return next();
  } catch (err) {
    return next(err);
  }
});

// findOneAndUpdate 시 겹침 방지
ReservationSchema.pre('findOneAndUpdate', async function (next) {
  // 왜: 업데이트 payload로 겹침 유발 가능
  try {
    const update = this.getUpdate() || {};
    const $set = update.$set || update;

    // 기존 문서 + 변경 사항 병합
    const current = await this.model.findOne(this.getQuery()).lean();
    if (!current) return next();

    const room = $set.room ?? current.room;
    const dateKey = $set.dateKey ?? current.dateKey;
    const start = $set.start ?? current.start;
    const end = $set.end ?? current.end;

    // 기본 유효성
    if (!(isStep(start) && isStep(end) && start < end && start >= OPEN_MIN && end <= CLOSE_MIN)) {
      return next(new mongoose.Error.ValidationError(this).addError('time', new mongoose.Error.ValidatorError({ message: 'Invalid time range' })));
    }

    const overlap = await existsOverlap({
      room, dateKey, start, end, excludeId: current._id,
    });
    if (overlap) return next(new mongoose.Error.ValidationError(this).addError('time', new mongoose.Error.ValidatorError({ message: 'Overlapping reservation exists' })));
    return next();
  } catch (err) {
    return next(err);
  }
});

// JSON 출력 정리
ReservationSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_, ret) {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

mongoose.model('reservation', ReservationSchema);
module.exports = { ROOMS, OPEN_MIN, CLOSE_MIN, STEP_MIN };
