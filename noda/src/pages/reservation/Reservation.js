// src/pages/reservation/Reservation.js
/* eslint-env browser */
import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./Reservation.module.scss";
import reservationService from "../../services/reservationService"; // 왜: 일별 조회 API 사용(경로 필요 시 조정)
import axios from "axios";
import messageService from "../../services/messageService";

/** ---- Config & Utils ---- */
const ROOMS = ["A", "B", "C"];
const OPEN_MIN = 9 * 60; // 09:00
const CLOSE_MIN = 21 * 60; // 21:00
const STEP_MIN = 30;

// 각 회의실별 프리뷰 이미지
const ROOM_IMAGES = {
  A: "https://campustown.snu.ac.kr/wp-content/uploads/2025/02/%EC%84%B1%EC%A7%84_%ED%9A%8C%EC%9D%98%EC%8B%A4.jpg",
  B: "https://s3.qplace.kr/portfolio/4147/35440fd6b5623759789d3217cd1d60da_w800.webp",
  C: "https://campustown.snu.ac.kr/wp-content/uploads/2025/02/KakaoTalk_20211112_161507270_06-1-450x350.jpg",
};



function pad2(n) {
  return String(n).padStart(2, "0");
}
function toDateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function fromDateKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function minutesToHHMM(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${pad2(h)}:${pad2(m)}`;
}
function overlaps(a, b) {
  return a.start < b.end && b.start < a.end;
}
function sortByStart(a, b) {
  return a.start - b.start || a.end - b.end;
}

/** Segments (interval buttons) */
function buildSegments() {
  const segs = [];
  for (let t = OPEN_MIN; t < CLOSE_MIN; t += STEP_MIN) {
    segs.push({ start: t, end: t + STEP_MIN });
  }
  return segs;
}
const SEGMENTS = buildSegments();

function nowInKST() {
  // 왜: 사용자 로컬 타임존과 무관하게 KST 기준을 얻기 위해
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type) => parts.find((p) => p.type === type)?.value;
  const y = get("year");
  const m = get("month");
  const d = get("day");
  const h = parseInt(get("hour") || "0", 10);
  const minute = parseInt(get("minute") || "0", 10);

  return { dateKey: `${y}-${m}-${d}`, minutes: h * 60 + minute };
}

/** ---- Component ---- */
export default function Reservation() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const dateInputRef = useRef(null);
  const dateKey = useMemo(() => toDateKey(selectedDate), [selectedDate]);
  const [deletingId, setDeletingId] = useState(null);

  // 서버 데이터(메인 화면용)
  const [dailyByRoom, setDailyByRoom] = useState(() => ({
    A: [],
    B: [],
    C: [],
  }));
  const [loading, setLoading] = useState(false);

  // 모달 전용 데이터(모달의 dateKey 기준)
  const [modalDailyByRoom, setModalDailyByRoom] = useState(() => ({
    A: [],
    B: [],
    C: [],
  }));

  const [imgsrc, setImgsrc] = useState("");

  // --- Hover preview (공통) ---
  const [isHoveringRoom, setIsHoveringRoom] = useState(false);
  const [hoverSrc, setHoverSrc] = useState('');
  const [cursor, setCursor] = useState({ x: 0, y: 0 });



  const goPrevDay = () =>
    setSelectedDate(
      (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)
    );
  const goNextDay = () =>
    setSelectedDate(
      (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
    );

  /** ---- Modal State ---- */
  const [modal, setModal] = useState({
    open: false,
    room: "",
    dateKey: "",
    selA: null, // 첫 클릭 인덱스
    selB: null, // 두 번째 클릭 인덱스
    title: "",
    owner: "",
    participants: "",
    note: "",
  });

  const showTimeStep = !!modal.room;
  const showInfoStep = modal.selA != null; // 왜: 1개 구간만 선택해도 정보입력 표시
  const minIdx =
    modal.selA == null
      ? null
      : Math.min(modal.selA, modal.selB ?? modal.selA);
  const maxIdx =
    modal.selA == null
      ? null
      : Math.max(modal.selA, modal.selB ?? modal.selA);
  const summary =
    minIdx == null
      ? ""
      : `${minutesToHHMM(SEGMENTS[minIdx].start)} ~ ${minutesToHHMM(
          SEGMENTS[maxIdx].end
        )}`;






  /** ---- Fetch helpers ---- */
  async function fetchDaily(key) {
    // 왜: 서버 응답을 클라이언트 포맷(id 포함)으로 정규화
    setLoading(true);
    try {
      const data = await reservationService.getDailyReservations(key);
      const byRoom = data?.byRoom || {};
      const normalized = ROOMS.reduce((acc, r) => {
        const arr = (byRoom[r] || []).map((x) => ({
          ...x,
          id: x.id || x._id, // 왜: toJSON 미적용 대비
        }));
        acc[r] = arr.sort(sortByStart);
        return acc;
      }, {});
      setDailyByRoom(normalized);
    } catch (e) {
      console.error("[daily] fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchModalDaily(key) {
    // 왜: 모달 날짜가 메인 날짜와 다를 수 있어 별도 유지
    try {
      const data = await reservationService.getDailyReservations(key);
      const byRoom = data?.byRoom || {};
      const normalized = ROOMS.reduce((acc, r) => {
        const arr = (byRoom[r] || []).map((x) => ({
          ...x,
          id: x.id || x._id,
        }));
        acc[r] = arr.sort(sortByStart);
        return acc;
      }, {});
      setModalDailyByRoom(normalized);
    } catch (e) {
      console.error("[modal daily] fetch failed:", e);
      setModalDailyByRoom({ A: [], B: [], C: [] });
    }
  }

  useEffect(() => {
    fetchDaily(dateKey);
  }, [dateKey]);

  useEffect(() => {
    if (modal.open) {
      const key = modal.dateKey || dateKey;
      fetchModalDaily(key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal.open, modal.dateKey]);

  /** ---- Modal open/close ---- */
  const openModal = () => {
    setModal({
      open: true,
      room: "",
      dateKey: toDateKey(selectedDate),
      selA: null,
      selB: null,
      title: "",
      owner: "",
      participants: "",
      note: "",
    });
    setImgsrc("");
  };
  const closeModal = () => {
    setModal((m) => ({ ...m, open: false }));
    setImgsrc("");
  };

  /** ---- Disable logic for segments (서버 데이터 기반) ---- */
  function buildDisabledSet(existingList, dKey, anchorIdx) {
    const disabled = new Set(); // index of SEGMENTS
    const list = existingList || [];

    // 1) KST 기준 오늘/현재 시각 판정
    const { dateKey: todayKST, minutes: nowMinKST } = nowInKST();
    const isPastDate = dKey < todayKST; // YYYY-MM-DD 문자열 비교 가능
    const isToday = dKey === todayKST;

    // 2) 과거 날짜: 전부 비활성
    if (isPastDate) {
      for (let i = 0; i < SEGMENTS.length; i++) disabled.add(i);
      return disabled;
    }

    // 3) 예약 충돌 + (오늘) 현재시각 이전 종료 세그먼트 비활성
    for (let i = 0; i < SEGMENTS.length; i++) {
      const seg = SEGMENTS[i];

      // 기존 예약과 겹치면 비활성
      for (const res of list) {
        if (seg.start < res.end && seg.end > res.start) {
          disabled.add(i);
          break;
        }
      }

      // 오늘: 종료시각이 현재시각 이하이면 비활성
      if (isToday && seg.end <= nowMinKST) disabled.add(i);
    }

    // ********중요 알고리즘********
    // 4) 첫 클릭 이후: 양방향 컷오프 (시간 버튼을 비활성화해서 기존 예약과 중복되는 일을 사전에 방지함)
    if (anchorIdx != null) {
      const anchorStart = SEGMENTS[anchorIdx].start;
 
     // 4a) 정방향 컷오프: 앵커 이후 가장 이른 예약 시작부터 비활성
     let cutoffNextStart = Infinity;
     for (const res of list) {
       if (res.start >= anchorStart && res.start < cutoffNextStart) {
         cutoffNextStart = res.start;
       }
     }
     if (cutoffNextStart !== Infinity) {
       for (let i = 0; i < SEGMENTS.length; i++) {
         if (SEGMENTS[i].start >= cutoffNextStart) disabled.add(i);
       }
     }
 
     // 4b) 역방향 컷오프: 앵커 이전 가장 늦은 예약 종료까지 비활성
     // 왜: 14:00을 앵커로 잡았을 때, 바로 앞 예약이 13:00~13:30이면
     //     13:30 이하로 끝나는 모든 구간(= 13:00~13:30 포함, 그 이전 전부) 차단
     let cutoffPrevEnd = -Infinity;
     for (const res of list) {
       if (res.end <= anchorStart && res.end > cutoffPrevEnd) {
         cutoffPrevEnd = res.end;
       }
     }
     if (cutoffPrevEnd !== -Infinity) {
       for (let i = 0; i < SEGMENTS.length; i++) {
         if (SEGMENTS[i].end <= cutoffPrevEnd) disabled.add(i);
       }
     }

    }

    return disabled;
  }

  /** ---- Submit (DB 연동) ---- */
  async function trySubmit() {
    const {
      room,
      dateKey: dKey,
      selA,
      selB,
      title,
      owner,
      participants,
      note,
    } = modal;
    if (!room) return alert("회의실을 선택하세요.");
    if (!dKey) return alert("날짜를 선택하세요.");
    if (selA == null) return alert("시간 구간을 선택하세요.");

    const minIdx = Math.min(selA, selB ?? selA);
    const maxIdx = Math.max(selA, selB ?? selA);
    const start = SEGMENTS[minIdx].start;
    const end = SEGMENTS[maxIdx].end;

    // 왜: 사용자 경험 향상을 위해 서버 전 검증(실제 보장은 서버/스키마가 담당)
    const existing = modalDailyByRoom[room] || [];
    for (const it of existing) {
      if (overlaps({ start, end }, it)) {
        return alert("선택한 시간이 기존 예약과 겹칩니다.");
      }
    }

    try {
      // 왜: 서비스 addReservation은 then/return 미보장 → 직접 axios 호출로 await 보장
      await axios.post("/api/reservation", {
        room,
        dateKey: dKey,
        start,
        end,
        title: (title || "").trim() || "(제목 없음)",
        owner: (owner || "").trim(),
        participants: (participants || "").trim(),
        note: (note || "").trim(),
      });


      const participantsArr = participants.split(',');
      for (let i=0; i<participantsArr.length; i++) {
        participantsArr[i] = participantsArr[i].trim()

        const timeToString = (minute) => {
          const hh = Math.floor(minute/60)
          const mm = minute - hh*60
          if (hh<10) {
            if (mm===0) {
              return '0'+hh+':00'
            } else {
              return '0'+hh+':'+mm
            }
          } else {
            if (mm===0) {
              return hh+':00'
            } else {
              return hh+':'+mm
            }
          }
        }


        const payload = {
          
          // no: 서버에서 auto-increment
          sender_id: (owner || "").trim(),
          receiver_id: (participantsArr[i] || "").trim(),
          subject: '회의실이 예약되었습니다.',
          content: `${room} 회의실이 예약되었습니다.\n예약자 : ${owner}\n날짜 : ${dKey}\n시간 : ${timeToString(start)} ~ ${timeToString(end)}\n참여자 : ${participants}
          `,
          send_date: new Date().toISOString(),
          read_date: null,
          reply: 0,
          is_read: false,
          is_deleted_by_sender: false,
          is_deleted_by_receiver: false,
          is_important: false,
    
        }
        await messageService.addMessage(payload)

      }






      // 성공 후 최신화(메인/모달 모두)
      await Promise.all([
        fetchDaily(dateKey),
        dKey !== dateKey ? fetchModalDaily(dKey) : Promise.resolve(),
      ]);

      closeModal();
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "예약에 실패했습니다.";
      alert(msg); // 왜: 최소한의 오류 피드백
      console.error("[reservation:create] failed:", e);
    }
  }

  // 왜: 서버 삭제 후 목록 일관성 보장
  const handleDelete = async (room, id) => {
    if (!id) return;
    if (!window.confirm('이 예약을 삭제할까요?')) return;
    try {
      setDeletingId(id);
      await axios.delete(`/api/reservation/${id}`);
      await fetchDaily(dateKey); // 현재 날짜 목록 갱신
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || '삭제에 실패했습니다.';
      alert(msg);
      console.error('[reservation:delete] failed:', e);
    } finally {
      setDeletingId(null);
    }
  };



  /** ---- Render ---- */
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.dateNav}>
          <button
            className={styles.navBtn}
            onClick={goPrevDay}
            aria-label="이전 날짜"
          >
            ‹
          </button>
          <button
            className={styles.dateLabel}
            onClick={() =>
              setTimeout(() => dateInputRef.current?.showPicker?.(), 0)
            }
            aria-label="날짜 선택"
          >
            {dateKey}
          </button>
          <button
            className={styles.navBtn}
            onClick={goNextDay}
            aria-label="다음 날짜"
          >
            ›
          </button>
          <input
            ref={dateInputRef}
            type="date"
            className={styles.hiddenDateInput}
            value={dateKey}
            onChange={(e) => setSelectedDate(fromDateKey(e.target.value))}
          />
        </div>
        <div className={styles.actions}>
          <button className={styles.primaryBtn} onClick={openModal}>
            예약하기
          </button>
        </div>
      </header>

      <section className={styles.roomsGrid}>
        {ROOMS.map((room) => (
          <article key={room} className={styles.roomCard}>
            <div className={styles.roomHeader}>
              

              <span className={styles.roomTitle}>
                {room === "A" && (
                  <span style={{color:'orange'}}>●</span>
                )}
                {room === "B" && (
                  <span style={{color:'rgba(90, 88, 206, 1)'}}>●</span>
                )}
                {room === "C" && (
                  <span style={{color:'rgba(30, 148, 144, 1)'}}>●</span>
                )}
                &nbsp;&nbsp;
                <span
                  className={styles.roomLabel}
                  onMouseEnter={(e) => {
                   setIsHoveringRoom(true);
                    setHoverSrc(ROOM_IMAGES[room]);
                    setCursor({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseLeave={() => setIsHoveringRoom(false)}
                  onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY })}
                >
                   회의실 {room}
                </span>

                {room === "A" && (
                  <span className={styles.roomDetail}>7층 (4 ~ 6인)</span>
                )}
                {room === "B" && (
                  <span className={styles.roomDetail}>7층 (4 ~ 8인)</span>
                )}
                {room === "C" && (
                  <span className={styles.roomDetail}>8층 (6 ~ 10인)</span>
                )}
              </span>

              <span className={styles.roomSub}> {dateKey}</span>
            </div>

            <TimelineBar items={dailyByRoom[room]} />

            <ul className={styles.reservationList}>
              {dailyByRoom[room].length === 0 && (
                <li className={styles.empty}>예약이 없습니다.</li>
              )}
              

              {dailyByRoom[room].map((r) => (
                <li key={r.id} className={styles.reservationItem}>
                  <div className={styles.time}>
                    {minutesToHHMM(r.start)} - {minutesToHHMM(r.end)}
                  </div>
                  <div className={styles.meta}>
                    <div className={styles.title}>{r.title}</div>
                    <div className={styles.sub}>
                      예약자: {r.owner || "-"} {r.participants ? `· 참여자: ${r.participants}` : ""}
                    </div>
                  </div>
                  <button
                    className={styles.deleteBtn}
                    title="예약 삭제"
                    onClick={() => handleDelete(room, r.id)}
                    disabled={deletingId === r.id}
                    aria-label="예약 삭제"
                  >
                    {deletingId === r.id ? '삭제중…' : '삭제'}
                  </button>
                </li>
              ))}


            </ul>
          </article>
        ))}
      </section>

      {/* Hover 프리뷰 이미지 (A/B/C 공통) */}
      {isHoveringRoom && hoverSrc && (
        <img
          className={styles.hoverPreview}
          src={hoverSrc}
          alt=""
          style={{ left: `${cursor.x}px`, top: `${cursor.y}px` }}
        />
      )}





      {modal.open && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalTop}>
              <div>
                <h2 className={styles.modalTitle}>
                  회의실 예약 
                </h2>
                <span className={styles.modalTimeSpan}>
                  &nbsp;{nowInKST().dateKey}&nbsp;&nbsp;
                  {
                    (Math.floor(nowInKST().minutes/60) < 10) ?
                    '0'+Math.floor(nowInKST().minutes/60) : Math.floor(nowInKST().minutes/60)
                  }
                  :{nowInKST().minutes - (Math.floor(nowInKST().minutes/60)*60)}
                  
                </span>
              </div>
              
              <button
                className={styles.iconBtn}
                onClick={closeModal}
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            <div className={styles.modalLayout}>
              {/* Left: Room tabs (nav bar style) */}
              <aside className={styles.modalSidebar}>
                <div className={styles.sideHeader}>회의실 선택</div>
                <div
                  className={styles.navTabs}
                  role="tablist"
                  aria-label="회의실 선택"
                >
                  {ROOMS.map((r) => (
                    <button
                      key={r}
                      role="tab"
                      aria-selected={modal.room === r}
                      className={`${styles.navTab} ${
                        modal.room === r ? styles.navTabActive : ""
                      }`}
                      onClick={() => {
                        setModal((m) => ({
                          ...m,
                          room: r,
                          selA: null,
                          selB: null,
                        }));
                        if (r === "A") {
                          setImgsrc(
                            "https://campustown.snu.ac.kr/wp-content/uploads/2025/02/%EC%84%B1%EC%A7%84_%ED%9A%8C%EC%9D%98%EC%8B%A4.jpg"
                          );
                        } else if (r === "B") {
                          setImgsrc(
                            "https://s3.qplace.kr/portfolio/4147/35440fd6b5623759789d3217cd1d60da_w800.webp"
                          );
                        } else if (r === "C") {
                          setImgsrc(
                            "https://campustown.snu.ac.kr/wp-content/uploads/2025/02/KakaoTalk_20211112_161507270_06-1-450x350.jpg"
                          );
                        }
                      }}
                    >
                      {r} 회의실
                    </button>
                  ))}
                </div>
                <div className={styles.roomImageDiv}>
                  <img src={imgsrc} className={styles.roomImage} alt="" />
                </div>
              </aside>

              {/* Middle: Date & Time */}
              <section className={styles.modalMiddle}>
                <div className={styles.sectionRow}>
                  <div className={styles.segmentTitle}>시간선택</div>
                  <input
                    type="date"
                    className={styles.inputDateInline}
                    disabled={!showTimeStep}
                    value={modal.dateKey}
                    onChange={(e) => {
                      const nextKey = e.target.value;
                      setModal((m) => ({
                        ...m,
                        dateKey: nextKey,
                        selA: null,
                        selB: null,
                      }));
                      fetchModalDaily(nextKey); // 왜: 비활성/충돌 계산 최신화
                    }}
                  />
                </div>

                {!showTimeStep ? (
                  <div className={styles.helper}>
                    좌측 탭에서 회의실을 먼저 선택하세요.
                  </div>
                ) : (
                  <>
                    <div className={styles.timeScroll}>
                      <TimeGrid
                        selA={modal.selA}
                        selB={modal.selB}
                        onPick={(idx) => {
                          setModal((m) => {
                            const list =
                              modalDailyByRoom[m.room] || []; // 왜: 서버 데이터 기반
                            const disabled = buildDisabledSet(
                              list,
                              m.dateKey,
                              m.selA
                            );
                            if (disabled.has(idx)) return m;
                            if (m.selA == null)
                              return { ...m, selA: idx, selB: null };
                            if (m.selB == null) {
                              if (idx === m.selA)
                                return { ...m, selA: null, selB: null };
                              return { ...m, selB: idx };
                            }
                            return { ...m, selA: idx, selB: null };
                          });
                        }}
                        disabledSet={buildDisabledSet(
                          modalDailyByRoom[modal.room] || [],
                          modal.dateKey,
                          modal.selA
                        )}
                      />
                    </div>

                    {showInfoStep && (
                      <div className={styles.selectionSummary}>
                        선택 구간: <strong>{summary}</strong>
                      </div>
                    )}
                  </>
                )}
              </section>

              {/* Right: Details (after any time selected) */}
              <section className={styles.modalRight} hidden={!showInfoStep}>
                {/* <div className={styles.segmentTitle}>정보입력</div> */}

                <div className={styles.formCol}>
                  <label className={styles.label}>회의 제목</label>
                  <input
                    type="text"
                    value={modal.title}
                    onChange={(e) =>
                      setModal((m) => ({ ...m, title: e.target.value }))
                    }
                    placeholder="새로운 일정"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formCol}>
                  <label className={styles.label}>개설자</label>
                  <input
                    type="text"
                    value={modal.owner}
                    onChange={(e) =>
                      setModal((m) => ({ ...m, owner: e.target.value }))
                    }
                    placeholder="개설자는 최대 1명"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formCol}>
                  <label className={styles.label}>참여자</label>
                  <input
                    type="text"
                    value={modal.participants}
                    onChange={(e) =>
                      setModal((m) => ({ ...m, participants: e.target.value }))
                    }
                    placeholder="쉼표(,)로 구분"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formCol}>
                  <label className={styles.label}>비고</label>
                  <textarea
                    value={modal.note}
                    onChange={(e) =>
                      setModal((m) => ({ ...m, note: e.target.value }))
                    }
                    placeholder="장비, 안내 등"
                    className={styles.textarea}
                    rows={3}
                  />
                </div>

                <div className={styles.modalActions}>
                  <button className={styles.ghostBtn} onClick={closeModal}>
                    취소
                  </button>
                  <button
                    className={styles.primaryBtn}
                    onClick={trySubmit}
                    disabled={!modal.room || !modal.dateKey || modal.selA == null}
                  >
                    예약하기
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** ---- Timeline Bar (09:00~21:00) ---- */
function TimelineBar({ items }) {
  const total = CLOSE_MIN - OPEN_MIN;
  return (
    <div className={styles.timelineWrap}>
      <div className={styles.timeline} aria-label="09:00~21:00 예약 타임라인">
        {items.map((r) => {
          const leftPct = Math.max(0, ((r.start - OPEN_MIN) / total) * 100);
          const widthPct = Math.max(0, ((r.end - r.start) / total) * 100);
          const tip = `${minutesToHHMM(r.start)} ~ ${minutesToHHMM(
            r.end
          )} : ${r.title}`;

          return (
            <span
              key={r.id}
              className={styles.timelineSeg}
              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
              data-tip={tip}
              tabIndex={0} // 키보드 포커스 시에도 툴팁 표시
              aria-label={tip} // 스크린리더용
              role="img" // 장식적 요소 대안
            />
          );
        })}
      </div>
      <div className={styles.timelineScale}>
        <span>09:00</span>
        <span>10:00</span>
        <span>11:00</span>
        <span>12:00</span>
        <span style={{ fontWeight: "bolder", color: "black" }}>13:00</span>
        <span>14:00</span>
        <span>15:00</span>
        <span>16:00</span>
        <span>17:00</span>
        <span style={{ fontWeight: "bolder", color: "black" }}>18:00</span>
        <span>19:00</span>
        <span>20:00</span>
        <span>21:00</span>
      </div>
    </div>
  );
}

/** ---- TimeGrid: 1열, interval labels ---- */
function TimeGrid({ selA, selB, onPick, disabledSet }) {
  const minIdx = selA == null ? null : Math.min(selA, selB ?? selA);
  const maxIdx = selA == null ? null : Math.max(selA, selB ?? selA);

  return (
    <div className={styles.timeGrid} role="listbox" aria-label="시간 구간 선택">
      {SEGMENTS.map((seg, idx) => {
        const disabled = disabledSet.has(idx);
        const selected = minIdx != null && idx >= minIdx && idx <= maxIdx;

        return (
          <button
            key={idx}
            className={[
              styles.timeBtn,
              disabled ? styles.timeBtnDisabled : "",
              selected ? styles.timeBtnSelected : "",
            ].join(" ")}
            onClick={() => !disabled && onPick(idx)}
            disabled={disabled}
            aria-pressed={selected}
            title={`${minutesToHHMM(seg.start)} ~ ${minutesToHHMM(seg.end)}`}
          >
            {minutesToHHMM(seg.start)} ~ {minutesToHHMM(seg.end)}
          </button>
        );
      })}
    </div>
  );
}
