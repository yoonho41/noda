// C:\VSCode\react\project\noda\src\pages\Message.js
import React, { useMemo, useState } from 'react';
import styles from './Message.module.scss';
import MessageSend from './MessageSend';

/** why: 날짜 표기 가독성 확보 */
function formatDate(iso) {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return iso;
  }
}

/** 샘플 하드코딩 데이터 */
const SAMPLE_MESSAGES = [
  {
    id: 'm1',
    fromName: '홍길동',
    fromEmail: 'hong@corp.local',
    toName: '나',
    toEmail: 'me@corp.local',
    subject: '10월 정기 회의 일정 공유',
    body: '안녕하세요,\n이번 주 금요일 14시에 회의실 A에서 진행합니다.\n안건: 분기 실적, 신규 프로젝트 킥오프.',
    date: '2025-10-23T08:41:00Z',
    unread: true,
    folder: 'inbox',
  },
  {
    id: 'm2',
    fromName: '나',
    fromEmail: 'me@corp.local',
    toName: '개발팀',
    toEmail: 'dev@corp.local',
    subject: '배포 체크리스트 업데이트',
    body: '체크리스트 1.2 버전 배포했습니다. 변경사항 확인 부탁드립니다.',
    date: '2025-10-22T14:15:00Z',
    unread: false,
    folder: 'sent',
  },
  {
    id: 'm3',
    fromName: '박보라',
    fromEmail: 'bora@corp.local',
    toName: '나',
    toEmail: 'me@corp.local',
    subject: '[요청] 데이터 추출',
    body: '지난 분기 매출 데이터 CSV로 부탁드려요.\n필드: 날짜, 상품, 금액, 채널',
    date: '2025-10-21T02:10:00Z',
    unread: true,
    folder: 'inbox',
  },
  {
    id: 'm4',
    fromName: '인사팀',
    fromEmail: 'hr@corp.local',
    toName: '나',
    toEmail: 'me@corp.local',
    subject: '연말 정산 안내',
    body: '연말 정산 일정 및 필요서류 안내드립니다.',
    date: '2025-10-20T09:00:00Z',
    unread: false,
    folder: 'inbox',
  },
];

export default function Message() {
  const [messages, setMessages] = useState(SAMPLE_MESSAGES);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('date_desc'); // 'date_desc' | 'date_asc' | 'unread'
  const [readingId, setReadingId] = useState(null);

  const [compose, setCompose] = useState({
    open: false,
    mode: 'new', // 'new' | 'reply'
    to: '',
    subject: '',
    body: '',
    replyToId: null,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = messages.filter((m) => {
      if (!q) return true;
      return (
        m.subject.toLowerCase().includes(q) ||
        m.fromName.toLowerCase().includes(q) ||
        m.fromEmail.toLowerCase().includes(q) ||
        m.body.toLowerCase().includes(q)
      );
    });
    if (sortKey === 'date_desc') arr = arr.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    if (sortKey === 'date_asc') arr = arr.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    if (sortKey === 'unread') arr = arr.slice().sort((a, b) => Number(b.unread) - Number(a.unread));
    return arr;
  }, [messages, query, sortKey]);

  const allVisibleIds = filtered.map((m) => m.id);
  const allSelectedOnPage = allVisibleIds.every((id) => selectedIds.has(id)) && allVisibleIds.length > 0;

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleSelectAllVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelectedOnPage) {
        allVisibleIds.forEach((id) => next.delete(id));
      } else {
        allVisibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }
  function handleDeleteSelected() {
    if (selectedIds.size === 0) return;
    setMessages((prev) => prev.filter((m) => !selectedIds.has(m.id)));
    setSelectedIds(new Set());
    if (readingId && !messages.find((m) => m.id === readingId)) setReadingId(null);
  }
  function handleMarkRead(unread) {
    if (selectedIds.size === 0) return;
    setMessages((prev) =>
      prev.map((m) => (selectedIds.has(m.id) ? { ...m, unread } : m))
    );
  }

  function openComposeNew() {
    setCompose({
      open: !compose.open,
      mode: 'new',
      to: '',
      subject: '',
      body: '',
      replyToId: null,
    });
  }

  function openReply(msg) {
    const quoted = `\n\n--- 원본 메시지 ---\nFrom: ${msg.fromName} <${msg.fromEmail}>\nDate: ${formatDate(msg.date)}\nSubject: ${msg.subject}\n\n${msg.body}`;
    setCompose({
      open: true,
      mode: 'reply',
      to: `${msg.fromName} <${msg.fromEmail}>`,
      subject: msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`,
      body: quoted,
      replyToId: msg.id,
    });
  }

  function handleSend(e) {
    e.preventDefault();
    const now = new Date().toISOString();
    const newMsg = {
      id: `local_${Date.now()}`,
      fromName: '나',
      fromEmail: 'me@corp.local',
      toName: compose.to || '(미지정)',
      toEmail: compose.to || '',
      subject: compose.subject || '(제목 없음)',
      body: compose.body || '',
      date: now,
      unread: false,
      folder: 'sent',
    };
    setMessages((prev) => [newMsg, ...prev]);
    setCompose({ open: false, mode: 'new', to: '', subject: '', body: '', replyToId: null });
  }

  function handleCancelCompose() {
    setCompose((c) => ({ ...c, open: false }));
  }

  function onRowClick(m) {
    setReadingId(m.id);
    if (m.unread) {
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, unread: false } : x)));
    }
  }

  const singleSelectedMsg =
    selectedIds.size === 1 ? messages.find((m) => selectedIds.has(m.id)) : null;

  return (
    <div className={styles.root}>
      {/* 툴바 */}
      <div className={styles.toolbar}>
        <div className={styles.leftGroup}>
          <button type="button" className={styles.primaryBtn} onClick={openComposeNew}>
            {
                compose.open?'작성 취소':'새 메세지'
            }
          </button>
          <button
            type="button"
            className={styles.dangerBtn}
            onClick={handleDeleteSelected}
            disabled={selectedIds.size === 0}
            title="선택 항목 삭제"
          >
            삭제
          </button>
          <button
            type="button"
            className={styles.neutralBtn}
            onClick={() => singleSelectedMsg && openReply(singleSelectedMsg)}
            disabled={!singleSelectedMsg}
            title="선택한 1건에 답장"
          >
            답장
          </button>
          <button
            type="button"
            className={styles.neutralBtn}
            onClick={() => handleMarkRead(false)}
            disabled={selectedIds.size === 0}
            title="선택 항목을 읽지 않음으로 표시"
          >
            안읽음
          </button>
          <button
            type="button"
            className={styles.neutralBtn}
            onClick={() => handleMarkRead(true)}
            disabled={selectedIds.size === 0}
            title="선택 항목을 읽음으로 표시"
          >
            읽음
          </button>
        </div>
        <div className={styles.rightGroup}>
          <input
            className={styles.searchInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색: 제목/보낸사람/본문"
          />
          <select
            className={styles.select}
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
          >
            <option value="date_desc">최근순</option>
            <option value="date_asc">오래된순</option>
            <option value="unread">안읽음 우선</option>
          </select>
        </div>
      </div>

      {/* 컴포즈(작성) */}
      {compose.open && (
        <MessageSend/>
      )}

      {/* 리스트 헤더 */}
      <div className={`${styles.row} ${styles.headerRow}`}>
        <div className={styles.colCheck}>
          <input
            type="checkbox"
            checked={allSelectedOnPage}
            onChange={toggleSelectAllVisible}
            aria-label="전체 선택"
          />
        </div>
        <div className={styles.colFrom}>보낸사람</div>
        <div className={styles.colSubject}>제목</div>
        <div className={styles.colDate}>날짜</div>
        <div className={styles.colActions}>작업</div>
      </div>

      {/* 리스트 바디 */}
      <div className={styles.list}>
        {filtered.map((m) => {
          const selected = selectedIds.has(m.id);
          return (
            <div
              key={m.id}
              className={`${styles.row} ${selected ? styles.selected : ''} ${m.unread ? styles.unread : ''}`}
              onClick={() => onRowClick(m)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onRowClick(m)}
            >
              <div className={styles.colCheck} onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleSelect(m.id)}
                  aria-label={`${m.subject} 선택`}
                />
              </div>
              <div className={styles.colFrom}>
                <div className={styles.fromName}>{m.fromName}</div>
                <div className={styles.fromEmail}>{m.fromEmail}</div>
              </div>
              <div className={styles.colSubject}>
                <div className={styles.subject}>{m.subject}</div>
                <div className={styles.preview}>{m.body.slice(0, 80)}</div>
              </div>
              <div className={styles.colDate}>{formatDate(m.date)}</div>
              <div className={styles.colActions} onClick={(e) => e.stopPropagation()}>
                <button className={styles.linkBtn} type="button" onClick={() => openReply(m)}>답장</button>
                <button className={styles.linkBtn} type="button" onClick={() => {
                  setSelectedIds(new Set([m.id]));
                  handleDeleteSelected();
                }}>삭제</button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className={styles.empty}>표시할 메세지가 없습니다.</div>
        )}
      </div>

      {/* 읽기 패널(선택 시) */}
      {!!readingId && (
        <ReadingPane
          message={messages.find((m) => m.id === readingId)}
          onClose={() => setReadingId(null)}
        />
      )}
    </div>
  );
}

function ReadingPane({ message, onClose }) {
  if (!message) return null;
  return (
    <div className={styles.readingPane}>
      <div className={styles.readingHeader}>
        <div>
          <div className={styles.readingSubject}>{message.subject}</div>
          <div className={styles.readingMeta}>
            From {message.fromName} &lt;{message.fromEmail}&gt; · {formatDate(message.date)}
          </div>
        </div>
        <button className={styles.neutralBtn} onClick={onClose} type="button">닫기</button>
      </div>
      <pre className={styles.readingBody}>{message.body}</pre>
    </div>
  );
}
