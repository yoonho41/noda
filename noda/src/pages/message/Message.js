// C:\VSCode\react\project\noda\src\pages\Message.js
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import styles from './Message.module.scss';
import MessageSend from './MessageSend';
import messageService from '../../services/messageService';

import "eva-icons/style/eva-icons.css";
import Swal from "sweetalert2";
import messageFilesService from '../../services/messageFilesService';


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

const SAMPLE_MESSAGES1 = []

const SAMPLE_MESSAGES = [
  {
    id: 'm1',
    sender_id: '홍길동',
    fromEmail: 'hong@corp.local',
    receiver_id: '나',
    toEmail: 'me@corp.local',
    subject: '10월 정기 회의 일정 공유',
    content: '안녕하세요,\n이번 주 금요일 14시에 회의실 A에서 진행합니다.\n안건: 분기 실적, 신규 프로젝트 킥오프.',
    send_date: '2025-10-23T08:41:00Z',
    unread: true,
    folder: 'inbox',
  },
  {
    id: 'm2',
    sender_id: '나',
    fromEmail: 'me@corp.local',
    receiver_id: '개발팀',
    toEmail: 'dev@corp.local',
    subject: '배포 체크리스트 업데이트',
    content: '체크리스트 1.2 버전 배포했습니다. 변경사항 확인 부탁드립니다.',
    send_date: '2025-10-22T14:15:00Z',
    unread: false,
    folder: 'sent',
  },
  {
    id: 'm3',
    sender_id: '박보라',
    fromEmail: 'bora@corp.local',
    receiver_id: '나',
    toEmail: 'me@corp.local',
    subject: '[요청] 데이터 추출',
    content: '지난 분기 매출 데이터 CSV로 부탁드려요.\n필드: 날짜, 상품, 금액, 채널',
    send_date: '2025-10-21T02:10:00Z',
    unread: true,
    folder: 'inbox',
  },
  {
    id: 'm4',
    sender_id: '인사팀',
    fromEmail: 'hr@corp.local',
    receiver_id: '나',
    toEmail: 'me@corp.local',
    subject: '연말 정산 안내',
    content: '연말 정산 일정 및 필요서류 안내드립니다.',
    send_date: '2025-10-20T09:00:00Z',
    unread: false,
    folder: 'inbox',
  },
];



export default function Message() {
  const [messages, setMessages] = useState(SAMPLE_MESSAGES1);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('date_desc'); // 'date_desc' | 'date_asc' | 'unread'
  const [readingId, setReadingId] = useState(null);

  const [compose, setCompose] = useState({
    open: false,
    mode: 'new', // 'new' | 'reply'
    to: '',
    subject: '',
    content: '',
    replyToId: null,
  });


  const [fileId,setFileId] = useState([]);





  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = messages.filter((m) => {
      if (!q) return true;
      return (
        m.subject.toLowerCase().includes(q) ||
        m.sender_id.toLowerCase().includes(q) ||
        m.fromEmail.toLowerCase().includes(q) ||
        m.content.toLowerCase().includes(q)
      );
    });
    if (sortKey === 'date_desc') arr = arr.slice().sort((a, b) => new Date(b.send_date) - new Date(a.send_date));
    if (sortKey === 'date_asc') arr = arr.slice().sort((a, b) => new Date(a.send_date) - new Date(b.send_date));
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

    Swal.fire({
      title: "",
      text: "정말 삭제하시겠습니까?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "삭제하기",
      cancelButtonText: "취소하기",
      showClass: {popup:"swal2-show"}
    }).then((result) => {
      if (result.isConfirmed) {
        setMessages((prev) => prev.filter((m) => !selectedIds.has(m.id)));

        for (let id of selectedIds) {
          onDel(id)
        }

        setSelectedIds(new Set());
        if (readingId && !messages.find((m) => m.id === readingId)) setReadingId(null);

        Swal.fire({
          title: "",
          text: "성공적으로 삭제되었습니다.",
          icon: "success"
        });
      }
    });

  }

  function handelDeleteSingle(id) {
    Swal.fire({
      title: "",
      text: "정말 삭제하시겠습니까?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "삭제하기",
      cancelButtonText: "취소하기",
      showClass: {popup:"swal2-show"}
    }).then((result) => {
      if (result.isConfirmed) {
        //setMessages((prev) => prev.filter((m) => !selectedIds.has(m.id)));

        onDel(id)
        onDelFile(id)
        
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        if (readingId && !messages.find((m) => m.id === readingId)) setReadingId(null);

        Swal.fire({
          title: "",
          text: "성공적으로 삭제되었습니다.",
          icon: "success"
        });
      }
    });
  }



  function handleMarkRead(unread) {
    if (selectedIds.size === 0) return;
    for (let id of selectedIds) {
      onRead(id)
    }
    setMessages((prev) =>
      prev.map((m) => (selectedIds.has(m.id) ? { ...m, unread } : m))
    );
  }

  function handleMarkUnRead(unread) {
    if (selectedIds.size === 0) return;
    for (let id of selectedIds) {
      onUnRead(id)
    }
    
  }

  function openComposeNew() {
    setCompose({
      open: !compose.open,
      mode: 'new',
      to: '',
      subject: '',
      content: '',
      replyToId: null,
    });
  }

  function openReply(msg) {
    const quoted = `\n\n--- 원본 메시지 ---\nFrom: ${msg.sender_id} <${msg.fromEmail}>\nDate: ${formatDate(msg.send_date)}\nSubject: ${msg.subject}\n\n${msg.content}`;
    setCompose({
      open: true,
      mode: 'reply',
      // to: `${msg.sender_id} <${msg.fromEmail}>`,
      to: msg.fromEmail,
      subject: msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`,
      content: quoted,
      replyToId: msg.no,
    });
  }

  function handleSend(e) {
    e.preventDefault();
    const now = new Date().toISOString();
    const newMsg = {
      id: `local_${Date.now()}`,
      sender_id: '나',
      fromEmail: 'me@corp.local',
      receiver_id: compose.to || '(미지정)',
      toEmail: compose.to || '',
      subject: compose.subject || '(제목 없음)',
      content: compose.content || '',
      send_date: now,
      unread: false,
      folder: 'sent',
    };
    setMessages((prev) => [newMsg, ...prev]);
    setCompose({ open: false, mode: 'new', to: '', subject: '', content: '', replyToId: null });
  }

  function handleCancelCompose() {
    setCompose((c) => ({ ...c, open: false }));
  }

  const onFileList = async(id) => {
      const res = await messageFilesService.getFile(id)
      setFileId(res)
      
  }

  function onRowClick(m) {
    
    setReadingId(m.id);

    onFileList(m.id)
    
    

    onRead(m.id)


    if (!m.unread) {
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, unread: false } : x)));
    }
    scrollPageToBottom()
  }

  const singleSelectedMsg =
    selectedIds.size === 1 ? messages.find((m) => selectedIds.has(m.id)) : null;

  const onData = async() => {
      const res = await messageService.getMessage()
      const message = res.map(m => ({
        ...m,
        id: m.no,
        sender_id: m.sender_id,
        fromEmail: m.sender_id + '@noda.com',
        receiver_id: m.receiver_id,
        toEmail: m.receiver_id + '@noda.com',
        subject: m.subject,
        content: m.content,
        send_date: m.send_date,
        unread: m.is_read,
        folder: 'sent',
      }));
      setMessages(message)
  }

  useEffect(() => {
      onData()
  },[])

  const onDel = (id) => {
    messageService.deleteMessage(id)
    onData()
  }

  const onDelFile = (id) => {
    messageFilesService.deleteFile(id)
    onData()
  }


  const onRead = (id) => {
    messageService.readMessage(id)
    onData()
  }

  const onUnRead = (id) => {
    messageService.unreadMessage(id)
    onData()
  }


  function formatFileSizeFromKB(sizeInKB) {
    const n = Number(sizeInKB);

    if (n < 500) {
      // 입력이 소수일 수 있으므로 반올림하여 깔끔한 정수 KB 표기
      return `${Math.round(n)} B`;
    }
    if (n < 512000) {
      const mb = n / 1024;
      return `${mb.toFixed(1)} KB`;
    }
    const mb = n / (1024*1024);
    return `${mb.toFixed(1)} MB`;
  }


  function pickFileIcon(mimeType = '', filename = '') {
    const m = String(mimeType || '').toLowerCase();
    const ext = String(filename || '').split('.').pop()?.toLowerCase();

    // 1) MIME 기반 매핑
    if (m.startsWith('image/'))   return { icon: '🖼️', label: 'Image' };
    if (m === 'application/pdf')  return { icon: '📄', label: 'PDF' };
    if (m.includes('word'))       return { icon: '📝', label: 'Word' };
    if (m.includes('excel') || m.includes('spreadsheet'))
                                return { icon: '📈', label: 'Excel' };
    if (m.includes('powerpoint') || m.includes('presentation'))
                                return { icon: '📊', label: 'PowerPoint' };
    if (m.startsWith('text/'))    return { icon: '📄', label: 'Text' };
    if (m.includes('json'))       return { icon: '🧾', label: 'JSON' };
    if (m.startsWith('audio/'))   return { icon: '🎵', label: 'Audio' };
    if (m.startsWith('video/'))   return { icon: '🎬', label: 'Video' };
    if (m.includes('zip') || m.includes('compressed') || m.includes('gzip') || m.includes('tar'))
                                return { icon: '🗜️', label: 'Archive' };
    if (m === 'application/octet-stream')
                                return { icon: '📦', label: 'Binary' };

    // 2) 확장자 기반 보정(백엔드가 MIME을 못 주는 케이스)
    const byExt = {
      pdf: '📄', txt: '📄', md: '📄',
      png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', webp: '🖼️', svg: '🖼️',
      doc: '📝', docx: '📝',
      xls: '📈', xlsx: '📈', csv: '📈',
      ppt: '📊', pptx: '📊',
      zip: '🗜️', rar: '🗜️', '7z': '🗜️', gz: '🗜️', tar: '🗜️',
      mp3: '🎵', wav: '🎵', flac: '🎵',
      mp4: '🎬', mov: '🎬', avi: '🎬', mkv: '🎬',
      json: '🧾',
    };
    if (ext && byExt[ext]) {
      const labelMap = {
        '📄': 'Document', '🖼️': 'Image', '📝': 'Word',
        '📈': 'Spreadsheet', '📊': 'Presentation',
        '🗜️': 'Archive', '🎵': 'Audio', '🎬': 'Video', '🧾': 'JSON',
      };
      return { icon: byExt[ext], label: labelMap[byExt[ext]] || 'File' };
    }

    // 3) 기본값
    return { icon: '📁', label: 'File' };
  }


  function scrollPageToBottom(smooth = true) {
    let bottom = document.body.scrollHeight;
    window.scrollTo({
      top: bottom,
      behavior: smooth ? "smooth" : "auto",
    });
  }


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
            onClick={() => handleMarkUnRead(false)}
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
        <MessageSend onData={onData} compose={compose} setCompose={setCompose}/>
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
              className={`${styles.row} ${selected ? styles.selected : ''} ${m.unread ? styles.read : styles.unread}`}
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
                <div className={styles.sender_id}>{m.sender_id}</div>
                <div className={styles.fromEmail}>{m.fromEmail}</div>
              </div>
              <div className={styles.colSubject}>
                {
                  m.is_important ?
                    <div className={styles.subject}>
                      🚨 {m.subject}
                    </div> :
                    <div className={styles.subject}>
                      {m.subject}
                    </div>
                }
                
                <div className={styles.preview}>{m.content.slice(0, 80)}</div>
              </div>
              <div className={styles.colDate}>{formatDate(m.send_date)}</div>
              <div className={styles.colActions} onClick={(e) => e.stopPropagation()}>
                <button className={styles.linkBtn} type="button" onClick={() => openReply(m)}>답장</button>
                <button className={styles.linkBtn} type="button" onClick={() => {
                  // setSelectedIds(new Set([m.id]));
                  // handleDeleteSelected();
                  handelDeleteSingle(m.id)
                }}>삭제</button>
                <button className={styles.linkBtn} type="button" onClick={() => onUnRead(m.id)}>안읽음</button>
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
          handelDeleteSingle={handelDeleteSingle}
          readingId={readingId}
          fileId={fileId}
          formatFileSizeFromKB={formatFileSizeFromKB}
          pickFileIcon={pickFileIcon}
        />
      )}

      
    </div>
  );
}

function ReadingPane({ message, onClose, handelDeleteSingle, readingId, fileId, formatFileSizeFromKB, pickFileIcon }) {
  if (!message) return null;
  return (
    <div className={styles.readingPane}>
      <div className={styles.readingHeader}>
        <div>
          <div className={styles.readingSubject}>{message.subject}</div>
          <div className={styles.readingMeta}>
            From {message.sender_id} &lt;{message.fromEmail}&gt; · {formatDate(message.send_date)}
          </div>
        </div>
        <div className={styles.paneBtns}>
          
          <button className={`${styles.neutralBtn} ${styles.paneBtn}`} onClick={onClose} type="button">답장</button>
          <button className={`${styles.neutralBtn} ${styles.paneBtn}`} onClick={() => handelDeleteSingle(readingId)} type="button">삭제</button>
          <button className={`${styles.neutralBtn} ${styles.paneBtn}`} onClick={onClose} type="button"> ✖ </button>
        </div>
        
      </div>
      {
        fileId.length!==0 &&
        <div className={styles.messageFiles}>
          {
            fileId.map(items => 
              <Fragment>
                <a href={items.downloadUrl} rel="noreferrer">
                  {pickFileIcon(items.mimeType, items.originalName).icon} {items.originalName} ({formatFileSizeFromKB(items.size)})
                </a>
                <br/>
              </Fragment>
            )
          }
          
        </div>
      }
      
      <pre className={styles.readingContent}>{message.content}</pre>
    </div>
  );
}
