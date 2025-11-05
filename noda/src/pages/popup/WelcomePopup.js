// src/pages/WelcomePopup.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./WelcomePopup.css";
import { FaBell } from "react-icons/fa";

const WelcomePopup = ({ userId, onClose }) => {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    axios
      .get(`http://localhost:5000/api/alerts`, { params: { userId } })
      .then((res) => setAlerts(res.data.alerts || []))
      .catch((err) => console.error("알림 불러오기 실패:", err));
  }, [userId]);

  return (
    <div className="popup-overlay">
      <div className="popup-card">
        <div className="popup-icon">
          <FaBell />
        </div>
        <h2>AI 비서 알림</h2>

        {alerts.length > 0 ? (
          <div className="popup-content">
            {alerts.map((a, idx) => (
              <div key={idx} className={`popup-alert ${a.type}`}>
                <h4>{a.title}</h4>
                <ul>
                  {a.lines.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p>현재 새로운 알림이 없습니다.</p>
        )}

        <button className="popup-btn" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
};

export default WelcomePopup;
