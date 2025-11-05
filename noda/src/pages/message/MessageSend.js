// C:\VSCode\react\project\noda\src\pages\MessageSend.js
import React, { useEffect, useMemo, useState } from 'react';
import styles from './MessageSend.module.scss';
import messageService from '../../services/messageService';
import messageFilesService from '../../services/messageFilesService';

// why: datetime-local 기본값으로 사용(UTC 기준 단순 처리)
function nowISO() {
  const kstMs = Date.now() + 9 * 60 * 60 * 1000;

  return new Date(kstMs).toISOString().slice(0, 19);
}



export default function MessageSend(props) {

  const INITIAL = {
    sender_id: '',
    sender_name: '',
    receiver_id: props.compose.to,
    subject: '',
    content: '',
    send_date: nowISO(),
    read_date: '', // '' → null로 변환
    reply: props.compose.replyToId,
    is_read: false,
    is_deleted_by_sender: false,
    is_deleted_by_receiver: false,
    is_important: false,
  };




  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [submitting,setSubmitting] = useState(false);

  const [file, setFile] = useState([])
  const changeFile= (evt) => {
      const f = evt.target.files && evt.target.files[0];
      if (!f) return;
      setFile((prev) => [...prev, { id: uid(), file: f }]);
      evt.target.value = ""; // 왜: 동일 파일 재선택 감지
  }

  const senderEmail = JSON.parse(localStorage.getItem("user") ?? "null")?.email ?? null;
  const senderName = JSON.parse(localStorage.getItem("user") ?? "null")?.name ?? null;


  //파일 여러 개 업로드
  function uid() {
    // 왜: key 충돌/삭제 안정성 위해 고유 ID 필요
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
  function removeFile(id) {
    setFile((prev) => prev.filter((x) => x.id !== id));
  }







  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  function validate(values) {
    const e = {};
    if (!values.sender_id.trim()) e.sender_id = '발신자 Email은 필수입니다.';
    if (!values.receiver_id.trim()) e.receiver_id = '수신자 Email은 필수입니다.';
    if (!isValidEmail) e.receiver_id = '존재하지 않는 Email입니다.'
    if (!values.subject.trim()) e.subject = '제목은 필수입니다.';
    if (!values.content.trim()) e.content = '내용은 필수입니다.';
    if (values.subject.length > 300) e.subject = '제목은 300자 이하이어야 합니다.';
    return e;
  }

  function toPayload(values) {
    return {
      ...values,
      // no: 서버에서 auto-increment
      // sender_id: values.sender_id.trim(),
      receiver_id: values.receiver_id.trim(),
      subject: values.subject.trim(),
      content: values.content,
      // send_date: values.send_date ? new Date(values.send_date).toISOString() : undefined,
      // read_date: values.read_date ? new Date(values.read_date).toISOString() : null,
      reply: Number(values.reply || 0),
      is_read: Boolean(values.is_read),
      is_deleted_by_sender: Boolean(values.is_deleted_by_sender),
      is_deleted_by_receiver: Boolean(values.is_deleted_by_receiver),
      is_important: Boolean(values.is_important),
    };
  }



  const onCounter = async () => {
    const value = await messageService.getMaxMessageNo()
    setMaxNo(value)
    return value;
  }

  
  const [maxNo, setMaxNo] = useState(0)
  const [err, setErr] = useState('');



  
  const onAdd = async (payload) => {
    try {
      await messageService.addMessage(payload)
      
      
      const currentNo = await messageService.getMaxMessageNo();

      if (file) {
        file.map(async ({ file }) => await messageFilesService.addFile(file, currentNo))
        //await messageFilesService.addFile(file,currentNo)
      }

      setForm(INITIAL)
      setFile([])
      
    } catch (e) {
      console.error(e)
      alert('처리 실패')
    }
  }


  function onSubmit(e) {
    e.preventDefault();

    


    const v = { ...form, send_date: nowISO(), sender_id: senderEmail, sender_name: senderName};
    const eobj = validate(v);
    setErrors(eobj);
    if (Object.keys(eobj).length) return;

    const payload = toPayload(v);
    // TODO: API 연동 시 교체 (예: api.post('/messages', payload))
    // why: 지금은 하드코딩/샘플 단계 → 콘솔로 확인
    // eslint-disable-next-line no-console

    onAdd(payload)

    console.log('[MessageSend] submit payload', payload);
    alert(`${v.receiver_id}님에게 메일을 성공적으로 발송했습니다.`);

    setForm((f) => ({ ...INITIAL, sender_id: f.sender_id, sender_name: f.sender_name })); // why: 발신자 유지 편의
    setErrors({});


    props.setCompose(false)
    props.onData()
  }

  function onReset() {
    setForm(INITIAL);
    setErrors({});
  }

  function fillSample() {
    setForm({
      sender_id: 'sender',
      receiver_id: 'receiver',
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
      receiver_id: props.compose.to,
      is_read: checked,
      read_date: checked && !f.read_date ? nowISO() : checked ? f.read_date : '',
    }));
  }

  const helpText = useMemo(
    () => ({
      sender_id: ' ',
      receiver_id: ' ',
      subject: '최대 300자',
      content: '최대 2000자',
      send_date: '여러 파일 업로드 가능',
      read_date: '읽은 시각(읽음 체크 시 자동 입력)',
      reply: '(추후 삭제 예정) 답장하려는 메세지의 no(Primary Key), 없으면 0',
    }),
    []
  );


  const [isValidEmail, setIsValidEmail] = useState(false);







  return (
    <div className={styles.root}>
      <h2 className={styles.title}>새 메세지 작성</h2>
      <form className={styles.form} onSubmit={onSubmit} onReset={onReset}>
        {/* 필수 필드 */}
        <div className={styles.row}>
          <div className={styles.rowInline}>
            <label className={styles.label_sender} htmlFor="sender_id">발신자 Email</label>


            <label className={styles.importance}>
              중요 메세지
              <input
                type="checkbox"
                className={styles.importance_checkbox}
                checked={form.is_important}
                onChange={(e) => setField('is_important', e.target.checked)}
              />
               
            </label>
          </div>
          
          <input id="sender_name" value={senderName} hidden/>

          <input
            id="sender_id"
            className={`${styles.input} ${errors.sender_id ? styles.invalid : ''}`}
            value={senderEmail}
            onChange={(e) => setField('sender_id', e.target.value)}
            placeholder="로그인 연동되면 이 입력창은 삭제 예정 (사용자 정보에서 direct로 가져옴)"
            disabled
          />
          <div className={styles.help}>{helpText.sender_id}</div>
          {errors.sender_id && <div className={styles.error}>{errors.sender_id}</div>}
        </div>

        <div className={styles.row}>
          <label className={styles.label} htmlFor="receiver_id">
            받는 사람&nbsp;
            {
              isValidEmail?'✅':'❌'
            }
          </label>
          <input
            id="receiver_id"
            className={`${styles.input} ${errors.receiver_id ? styles.invalid : ''}`}
            value={form.receiver_id}
            // onChange={(e) => setField('receiver_id', e.target.value)}
            onChange={async (e) => {
              const v = e.target.value;
              setField("receiver_id", v);
              if (v.length>0) {
                const data = await messageService.getNameByEmail(v);
                setIsValidEmail(Array.isArray(data) ? data.some(Boolean) : Boolean(data));
              } else {
                setIsValidEmail(false)
              }
              
            }}
            placeholder="받는 사람 Email"
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

        <div className={styles.rowInline_file}>
          <div>
            <label className={styles.label} htmlFor="send_date" style={{marginTop:'10px'}}>첨부 파일</label>
            {/* <input
              id="send_date"
              type="datetime-local"
              className={styles.input}
              value={form.send_date}
              onChange={(e) => setField('send_date', e.target.value)}
            /> */}

            <input 
              type='file'
              className={styles.input}
              onChange={changeFile}
            />


            <div className={styles.help}>{helpText.send_date}</div>

            
          </div>

          <div className={styles.row} style={{marginTop:'15px'}}>
            
            {file.length > 0 && (
              <div>
                <div className={styles.attachmentsHeader}>
                  파일 리스트 ({file.length}개)
                </div>
                <ul className={styles.attachmentsList}>
                  {file.map(({ id, file }, idx) => (
                    <li
                      key={id}
                      className={styles.attachmentsItem}
                    >
                      <div className={styles.attachmentsMeta}>
                        <div className={styles.attachmentsName}>
                          {file.name}
                        </div>
                        <div className={styles.attachmentsSubtext}>
                          {/* {file.type || "unknown"} · {bytesToHuman(file.size)} */}
                        </div>
                      </div>
                      <button
                        type="button"
                        className={styles.dangerBtn}
                        onClick={() => removeFile(id)}
                        aria-label="파일 삭제"
                        title="파일 삭제"
                      >
                        삭제
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        
        

        {/* 액션 */}
        <div className={styles.actions} style={{marginTop:'40px'}}>
          <button type="submit" className={styles.primaryBtn}>보내기</button>
          <button type="reset" className={styles.neutralBtn}>초기화</button>
          <button type="button" className={styles.neutralBtn} onClick={fillSample}>
            샘플 채우기
          </button>
        </div>
      </form>

      {/* 디버그 미리보기 (개발 편의) */}
      {/* <details className={styles.preview}>
        <summary>현재 입력값(JSON 미리보기)</summary>
        <pre>{JSON.stringify(toPayload(form), null, 2)}</pre>
      </details> */}
    </div>
  );
}
