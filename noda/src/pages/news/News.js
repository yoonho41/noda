// src/components/News.js
import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";

/**
 * News.js
 * 간단한 뉴스 리스트 컴포넌트 (newsdata.io 최신 뉴스 API)
 *
 * ⚠️ 왜 주의? 공개 키를 그대로 클라이언트에 두면 유출 위험이 큼.
 *    실제 배포에서는 .env(예: REACT_APP_NEWS_API_KEY) 또는 서버 프록시 사용 권장.
 *
 * 사용법:
 *   <News />
 *   <News apiUrl="https://newsdata.io/api/1/latest?country=kr&apikey=YOUR_KEY" />
 */

const DEFAULT_API_URL =
  "https://newsdata.io/api/1/latest?country=kr&language=ko&category=Technology&apikey=pub_1b328706b87a4f57a107ec657df889f8";

function formatDate(isoString) {
  if (!isoString) return "-";
  try {
    const dt = new Date(isoString);
    return new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Seoul",
    }).format(dt);
  } catch {
    return isoString;
  }
}

function News({ apiUrl = DEFAULT_API_URL }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 왜 memo? apiUrl 변경 시에만 의존성 갱신
  const requestUrl = useMemo(() => apiUrl, [apiUrl]);

  async function fetchNews(signal) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(requestUrl, {
        signal,
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();

      // 예상 스키마: { status, results: [], totalResults, nextPage? }
      const list = Array.isArray(data?.results) ? data.results : [];
      setItems(list);
    } catch (err) {
      if (err.name === "AbortError") return; // 왜? 언마운트 시 불필요한 에러 방지
      setError(err.message || "요청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    fetchNews(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestUrl]);

  const handleRefresh = () => {
    const controller = new AbortController();
    fetchNews(controller.signal);
  };

  return (
    <section
      aria-busy={loading}
      style={{
        maxWidth: 800,
        // margin: "0 auto",
        padding: "16px",
        fontFamily:
          '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,"Apple Color Emoji","Segoe UI Emoji"',
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>📺 KR Tech News 10 </h2>
        <button
          onClick={handleRefresh}
          disabled={loading}
          style={{
            cursor: loading ? "not-allowed" : "pointer",
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: "6px 10px",
            background: "#f7f7f7",
          }}
          aria-label="새로고침"
        >
          {loading ? "로딩..." : "새로고침"}
        </button>
      </header>

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: 12,
            padding: 12,
            borderRadius: 8,
            background: "#fff5f5",
            border: "1px solid #ffd6d6",
          }}
        >
          <strong>에러:</strong> {error}{" "}
          <button onClick={handleRefresh} style={{ marginLeft: 8 }}>
            다시 시도
          </button>
        </div>
      )}

      {!error && !loading && items.length === 0 && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            border: "1px dashed #ddd",
            borderRadius: 8,
            textAlign: "center",
            color: "#666",
          }}
        >
          표시할 뉴스가 없습니다.
          <div style={{ marginTop: 8 }}>
            <button onClick={handleRefresh}>새로고침</button>
          </div>
        </div>
      )}

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {items.map((item, idx) => {
          const key =
            item?.article_id ||
            item?.link ||
            `${item?.title || "untitled"}-${item?.pubDate || idx}`;

          return (
            <li
              key={key}
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr",
                gap: 12,
                alignItems: "center",
                padding: "12px 0",
                borderBottom: "1px solid #eee",
              }}
            >
              {item?.image_url ? (
                <a
                  href={item?.link || "#"}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "block" }}
                >
                  <img
                    src={item.image_url}
                    alt={item.title || "뉴스 이미지"}
                    style={{
                      width: 120,
                      height: 80,
                      objectFit: "cover",
                      borderRadius: 8,
                      display: "block",
                    }}
                    loading="lazy"
                  />
                </a>
              ) : (
                <div
                  aria-hidden
                  style={{
                    width: 120,
                    height: 80,
                    borderRadius: 8,
                    background: "#f1f1f1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#aaa",
                    fontSize: 12,
                  }}
                >
                  no image
                </div>
              )}

              <div>
                <a
                  href={item?.link || "#"}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: "#111",
                    textDecoration: "none",
                    fontWeight: 600,
                    lineHeight: 1.3,
                  }}
                >
                  {item?.title || "(제목 없음)"}
                </a>

                <div style={{ marginTop: 6, color: "#555", fontSize: 13 }}>
                  <span>
                    {item?.source_id ? `출처: ${item.source_id}` : "출처 미상"}
                  </span>
                  <span style={{ margin: "0 6px" }}>·</span>
                  <time dateTime={item?.pubDate}>{formatDate(item?.pubDate)}</time>
                </div>

                {item?.description && (
                  <p style={{ marginTop: 6, color: "#333", fontSize: 14 }}>
                    {
                        (item?.description ?? '').length > 300
                        ? item.description.slice(0, 300).trimEnd() + '...'
                        : item?.description
                    }
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {loading && items.length === 0 && (
        <p style={{ marginTop: 8, color: "#666" }}>불러오는 중…</p>
      )}
    </section>
  );
}

News.propTypes = {
  apiUrl: PropTypes.string,
};

export default News;
