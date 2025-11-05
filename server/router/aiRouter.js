// [비서 업그레이드 버전: 기존 구조 유지 + 역할/맥락 강화]
const express = require("express");
const OpenAI = require("openai");
const Chat = require("../models/Chat");
const fetch = require("node-fetch");
const axios = require("axios");
const cheerio = require("cheerio");

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 공통 함수
const fetchWithTimeout = (url, options, timeout = 5000) =>
  Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("요청 시간이 초과되었습니다.")), timeout)
    ),
  ]);

const getCurrentDate = () => {
  const now = new Date();
  return now.toISOString().split("T")[0];
};

// [비서 업그레이드] 역할 프롬프트
const assistantProfilePrompt = `
당신은 'Noda'라는 기업용 일정관리 시스템의 전담 비서 AI입니다.
항상 침착하고 공손하게 대화하세요.
- 어투: 부드럽고 예의 있게 (“~해드릴게요”, “~하시면 됩니다”)
- 길이: 핵심만 2~4문장 내로 전달
- 목적: 사용자의 일정을 관리, 요약, 정리, 안내하는 것
- 금지: 감정적 표현, 불필요한 감탄, 잡담
- 주제: 일정, 업무, 출장, 회의, 메모, 날씨 등 실무 중심
- 포맷: 필요 시 bullet 형식으로 정리
- 당신은 사용자의 조수이며, 지나친 친근함 대신 실무적 신뢰감을 주는 말투로 응답
`;

// 네이버 날씨 스크래핑 API (원본 그대로 유지)
router.get("/weather", async (req, res) => {
  const location = req.query.loc || "서울";
  try {
    const url = `https://search.naver.com/search.naver?query=${encodeURIComponent(location + " 날씨")}`;
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    const $ = cheerio.load(data);
    const temperature = $(".temperature_text strong").text().trim();
    const weather = $(".temperature_info .weather").text().trim();
    const feelTemp = $(".summary_list .term:contains('체감') + .desc").text().trim();
    const rainProb = $(".summary_list .term:contains('강수확률') + .desc").text().trim();
    const wind = $(".summary_list .term:contains('바람') + .desc").text().trim();
    const humidity = $(".summary_list .term:contains('습도') + .desc").text().trim();

    res.json({
      location,
      weather: weather || "정보 없음",
      temperature: temperature || "정보 없음",
      feelTemp: feelTemp || "정보 없음",
      rainProb: rainProb || "정보 없음",
      wind: wind || "정보 없음",
      humidity: humidity || "정보 없음",
    });
  } catch (err) {
    console.error("네이버 날씨 스크래핑 실패:", err.message);
    res.status(500).json({ error: "날씨 정보를 가져오는 데 실패했습니다." });
  }
});

// AI 비서 대화 라우터
router.post("/", async (req, res) => {
  const baseURL = `${req.protocol}://${req.get("host")}`;

  try {
    const { message, userId = "testUser", teamId = "defaultTeam" } = req.body;
    if (!message) return res.status(400).json({ error: "message 필요" });

    let reply = "";
    const ACTION_TAG = "##ACTION##";
    let isAction = false;

    // [변경] 최근 대화 10개만 로드하여 맥락 강화
    const recentChats = await Chat.find({ userId, teamId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const history = recentChats
      .reverse()
      .map((chat) => [
        { role: "user", content: chat.user },
        { role: "assistant", content: chat.ai.split(ACTION_TAG)[0].trim() || "확인했습니다." },
      ])
      .flat();

    // 기존 systemPrompt와 병합
    const systemPrompt = `
${assistantProfilePrompt}

-------------------------
아래는 Noda 시스템용 내부 규칙입니다:
-------------------------
너는 'Noda'라는 기업용 일정/할 일 관리 AI 비서야.
업무성 대화 위주로 응답하고, 요청이 일정 관련이면 JSON을 붙인다.
${getCurrentDate()} 기준으로 날짜를 추론한다.
JSON 예: ##ACTION## {"action_type":"SCHEDULE","date":"YYYY-MM-DD","time":"HH:MM","description":"내용"}
`;

    // [요약 기능은 그대로 유지]
    if (/(요약|요약해줘|정리|대화 요약|기록 요약)/.test(message)) {
      const allChats = await Chat.find({ userId, teamId }).sort({ createdAt: 1 });
      const text = allChats.map((c) => `사용자: ${c.user}\nAI: ${c.ai}`).join("\n");
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.5,
        max_tokens: 400,
        messages: [
          { role: "system", content: assistantProfilePrompt },
          { role: "user", content: `다음은 ${userId}의 전체 대화 기록입니다.\n${text}\n\n요약해줘.` },
        ],
      });
      reply = completion.choices[0]?.message?.content || "요약 실패";
    }

    // [일반 대화]
    else {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.6, // 안정적 말투
        max_tokens: 600,
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: message },
        ],
      });

      reply = completion.choices[0]?.message?.content || "응답 없음";

      // 이하 기존 액션 처리/날씨 처리 그대로 유지
      const actionPattern = /##ACTION##\s*({.*})/s;
      const match = reply.match(actionPattern);
      isAction = !!match;

      if (isAction) {
        try {
          const parsedAction = JSON.parse(match[1]);
          const { action_type, location } = parsedAction;

          // [비서 확장 포인트] 추후 TODO/메모/회의 기록 연동 가능
          if ((action_type === "SCHEDULE" || action_type === "WEATHER") && location) {
            const weatherRes = await axios.get(`${baseURL}/api/ai/weather?loc=${encodeURIComponent(location)}`);
            const w = weatherRes.data;
            reply += `\n\n${w.location} 현재 날씨\n상태: ${w.weather}\n기온: ${w.temperature}\n체감: ${w.feelTemp}\n강수확률: ${w.rainProb}\n바람: ${w.wind}\n습도: ${w.humidity}`;
          }
        } catch (err) {
          console.error("ACTION JSON 파싱 오류:", err);
        }
      }
    }

    // DB 저장 (기존 그대로)
    const newChat = await Chat.create({ userId, teamId, user: message, ai: reply, isAction });
    res.json({ reply, chatId: newChat._id });
  } catch (err) {
    console.error("최종 오류 발생:", err);
    res.status(500).json({ error: "AI 요청 실패", detail: err.message });
  }
});

router.get("/:userId", async (req, res) => {
  try {
    const { teamId = "defaultTeam" } = req.query;
    const chats = await Chat.find({ userId: req.params.userId, teamId }).sort({ createdAt: 1 });
    res.json(chats);
  } catch (err) {
    console.error("대화 불러오기 실패:", err);
    res.status(500).json({ error: "대화 불러오기 실패" });
  }
});

module.exports = router;
