import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./aiassi.css";
import { FaRobot } from "react-icons/fa";

const AiAssi = () => {
  const [message, setMessage] = useState("");
  const [chats, setChats] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [showAlerts, setShowAlerts] = useState(true);

  const chatEndRef = useRef(null);

  const userId = localStorage.getItem("userId");
  const teamId = localStorage.getItem("teamId") || "defaultTeam";

  useEffect(() => {
    if (!userId) {
      console.warn("⚠️ 로그인 정보 없음: userId가 설정되지 않았습니다.");
      return;
    }

    const hostApi =
      window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : `http://${window.location.hostname}:5000`;

    axios
      .get(`${hostApi}/api/ai/${userId}?teamId=${teamId}`)
      .then((res) => setChats(res.data))
      .catch((err) => console.error("대화 불러오기 실패:", err));
  }, [userId, teamId]);


  // 텍스트 포맷 (줄바꿈 + 강조)
  const formatText = (text) => {
    if (!text) return "";
    let formattedText = text.replace(/\n/g, "<br>");
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    return formattedText;
  };

  // DB에서 대화 불러오기
 useEffect(() => {
  // 환경별 API 주소 분기
 const hostApi =
   window.location.hostname === "localhost"
     ? "http://localhost:5000"
     : `http://${window.location.hostname}:5000`;
  // 실제 요청
  axios
    .get(`${hostApi}/api/ai/${userId}?teamId=${teamId}`)
    .then((res) => setChats(res.data))
    .catch((err) => console.error("대화 불러오기 실패:", err));
}, [userId, teamId]);


  
  useEffect(() => {
  // 더미 알림 데이터 (서버 없이 바로 표시)
  const dummyAlerts = [
    {
      type: "info",
      title: "AI 비서 환영 알림",
      lines: [`${userId}님, 오늘도 좋은 하루 되세요!`],
    },
    {
      type: "warning",
      title: "오늘 마감 업무",
      lines: ["보고서 제출 (D-day)", "팀 회의 준비 (D-1)"],
    },
    {
      type: "danger",
      title: "지연된 업무",
      lines: ["고객 피드백 정리 (2일 지연)"],
    },
  ];

  setAlerts(dummyAlerts);
  setShowAlerts(true);
}, [userId]);


  // 스크롤 자동 이동
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [chats]);

  // AI 응답 처리
  const processReply = (fullReply) => {
    const ACTION_TAG = "##ACTION##";
    const actionIndex = fullReply.indexOf(ACTION_TAG);
    let displayReply = fullReply;

    if (actionIndex !== -1) {
      displayReply = fullReply.substring(0, actionIndex).trim();
      try {
        const jsonString = fullReply.substring(actionIndex + ACTION_TAG.length).trim();
        const parsedAction = JSON.parse(jsonString);
        console.log("AI Action Extracted:", parsedAction);
      } catch (e) {
        console.error("JSON 파싱 오류:", e);
      }
    }
    return displayReply;
  };

  // 메시지 전송
  const sendMessage = async () => {
  if (!message.trim()) return;

  const currentMessage = message;
  const tempId = Date.now();
  const newChat = { user: currentMessage, ai: null, _id: tempId, loading: true };
  setChats((prev) => [...prev, newChat]);
  setMessage("");

  // 환경별 API 주소 분기
 const hostApi =
   window.location.hostname === "localhost"
     ? "http://localhost:5000"
     : `http://${window.location.hostname}:5000`;
     
console.log("📦 전송되는 데이터:", { message: currentMessage, userId, teamId });

  try {
    const res = await axios.post(`${hostApi}/api/ai`, {
      message: currentMessage,
      userId,
      teamId,
    });

    const fullReply = res.data.reply;
    const displayReply = processReply(fullReply);

    setChats((prev) =>
      prev.map((chat) =>
        chat._id === tempId
          ? {
              ...chat,
              ai: displayReply,
              loading: false,
              _id: res.data.chatId || tempId,
              map: res.data.map || null,
            }
          : chat
      )
    );
  } catch (err) {
    console.error("요청 실패:", err);
    setChats((prev) =>
      prev.map((chat) =>
        chat._id === tempId ? { ...chat, ai: "서버 연결 실패", loading: false } : chat
      )
    );
  }
};



const AlertBanner = () => (
  !showAlerts || alerts.length === 0 ? null : (
    <div className="alert-wrap">
      {alerts.map((a, idx) => (
        <div key={idx} className={`alert-box ${a.type}`}>
          <div className="alert-title">{a.title}</div>
          <ul className="alert-lines">
            {a.lines.map((line, i) => <li key={i}>{line}</li>)}
          </ul>
        </div>
      ))}
      <div className="alert-actions">
        <button onClick={() => setShowAlerts(false)}>닫기</button>
      </div>
    </div>
  )
);


  return (
    <div className="aiassi-container">
      <div className="chat-window">
        {chats.length > 0 ? (
          chats.map((c, i) => (
            <React.Fragment key={i}>
              <div className="chat-bubble user">
                <div className="bubble-content">{c.user}</div>
              </div>

              <div className="chat-bubble ai">
                <div className="ai-icon">
                  <FaRobot />
                </div>
                {c.ai === null || c.loading ? (
                <div className="bubble-content typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              ) : (
                <div
                  className="bubble-content"
                  dangerouslySetInnerHTML={{ __html: formatText(c.ai) }}
                />
              )}
              </div>
            </React.Fragment>
          ))
        ) : (
          <div className="placeholder">
            <img src="/assets/images/loginImage.svg" alt="AI" />
            <p>AI와 대화를 시작해보세요.</p>
          </div>
        )}
        <div ref={chatEndRef}></div>
      </div>

      <div className="aiassi-input-box">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="메시지를 입력하세요..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage}>보내기</button>
      </div>
    </div>
  );
};

export default AiAssi;
