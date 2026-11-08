import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory local leaderboard backup to ensure extreme stability & resilience (เสถียรภาพ)
// if the Google Apps Script URL fails or is unconfigured.
let localLogs: any[] = [
  {
    rank: 1,
    id: "stud-01",
    name: "วิทวัส แสนดี",
    role: "นักศึกษา ปวช.",
    status: "เรียนจบ",
    preScore: "2/5",
    postScore: "5/5",
    devResult: "ดีเยี่ยม (พัฒนาการก้าวกระโดด)",
    timestamp: "15/7/2026, 08:30:12"
  },
  {
    rank: 2,
    id: "stud-02",
    name: "จิรภัทร ชูเกียรติ",
    role: "นักศึกษา ปวช.",
    status: "เรียนจบ",
    preScore: "3/5",
    postScore: "4/5",
    devResult: "ผ่านการประเมิน (พัฒนาเพิ่มขึ้น)",
    timestamp: "15/7/2026, 08:35:45"
  },
  {
    rank: 3,
    id: "stud-03",
    name: "พงศธร รักษ์ดี",
    role: "นักศึกษา ปวช.",
    status: "กำลังเรียน",
    preScore: "1/5",
    postScore: "-",
    devResult: "กำลังพัฒนา",
    timestamp: "15/7/2026, 08:40:00"
  }
];

const GAS_URL = "https://script.google.com/macros/s/AKfycbzgFNpeWOVPJHK14H6En9DfaXwOpoYw2cwWPat7GSKODZmlQ7-pB9bzGm6Bc9nPRG4/exec";

// API endpoints
app.get("/api/leaderboard", async (req, res) => {
  try {
    // Try fetching from Google Apps Script with 4 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(GAS_URL, {
      method: "GET",
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (response.ok) {
      const result = await response.json();
      if (result && result.status === "success" && Array.isArray(result.data)) {
        // Filter out header row from Google Sheets if returned
        const cleanedData = result.data.filter((item: any) => 
          item && item.name && item.name !== "ชื่อ-นามสกุล" && item.id !== "ID"
        );
        // Merge local active logs to sheet results to show real-time stats
        const merged = [...cleanedData];
        localLogs.forEach(local => {
          if (!merged.some(m => m.id === local.id)) {
            merged.push(local);
          }
        });
        // Sort
        merged.sort((a, b) => {
          const scoreA = parseInt(a.postScore) || 0;
          const scoreB = parseInt(b.postScore) || 0;
          if (scoreB !== scoreA) return scoreB - scoreA;
          const preA = parseInt(a.preScore) || 0;
          const preB = parseInt(b.preScore) || 0;
          return preB - preA;
        });
        // Recalculate rank
        merged.forEach((item, idx) => {
          item.rank = idx + 1;
        });
        return res.json({ status: "success", data: merged });
      }
    }
    throw new Error("Invalid GAS response");
  } catch (error) {
    console.warn("Using local fallback leaderboard due to GAS fetch failure:", error);
    // Sort local logs
    localLogs.sort((a, b) => {
      const scoreA = parseInt(a.postScore) || 0;
      const scoreB = parseInt(b.postScore) || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      const preA = parseInt(a.preScore) || 0;
      const preB = parseInt(b.preScore) || 0;
      return preB - preA;
    });
    localLogs.forEach((item, idx) => {
      item.rank = idx + 1;
    });
    return res.json({ status: "success", data: localLogs, fallback: true });
  }
});

app.post("/api/log", async (req, res) => {
  const payload = req.body;
  console.log("Logging user activity payload:", payload);

  // Always update our local logs first for instant offline/CORS-safe resilience
  const existingIdx = localLogs.findIndex(log => log.id === payload.id);
  const formattedLog = {
    id: payload.id,
    name: payload.name,
    role: payload.role === "student" ? "นักศึกษา ปวช." : "ผู้ดูแลระบบ",
    status: payload.learningStatus === "completed" ? "เรียนจบ" : payload.learningStatus === "learning" ? "กำลังเรียน" : "ยังไม่เรียน",
    preScore: payload.preTestScore || "-",
    postScore: payload.postTestScore || "-",
    devResult: payload.developmentResult || "-",
    timestamp: new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })
  };

  if (existingIdx !== -1) {
    localLogs[existingIdx] = {
      ...localLogs[existingIdx],
      ...formattedLog,
      // Retain scores if the incoming payload is just a login/status change and doesn't overwrite scores
      preScore: payload.preTestScore !== undefined ? payload.preTestScore : localLogs[existingIdx].preScore,
      postScore: payload.postTestScore !== undefined ? payload.postTestScore : localLogs[existingIdx].postScore,
      devResult: payload.developmentResult !== undefined ? payload.developmentResult : localLogs[existingIdx].devResult,
    };
  } else {
    localLogs.push(formattedLog);
  }

  // Return response immediately to prevent frontend login / activity blocking
  res.json({ status: "success", source: "local_memory", message: "Saved in backend state" });

  // Sync to Google Apps Script in background without blocking client response
  fetch(GAS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5000)
  })
    .then(async (response) => {
      if (response.ok) {
        try {
          const result = await response.json();
          console.log("Background GAS sync succeeded:", result);
        } catch (e) {
          // Response may be text/html redirect
          console.log("Background GAS sync received response");
        }
      }
    })
    .catch((err) => {
      console.warn("Background GAS Sheet sync notice:", err.message || err);
    });
});

// Serve frontend SPA
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
