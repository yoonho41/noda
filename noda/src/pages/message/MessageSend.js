// C:\VSCode\react\project\noda\src\pages\MessageSend.js
import React, { useMemo, useState } from 'react';
import styles from './MessageSend.module.scss';
import messageService from '../../services/messageService';

// why: datetime-local 기본값으로 사용(UTC 기준 단순 처리)
function nowISO() {
  return new Date().toISOString().slice(0, 16);
}

const INITIAL = {
  sender_id: '',
  receiver_id: '',
  subject: '',
  content: '',
  send_date: nowISO(),
  read_date: '', // '' → null로 변환
  reply: 0,
  is_read: false,
  is_deleted_by_sender: false,
  is_deleted_by_receiver: false,
  is_important: false,
};

export default function MessageSend() {
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  function validate(values) {
    const e = {};
    if (!values.sender_id.trim()) e.sender_id = '발신인 ID는 필수입니다.';
    if (!values.receiver_id.trim()) e.receiver_id = '수신인 ID는 필수입니다.';
    if (!values.subject.trim()) e.subject = '제목은 필수입니다.';
    if (!values.content.trim()) e.content = '내용은 필수입니다.';
    if (values.subject.length > 300) e.subject = '제목은 300자 이하이어야 합니다.';
    return e;
  }

  function toPayload(values) {
    return {
      // no: 서버에서 auto-increment
      sender_id: values.sender_id.trim(),
      receiver_id: values.receiver_id.trim(),
      subject: values.subject.trim(),
      content: values.content,
      send_date: values.send_date ? new Date(values.send_date).toISOString() : undefined,
      read_date: values.read_date ? new Date(values.read_date).toISOString() : null,
      reply: Number(values.reply || 0),
      is_read: Boolean(values.is_read),
      is_deleted_by_sender: Boolean(values.is_deleted_by_sender),
      is_deleted_by_receiver: Boolean(values.is_deleted_by_receiver),
      is_important: Boolean(values.is_important),
    };
  }



  
  
  const onAdd = (payload) => {
    messageService.addMessage(payload)
    setForm(INITIAL)
  }


  function onSubmit(e) {
    e.preventDefault();
    const v = { ...form };
    const eobj = validate(v);
    setErrors(eobj);
    if (Object.keys(eobj).length) return;

    const payload = toPayload(v);
    // TODO: API 연동 시 교체 (예: api.post('/messages', payload))
    // why: 지금은 하드코딩/샘플 단계 → 콘솔로 확인
    // eslint-disable-next-line no-console

    onAdd(payload)

    console.log('[MessageSend] submit payload', payload);
    alert('메세지 전송 요청이 콘솔에 출력되었습니다. (추후 API로 연동)');

    setForm((f) => ({ ...INITIAL, sender_id: f.sender_id })); // why: 발신자 유지 편의
    setErrors({});
  }

  function onReset() {
    setForm(INITIAL);
    setErrors({});
  }

  function fillSample() {
    setForm({
      sender_id: 'sender@noda.com',
      receiver_id: 'receiver@noda.com',
      subject: '(Sample) 회의 안건 공유',
      content: '안녕하세요,\n오늘 16시에 회의실 A에서 진행합니다.\n안건: 릴리즈 계획, 인프라 개선.',
      send_date: nowISO(),
      read_date: '',
      reply: 0,
      is_read: false,
      is_deleted_by_sender: false,
      is_deleted_by_receiver: false,
      is_important: true,
    });
  }

  function onToggleRead(checked) {
    setForm((f) => ({
      ...f,
      is_read: checked,
      read_date: checked && !f.read_date ? nowISO() : checked ? f.read_date : '',
    }));
  }

  const helpText = useMemo(
    () => ({
      sender_id: '발신인 식별자(추후 FK 연동 예정)',
      receiver_id: '수신인 식별자(추후 FK 연동 예정)',
      subject: '메세지 제목(최대 300자)',
      content: '메세지 본문',
      send_date: '발송 시각(기본: 현재)',
      read_date: '읽은 시각(읽음 체크 시 자동 입력)',
      reply: '(추후 삭제 예정) 답장하려는 메세지의 no(Primary Key), 없으면 0',
    }),
    []
  );

  return (
    <div className={styles.root}>
      <h2 className={styles.title}>새 메세지 작성</h2>
      <form className={styles.form} onSubmit={onSubmit} onReset={onReset}>
        {/* 필수 필드 */}
        <div className={styles.row}>
          <label className={styles.label} htmlFor="sender_id">발신인 ID</label>
          <input
            id="sender_id"
            className={`${styles.input} ${errors.sender_id ? styles.invalid : ''}`}
            value={form.sender_id}
            onChange={(e) => setField('sender_id', e.target.value)}
            placeholder="로그인 연동되면 이 입력창은 삭제 예정 (사용자 정보에서 direct로 가져옴)"
          />
          <div className={styles.help}>{helpText.sender_id}</div>
          {errors.sender_id && <div className={styles.error}>{errors.sender_id}</div>}
        </div>

        <div className={styles.row}>
          <label className={styles.label} htmlFor="receiver_id">수신인 ID</label>
          <input
            id="receiver_id"
            className={`${styles.input} ${errors.receiver_id ? styles.invalid : ''}`}
            value={form.receiver_id}
            onChange={(e) => setField('receiver_id', e.target.value)}
            placeholder="수신자ID@noda.com"
          />
          <div className={styles.help}>{helpText.receiver_id}</div>
          {errors.receiver_id && <div className={styles.error}>{errors.receiver_id}</div>}
        </div>

        <div className={styles.row}>
          <label className={styles.label} htmlFor="subject">제목</label>
          <input
            id="subject"
            className={`${styles.input} ${errors.subject ? styles.invalid : ''}`}
            value={form.subject}
            onChange={(e) => setField('subject', e.target.value)}
            placeholder="제목을 입력하세요"
            maxLength={300}
            required
          />
          <div className={styles.help}>{helpText.subject}</div>
          {errors.subject && <div className={styles.error}>{errors.subject}</div>}
        </div>

        <div className={styles.row}>
          <label className={styles.label} htmlFor="content">내용</label>
          <textarea
            id="content"
            className={`${styles.textarea} ${errors.content ? styles.invalid : ''}`}
            rows={10}
            value={form.content}
            onChange={(e) => setField('content', e.target.value)}
            placeholder="메세지 내용을 입력하세요"
            required
          />
          <div className={styles.help}>{helpText.content}</div>
          {errors.content && <div className={styles.error}>{errors.content}</div>}
        </div>

        <div className={styles.rowInline}>
          <div className={styles.row}>
            <label className={styles.label} htmlFor="send_date">발송 시각</label>
            <input
              id="send_date"
              type="datetime-local"
              className={styles.input}
              value={form.send_date}
              onChange={(e) => setField('send_date', e.target.value)}
            />
            <div className={styles.help}>{helpText.send_date}</div>
          </div>

          <div className={styles.row}>
            <label className={styles.label} htmlFor="reply">답장(원본 no)</label>
            <input
              id="reply"
              type="number"
              min={0}
              className={styles.input}
              value={form.reply}
              onChange={(e) => setField('reply', e.target.value)}
              
            />
            <div className={styles.help}>{helpText.reply}</div>
          </div>
        </div>

        {/* 플래그 */}
        <div className={styles.flags}>
          <label className={styles.flag}>
            <input
              type="checkbox"
              checked={form.is_important}
              onChange={(e) => setField('is_important', e.target.checked)}
            />
            중요 표시
          </label>
          <label className={styles.flag}>
            <input
              type="checkbox"
              checked={form.is_read}
              onChange={(e) => onToggleRead(e.target.checked)}
            />
            읽음 처리
          </label>
          {/* <button
            type="button"
            className={styles.linkBtn}
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? '고급 옵션 숨기기' : '고급 옵션 보기'}
          </button> */}
        </div>

        {/* 고급 옵션 */}
        {showAdvanced && (
          <div className={styles.advanced}>
            <div className={styles.rowInline}>
              <div className={styles.row}>
                <label className={styles.label} htmlFor="read_date">읽은 시각</label>
                <input
                  id="read_date"
                  type="datetime-local"
                  className={styles.input}
                  value={form.read_date}
                  onChange={(e) => setField('read_date', e.target.value)}
                  disabled={!form.is_read}
                />
                <div className={styles.help}>{helpText.read_date}</div>
              </div>
              <div className={styles.row}>
                <label className={styles.label}>삭제 플래그</label>
                <div className={styles.flagGroup}>
                  <label className={styles.flag}>
                    <input
                      type="checkbox"
                      checked={form.is_deleted_by_sender}
                      onChange={(e) => setField('is_deleted_by_sender', e.target.checked)}
                    />
                    발신인 삭제
                  </label>
                  <label className={styles.flag}>
                    <input
                      type="checkbox"
                      checked={form.is_deleted_by_receiver}
                      onChange={(e) => setField('is_deleted_by_receiver', e.target.checked)}
                    />
                    수신인 삭제
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 액션 */}
        <div className={styles.actions}>
          <button type="submit" className={styles.primaryBtn}>보내기</button>
          <button type="reset" className={styles.neutralBtn}>초기화</button>
          <button type="button" className={styles.neutralBtn} onClick={fillSample}>
            샘플 채우기
          </button>
        </div>
      </form>

      {/* 디버그 미리보기 (개발 편의) */}
      <details className={styles.preview}>
        <summary>현재 입력값(JSON 미리보기)</summary>
        <pre>{JSON.stringify(toPayload(form), null, 2)}</pre>
      </details>
    </div>
  );
}
