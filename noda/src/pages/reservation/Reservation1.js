// src/pages/reservation/Reservation.js
/* eslint-env browser */
import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./Reservation.module.scss";

/** ---- Config & Utils ---- */
const ROOMS = ["A", "B", "C"];
const OPEN_MIN = 9 * 60;     // 09:00
const CLOSE_MIN = 21 * 60;   // 21:00
const STEP_MIN = 30;

function pad2(n) { return String(n).padStart(2, "0"); }
function toDateKey(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function fromDateKey(key) { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d); }
function minutesToHHMM(min) { const h = Math.floor(min / 60); const m = min % 60; return `${pad2(h)}:${pad2(m)}`; }
function overlaps(a, b) { return a.start < b.end && b.start < a.end; }
function sortByStart(a, b) { return a.start - b.start || a.end - b.end; }

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

/** ---- Local Storage Helpers ---- */
const LS_KEY = "reservation_data_v1";
function loadReservations() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch (_) {}
  const seed = {}; for (const r of ROOMS) seed[r] = {}; return seed;
}
function saveReservations(data) { try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (_) {} }

/** ---- Component ---- */
export default function Reservation() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [reservations, setReservations] = useState(loadReservations);
  const dateInputRef = useRef(null);

  useEffect(() => { saveReservations(reservations); }, [reservations]);

  const dateKey = useMemo(() => toDateKey(selectedDate), [selectedDate]);


  const [imgsrc, setImgsrc] = useState('');



  const dailyByRoom = useMemo(() => {
    const map = {};
    for (const room of ROOMS) {
      const dayList = (reservations[room]?.[dateKey] || []).slice().sort(sortByStart);
      map[room] = dayList;
    }
    return map;
  }, [reservations, dateKey]);

  const goPrevDay = () => setSelectedDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));
  const goNextDay = () => setSelectedDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));

  /** ---- Modal State ---- */
  const [modal, setModal] = useState({
    open: false,
    room: "",
    dateKey: "",
    selA: null,   // 첫 클릭 인덱스
    selB: null,   // 두 번째 클릭 인덱스
    title: "",
    owner: "",
    participants: "",
    note: "",
  });

  const showTimeStep = !!modal.room;
  const showInfoStep = modal.selA != null; // 왜: 1개 구간만 선택해도 정보입력 표시

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
  };
  const closeModal = () => {
    setModal(m => ({ ...m, open: false })); setImgsrc('');
  }

  /** ---- Disable logic for segments ---- */
function buildDisabledSet(room, dKey, anchorIdx) {
const disabled = new Set(); // index of SEGMENTS
const list = reservations[room]?.[dKey] || [];

// 1) KST 기준 오늘/현재 시각 판정
const { dateKey: todayKST, minutes: nowMinKST } = nowInKST();
const isPastDate = dKey < todayKST;     // YYYY-MM-DD 문자열 비교 가능
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

    // 오늘: 종료시각이 현재시각 이하이면 비활성 (예: now=11:14 → 09:00~11:00 비활성)
    if (isToday && seg.end <= nowMinKST) disabled.add(i);
}

// 4) 첫 클릭 이후: 첫 예약 시작 시각(cutoff)부터 전부 비활성(요구사항 반영)
if (anchorIdx != null) {
    const anchorStart = SEGMENTS[anchorIdx].start;
    let cutoff = Infinity;
    for (const res of list) {
    if (res.start >= anchorStart && res.start < cutoff) cutoff = res.start;
    }
    if (cutoff !== Infinity) {
    for (let i = 0; i < SEGMENTS.length; i++) {
        if (SEGMENTS[i].start >= cutoff) disabled.add(i);
    }
    }
}

return disabled;
}

  /** ---- Submit ---- */
  function trySubmit() {
    const { room, dateKey: dKey, selA, selB, title, owner, participants, note } = modal;
    if (!room) return alert("회의실을 선택하세요.");
    if (!dKey) return alert("날짜를 선택하세요.");
    if (selA == null) return alert("시간 구간을 선택하세요.");

    const minIdx = Math.min(selA, selB ?? selA);
    const maxIdx = Math.max(selA, selB ?? selA);
    const start = SEGMENTS[minIdx].start;
    const end = SEGMENTS[maxIdx].end;

    const list = (reservations[room]?.[dKey] || []).slice().sort(sortByStart);
    for (const it of list) if (overlaps({ start, end }, it)) return alert("선택한 시간이 기존 예약과 겹칩니다.");

    const newItem = {
      id: cryptoRandomId(),
      start, end,
      title: (title || "").trim() || "(제목 없음)",
      owner: (owner || "").trim(),
      participants: (participants || "").trim(),
      note: (note || "").trim(),
    };

    const next = { ...reservations };
    if (!next[room]) next[room] = {};
    if (!next[room][dKey]) next[room][dKey] = [];
    next[room][dKey] = [...next[room][dKey], newItem].sort(sortByStart);
    setReservations(next);
    closeModal();
  }

  function cryptoRandomId() {
    // 왜: 브라우저 표준 우선, 미지원 시 폴백
    if (typeof window !== "undefined" && window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /** ---- Render ---- */
  // 선택 요약(우측/중앙 용)
  const minIdx = modal.selA == null ? null : Math.min(modal.selA, modal.selB ?? modal.selA);
  const maxIdx = modal.selA == null ? null : Math.max(modal.selA, modal.selB ?? modal.selA);
  const summary =
    minIdx == null
      ? ""
      : `${minutesToHHMM(SEGMENTS[minIdx].start)} ~ ${minutesToHHMM(SEGMENTS[maxIdx].end)}`;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.dateNav}>
          <button className={styles.navBtn} onClick={goPrevDay} aria-label="이전 날짜">‹</button>
          <button
            className={styles.dateLabel}
            onClick={() => setTimeout(() => dateInputRef.current?.showPicker?.(), 0)}
            aria-label="날짜 선택"
          >
            {dateKey}
          </button>
          <button className={styles.navBtn} onClick={goNextDay} aria-label="다음 날짜">›</button>
          <input
            ref={dateInputRef}
            type="date"
            className={styles.hiddenDateInput}
            value={dateKey}
            onChange={(e) => setSelectedDate(fromDateKey(e.target.value))}
          />
        </div>
        <div className={styles.actions}>
          <button className={styles.primaryBtn} onClick={openModal}>예약하기</button>
        </div>
      </header>

      <section className={styles.roomsGrid}>
        {ROOMS.map((room) => (
          <article key={room} className={styles.roomCard}>
            <div className={styles.roomHeader}>
              <span className={styles.roomTitle}>
                회의실 {room} 
                {
                    room==='A' && 
                    <span className={styles.roomDetail}>7층 (4 ~ 6인)</span>
                }
                {
                    room==='B' && 
                    <span className={styles.roomDetail}>7층 (4 ~ 8인)</span>
                }
                {
                    room==='C' && 
                    <span className={styles.roomDetail}>8층 (6 ~ 10인)</span>
                }
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
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      {modal.open && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalTop}>
              <h2 className={styles.modalTitle}>회의실 예약</h2>
              <button className={styles.iconBtn} onClick={closeModal} aria-label="닫기">✕</button>
            </div>

            <div className={styles.modalLayout}>
              {/* Left: Room tabs (nav bar style) */}
              <aside className={styles.modalSidebar}>
                <div className={styles.sideHeader}>회의실 선택</div>
                <div className={styles.navTabs} role="tablist" aria-label="회의실 선택">
                  {ROOMS.map((r) => (
                    <button
                      key={r}
                      role="tab"
                      aria-selected={modal.room === r}
                      className={`${styles.navTab} ${modal.room === r ? styles.navTabActive : ""}`}
                      onClick={() => {
                        setModal(m => ({ ...m, room: r, selA: null, selB: null}));
                        if (r==='A') {
                            setImgsrc('https://campustown.snu.ac.kr/wp-content/uploads/2025/02/%EC%84%B1%EC%A7%84_%ED%9A%8C%EC%9D%98%EC%8B%A4.jpg')
                        } else if (r==='B') {
                            setImgsrc('	https://s3.qplace.kr/portfolio/4147/35440fd6b5623759789d3217cd1d60da_w800.webp')
                        } else if (r==='C') {
                            setImgsrc('https://campustown.snu.ac.kr/wp-content/uploads/2025/02/KakaoTalk_20211112_161507270_06-1-450x350.jpg')
                        }}
                      }
                    >
                      {r} 회의실
                    </button>
                  ))}
                </div>
                <div className={styles.roomImageDiv}>
                    <img src={imgsrc} className={styles.roomImage} alt=''/>
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
                    onChange={(e) =>
                      setModal(m => ({
                        ...m,
                        dateKey: e.target.value,
                        selA: null,
                        selB: null
                      }))
                    }
                  />
                </div>

                {!showTimeStep ? (
                  <div className={styles.helper}>좌측 탭에서 회의실을 먼저 선택하세요.</div>
                ) : (
                  <>
                    <div className={styles.timeScroll}>
                      <TimeGrid
                        selA={modal.selA}
                        selB={modal.selB}
                        onPick={(idx) => {
                          setModal(m => {
                            const disabled = buildDisabledSet(m.room, m.dateKey, m.selA);
                            if (disabled.has(idx)) return m; // 왜: 비활성은 무시
                            if (m.selA == null) return { ...m, selA: idx, selB: null };
                            if (m.selB == null) {
                              if (idx === m.selA) return { ...m, selA: null, selB: null };
                              return { ...m, selB: idx };
                            }
                            return { ...m, selA: idx, selB: null };
                          });
                        }}
                        disabledSet={buildDisabledSet(modal.room, modal.dateKey, modal.selA)}
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
                <div className={styles.segmentTitle}>정보입력</div>

                <div className={styles.formCol}>
                  <label className={styles.label}>회의 제목</label>
                  <input
                    type="text"
                    value={modal.title}
                    onChange={(e) => setModal(m => ({ ...m, title: e.target.value }))}
                    placeholder="새로운 일정"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formCol}>
                  <label className={styles.label}>개설자</label>
                  <input
                    type="text"
                    value={modal.owner}
                    onChange={(e) => setModal(m => ({ ...m, owner: e.target.value }))}
                    placeholder="개설자는 최대 1명"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formCol}>
                  <label className={styles.label}>참여자</label>
                  <input
                    type="text"
                    value={modal.participants}
                    onChange={(e) => setModal(m => ({ ...m, participants: e.target.value }))}
                    placeholder="쉼표(,)로 구분"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formCol}>
                  <label className={styles.label}>비고</label>
                  <textarea
                    value={modal.note}
                    onChange={(e) => setModal(m => ({ ...m, note: e.target.value }))}
                    placeholder="장비, 안내 등"
                    className={styles.textarea}
                    rows={3}
                  />
                </div>

                <div className={styles.modalActions}>
                  <button className={styles.ghostBtn} onClick={closeModal}>취소</button>
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
            const tip = `${minutesToHHMM(r.start)} ~ ${minutesToHHMM(r.end)} : ${r.title}`;

            return (
                <span
                key={r.id}
                className={styles.timelineSeg}
                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                data-tip={tip}
                tabIndex={0}                 // 키보드 포커스 시에도 툴팁 표시
                aria-label={tip}             // 스크린리더용
                role="img"                   // 장식적 요소 대안
                />
            );
        })}
      </div>
      <div className={styles.timelineScale}>
        {/* <span>09:00</span>
        <span>12:00</span>
        <span>15:00</span>
        <span>18:00</span>
        <span>21:00</span> */}

        <span>09:00</span>
        <span>10:00</span>
        <span>11:00</span>
        <span>12:00</span>
        <span style={{fontWeight: 'bolder', color:'black'}}>13:00</span>
        <span>14:00</span>
        <span>15:00</span>
        <span>16:00</span>
        <span>17:00</span>
        <span style={{fontWeight: 'bolder', color:'black'}}>18:00</span>
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
