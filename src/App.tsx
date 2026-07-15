import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { 
  BookOpen, 
  Award, 
  CheckCircle2, 
  HelpCircle, 
  Trophy, 
  LogOut, 
  Users, 
  Menu, 
  X, 
  Video, 
  ArrowRight, 
  Clock, 
  Gamepad2, 
  Check, 
  ChevronRight, 
  Search, 
  Sparkles, 
  RotateCcw, 
  Info,
  ShieldAlert,
  Compass,
  FileText
} from "lucide-react";
import { StudentProgress, UserRole, LearningStatus, LeaderboardRecord } from "./types";
import { 
  SUBJECT_INFO, 
  TABS_DATA, 
  PRE_TEST_QUESTIONS, 
  POST_TEST_QUESTIONS, 
  MATCHING_GAME_DATA, 
  HELP_GUIDE_DATA 
} from "./data";

export default function App() {
  // Session & User State
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: UserRole } | null>(null);
  const [learningStatus, setLearningStatus] = useState<LearningStatus>("not_started");
  
  // Scoring & Quiz State
  const [preTestScore, setPreTestScore] = useState<number | null>(null);
  const [postTestScore, setPostTestScore] = useState<number | null>(null);
  const [preTestDone, setPreTestDone] = useState<boolean>(false);
  const [postTestDone, setPostTestDone] = useState<boolean>(false);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<number>(1);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const [adminView, setAdminView] = useState<boolean>(false);
  const [leaderboardView, setLeaderboardView] = useState<boolean>(false);

  // Leaderboard & Real-time Search State
  const [leaderboard, setLeaderboard] = useState<LeaderboardRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState<string>("");

  // Quiz active index & timer
  const [quizMode, setQuizMode] = useState<"pre" | "post" | null>(null);
  const [currentQuizIndex, setCurrentQuizIndex] = useState<number>(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [quizTimer, setQuizTimer] = useState<number>(20);
  const [quizFeedback, setQuizFeedback] = useState<{ isCorrect: boolean; show: boolean; explanation: string } | null>(null);
  const [tempQuizAnswers, setTempQuizAnswers] = useState<number[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Interactive Game State
  const [shuffledTerms, setShuffledTerms] = useState<any[]>([]);
  const [shuffledDefs, setShuffledDefs] = useState<any[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [selectedDefId, setSelectedDefId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [gameScore, setGameScore] = useState<number>(0);
  const [gameComplete, setGameComplete] = useState<boolean>(false);

  // Sheet Worksheet State (Tabs 3,4,5,6)
  const [worksheetAnswers, setWorksheetAnswers] = useState<Record<number, { selected: number; isCorrect: boolean; checked: boolean }>>({});

  // Filtered leaderboard based on searchQuery
  const filteredLeaderboard = leaderboard.filter(item => {
    if (!searchQuery.trim()) return true;
    return item.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Calculate stats and student lists for Admin views
  const getAdminStats = () => {
    const studentsList = leaderboard.map(record => ({
      rank: record.rank,
      id: record.name,
      name: record.name,
      status: record.status,
      preScore: record.preScore,
      postScore: record.postScore,
      devResult: record.devResult,
      timestamp: record.timestamp
    }));

    const total = studentsList.length;
    const completedCount = studentsList.filter(s => s.status === "เรียนจบ").length;

    let preSum = 0;
    let preCount = 0;
    let postSum = 0;
    let postCount = 0;

    studentsList.forEach(s => {
      const preVal = parseInt(s.preScore);
      if (!isNaN(preVal)) {
        preSum += preVal;
        preCount++;
      }
      const postVal = parseInt(s.postScore);
      if (!isNaN(postVal)) {
        postSum += postVal;
        postCount++;
      }
    });

    const avgPre = preCount > 0 ? (preSum / preCount).toFixed(1) : "0.0";
    const avgPost = postCount > 0 ? (postSum / postCount).toFixed(1) : "0.0";

    return {
      total,
      completedCount,
      avgPre,
      avgPost,
      students: studentsList
    };
  };

  // Fetch Leaderboard on mount and whenever user finishes a test
  const fetchLeaderboard = async () => {
    try {
      const res = await fetch("/api/leaderboard");
      if (res.ok) {
        const json = await res.json();
        if (json.status === "success" && json.data) {
          setLeaderboard(json.data);
        }
      }
    } catch (e) {
      console.error("Failed to load leaderboard:", e);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  // Sync state with localStorage to remember session
  useEffect(() => {
    const savedUser = localStorage.getItem("chatbot_user");
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setCurrentUser(parsed);
      
      // Load progress
      const savedStatus = localStorage.getItem(`chatbot_status_${parsed.id}`) as LearningStatus || "not_started";
      const savedPre = localStorage.getItem(`chatbot_pre_${parsed.id}`);
      const savedPost = localStorage.getItem(`chatbot_post_${parsed.id}`);
      
      setLearningStatus(savedStatus);
      if (savedPre !== null) {
        setPreTestScore(JSON.parse(savedPre));
        setPreTestDone(true);
      }
      if (savedPost !== null) {
        setPostTestScore(JSON.parse(savedPost));
        setPostTestDone(true);
      }
    }
  }, []);

  // Timer runner for Active Quiz
  useEffect(() => {
    if (quizMode && !quizFeedback?.show) {
      setQuizTimer(20);
      if (timerRef.current) clearInterval(timerRef.current);
      
      timerRef.current = setInterval(() => {
        setQuizTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleQuizAnswerSubmit(-1); // force submit on timeout
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quizMode, currentQuizIndex, quizFeedback]);

  // Handle Login
  const handleLogin = async (name: string, role: UserRole) => {
    if (!name.trim()) {
      Swal.fire({
        title: "กรุณากรอกข้อมูล",
        text: "กรุณาระบุ ชื่อ-นามสกุล ของท่านเพื่อเข้าเรียน",
        icon: "warning",
        background: "#0d131e",
        color: "#f8fafc",
        confirmButtonColor: "#06b6d4"
      });
      return;
    }

    setLoading(true);
    setLoadingText("กำลังยืนยันตัวตน...");

    const newId = "user_" + Math.random().toString(36).substring(2, 9);
    const userPayload = { id: newId, name: name.trim(), role };
    
    // Check if this student already has records in local state
    const savedPre = localStorage.getItem(`chatbot_pre_${newId}`);
    const savedPost = localStorage.getItem(`chatbot_post_${newId}`);
    
    const initialStatus = savedPre !== null ? "learning" : "not_started";
    
    try {
      const response = await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          id: newId,
          name: name.trim(),
          role,
          learningStatus: initialStatus,
          preTestScore: savedPre ? `${savedPre}/5` : "-",
          postTestScore: savedPost ? `${savedPost}/5` : "-",
          developmentResult: "เข้าสู่ระบบการเรียน",
          timestamp: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        setCurrentUser(userPayload);
        setLearningStatus(initialStatus as LearningStatus);
        localStorage.setItem("chatbot_user", JSON.stringify(userPayload));
        
        Swal.fire({
          title: "ยินดีต้อนรับ!",
          text: `ยินดีต้อนรับคุณ ${name.trim()} เข้าสู่บทเรียนการออกแบบและสร้าง Chat Bot`,
          icon: "success",
          background: "#0d131e",
          color: "#f8fafc",
          confirmButtonColor: "#06b6d4"
        });
        
        fetchLeaderboard();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    setLoadingText("กำลังบันทึกประวัติออกจากระบบ...");

    try {
      await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "logout",
          id: currentUser.id,
          name: currentUser.name,
          role: currentUser.role,
          learningStatus,
          preTestScore: preTestScore !== null ? `${preTestScore}/5` : "-",
          postTestScore: postTestScore !== null ? `${postTestScore}/5` : "-",
          developmentResult: "ออกจากระบบเรียบร้อย",
          timestamp: new Date().toISOString()
        })
      });
    } catch (e) {
      console.error(e);
    } finally {
      // Clear client state
      localStorage.removeItem("chatbot_user");
      setCurrentUser(null);
      setPreTestScore(null);
      setPostTestScore(null);
      setPreTestDone(false);
      setPostTestDone(false);
      setLearningStatus("not_started");
      setAdminView(false);
      setLeaderboardView(false);
      setQuizMode(null);
      setWorksheetAnswers({});
      setLoading(false);
      
      Swal.fire({
        title: "ออกจากระบบสำเร็จ",
        text: "ขอบคุณที่ตั้งใจศึกษาบทเรียนออนไลน์ค่ะ",
        icon: "info",
        background: "#0d131e",
        color: "#f8fafc",
        confirmButtonColor: "#06b6d4"
      });
      fetchLeaderboard();
    }
  };

  // Initialize Interactive Matching Game
  const initMatchingGame = () => {
    const terms = MATCHING_GAME_DATA.pairs.map(p => ({
      id: `${p.id}_t`,
      text: p.term,
      matchId: p.id,
      matched: false
    })).sort(() => Math.random() - 0.5);

    const defs = MATCHING_GAME_DATA.pairs.map(p => ({
      id: `${p.id}_d`,
      text: p.definition,
      matchId: p.id,
      matched: false
    })).sort(() => Math.random() - 0.5);

    setShuffledTerms(terms);
    setShuffledDefs(defs);
    setSelectedTermId(null);
    setSelectedDefId(null);
    setMatchedIds([]);
    setGameScore(0);
    setGameComplete(false);
  };

  // Run matching logic when choices selected
  const handleSelectCard = (id: string, type: "term" | "def") => {
    if (type === "term") {
      if (matchedIds.includes(shuffledTerms.find(t => t.id === id)?.matchId)) return;
      setSelectedTermId(id === selectedTermId ? null : id);
    } else {
      if (matchedIds.includes(shuffledDefs.find(d => d.id === id)?.matchId)) return;
      setSelectedDefId(id === selectedDefId ? null : id);
    }
  };

  useEffect(() => {
    if (selectedTermId && selectedDefId) {
      const termObj = shuffledTerms.find(t => t.id === selectedTermId);
      const defObj = shuffledDefs.find(d => d.id === selectedDefId);

      if (termObj && defObj) {
        if (termObj.matchId === defObj.matchId) {
          // Success match
          const matchId = termObj.matchId;
          setMatchedIds(prev => [...prev, matchId]);
          setGameScore(prev => prev + 20);
          
          Swal.fire({
            title: "จับคู่ถูกต้อง! 🎉",
            text: `คำศัพท์ "${termObj.text}" คู่กับ "${defObj.text}"`,
            icon: "success",
            toast: true,
            position: "top-end",
            timer: 1800,
            showConfirmButton: false,
            background: "#1e293b",
            color: "#38bdf8"
          });

          if (matchedIds.length + 1 === MATCHING_GAME_DATA.pairs.length) {
            setGameComplete(true);
            Swal.fire({
              title: "ยินดีด้วย! คุณผ่านภารกิจมินิเกม 🏆",
              text: "คุณสามารถจับคู่คำศัพท์การออกแบบแชทบอทครบสมบูรณ์ (รับคะแนนพิเศษ 100 คะแนนเต็ม!)",
              icon: "success",
              background: "#0d131e",
              color: "#f8fafc",
              confirmButtonColor: "#06b6d4"
            });
          }
        } else {
          // Failure match
          Swal.fire({
            title: "ยังไม่ถูกต้อง ❌",
            text: "ลองจับคู่ใหม่อีกครั้งนะคะ",
            icon: "error",
            toast: true,
            position: "top-end",
            timer: 1500,
            showConfirmButton: false,
            background: "#1e293b",
            color: "#f87171"
          });
        }
      }
      // Reset selected states
      setSelectedTermId(null);
      setSelectedDefId(null);
    }
  }, [selectedTermId, selectedDefId]);

  // Start Pre-test / Post-test
  const startQuiz = (mode: "pre" | "post") => {
    setQuizMode(mode);
    setCurrentQuizIndex(0);
    setSelectedOptionIndex(null);
    setQuizFeedback(null);
    setTempQuizAnswers([]);
    setQuizTimer(20);
  };

  // Submit Answer (with Feedback immediate)
  const handleQuizAnswerSubmit = (optionIdx: number) => {
    if (timerRef.current) clearInterval(timerRef.current);

    const questions = quizMode === "pre" ? PRE_TEST_QUESTIONS : POST_TEST_QUESTIONS;
    const currentQuestion = questions[currentQuizIndex];
    const isCorrect = optionIdx === currentQuestion.answerIndex;

    const newAnswers = [...tempQuizAnswers];
    newAnswers[currentQuizIndex] = optionIdx;
    setTempQuizAnswers(newAnswers);

    setQuizFeedback({
      isCorrect,
      show: true,
      explanation: currentQuestion.explanation
    });

    if (quizMode === "pre") {
      // In Pre-test: Feedback immediately with custom alerts
      Swal.fire({
        title: isCorrect ? "ถูกต้องเก่งมาก! 🌟" : "ยังไม่ถูกน้า 💡",
        html: `คุณตอบ: <b>${optionIdx === -1 ? "หมดเวลา" : currentQuestion.options[optionIdx]}</b><br/><br/>เฉลย: <b>${currentQuestion.options[currentQuestion.answerIndex]}</b><br/><br/>คำอธิบาย: ${currentQuestion.explanation}`,
        icon: isCorrect ? "success" : "info",
        background: "#0d131e",
        color: "#f8fafc",
        confirmButtonColor: "#06b6d4",
        confirmButtonText: "รับทราบและไปข้อต่อไป"
      });
    }
  };

  // Move to Next Quiz Question
  const handleNextQuizQuestion = async () => {
    const questions = quizMode === "pre" ? PRE_TEST_QUESTIONS : POST_TEST_QUESTIONS;
    
    if (currentQuizIndex < questions.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
      setSelectedOptionIndex(null);
      setQuizFeedback(null);
    } else {
      // Completed the quiz
      const finalScore = tempQuizAnswers.reduce((acc, currentSelected, idx) => {
        return acc + (currentSelected === questions[idx].answerIndex ? 1 : 0);
      }, 0);

      setLoading(true);
      setLoadingText("กำลังวิเคราะห์ประเมินผลคะแนน...");

      if (quizMode === "pre") {
        setPreTestScore(finalScore);
        setPreTestDone(true);
        setLearningStatus("learning");
        
        if (currentUser) {
          localStorage.setItem(`chatbot_pre_${currentUser.id}`, JSON.stringify(finalScore));
          localStorage.setItem(`chatbot_status_${currentUser.id}`, "learning");
          
          try {
            await fetch("/api/log", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "save_pre_test",
                id: currentUser.id,
                name: currentUser.name,
                role: currentUser.role,
                learningStatus: "learning",
                preTestScore: `${finalScore}/5`,
                postTestScore: "-",
                developmentResult: "ทำแบบทดสอบก่อนเรียนสำเร็จ",
                timestamp: new Date().toISOString()
              })
            });
          } catch (e) {
            console.error(e);
          }
        }

        Swal.fire({
          title: "สอบก่อนเรียนสำเร็จ! 🏆",
          html: `<div class="text-center">
            <p class="text-lg">คุณได้คะแนน: <strong class="text-cyan-400 text-2xl">${finalScore} / 5</strong> คะแนน</p>
            <p class="mt-3 text-slate-300">ระบบได้ปลดล็อกหน้าหาบทเรียน 8 หน่วยการเรียนรู้ และมินิเกมให้คุณศึกษาทดลองเรียบร้อยแล้วค่ะ!</p>
          </div>`,
          icon: "success",
          background: "#0d131e",
          color: "#f8fafc",
          confirmButtonColor: "#06b6d4",
          confirmButtonText: "เริ่มเรียนรู้กันเลย!"
        });
      } else {
        // Post Test Complete
        setPostTestScore(finalScore);
        setPostTestDone(true);
        setLearningStatus("completed");

        // Calculate progress & metrics
        let devResultText = "";
        const pre = preTestScore !== null ? preTestScore : 0;
        
        if (finalScore > pre) {
          devResultText = "มีพัฒนาการเพิ่มขึ้นอย่างชัดเจน (พัฒนาดีขึ้น)";
        } else if (finalScore === pre) {
          devResultText = "ระดับความรู้อยู่ในเกณฑ์คงที่ (คุณภาพคงเดิม)";
        } else {
          devResultText = "ระดับคะแนนคลาดเคลื่อน (ควรศึกษาเพิ่มเติมอีกรอบ)";
        }

        if (currentUser) {
          localStorage.setItem(`chatbot_post_${currentUser.id}`, JSON.stringify(finalScore));
          localStorage.setItem(`chatbot_status_${currentUser.id}`, "completed");
          
          try {
            await fetch("/api/log", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "save_post_test",
                id: currentUser.id,
                name: currentUser.name,
                role: currentUser.role,
                learningStatus: "completed",
                preTestScore: `${pre}/5`,
                postTestScore: `${finalScore}/5`,
                developmentResult: devResultText,
                timestamp: new Date().toISOString()
              })
            });
          } catch (e) {
            console.error(e);
          }
        }

        Swal.fire({
          title: "สอบหลังเรียนสำเร็จ! 🎉",
          html: `<div class="text-center">
            <p class="text-lg">คุณได้คะแนนสอบหลังเรียน: <strong class="text-emerald-400 text-2xl">${finalScore} / 5</strong> คะแนน</p>
            <p class="text-sm mt-1 text-slate-400">เปรียบเทียบก่อนเรียน (${pre}/5) - พัฒนาการ: ${devResultText}</p>
            <p class="mt-3 text-slate-200">คุณสามารถเข้าดูสถิติ บันทึกใบความรู้ หรือประลองเกมทบทวนได้ตลอดเวลา!</p>
          </div>`,
          icon: "success",
          background: "#0d131e",
          color: "#f8fafc",
          confirmButtonColor: "#06b6d4"
        });
      }

      setQuizMode(null);
      setLoading(false);
      fetchLeaderboard();
    }
  };

  // Worksheet Submission inside Tabs 3, 4, 5, 6
  const handleWorksheetSubmit = (tabId: number, selectedIndex: number, correctIdx: number) => {
    const isCorrect = selectedIndex === correctIdx;
    setWorksheetAnswers(prev => ({
      ...prev,
      [tabId]: {
        selected: selectedIndex,
        isCorrect,
        checked: true
      }
    }));

    if (isCorrect) {
      Swal.fire({
        title: "ยอดเยี่ยมมาก! 🎉",
        text: "คุณตอบคำถามวิเคราะห์ใบงานได้ถูกต้องสำเร็จ!",
        icon: "success",
        background: "#0d131e",
        color: "#f8fafc",
        confirmButtonColor: "#10b981"
      });
    } else {
      Swal.fire({
        title: "เกือบถูกแล้วนะ 💡",
        text: "วิเคราะห์เงื่อนไขหรือข้อมูลทบทวนอีกครั้งนะ!",
        icon: "error",
        background: "#0d131e",
        color: "#f8fafc",
        confirmButtonColor: "#ef4444"
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-100 font-sans flex flex-col relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Background radial overlays */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Login Screen */}
      {!currentUser && (
        <div className="flex-1 flex flex-col justify-center items-center px-4 py-12">
          
          {/* Main Title Banner with Glow effect */}
          <div className="max-w-2xl w-full text-center mb-8">
            <span className="px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest bg-white/5 border border-white/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
              ระบบเรียนรู้ผ่านเว็บ 24 ชั่วโมง
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold mt-4 tracking-tight leading-tight text-cyan-100">
              บทเรียนออนไลน์
            </h1>
            <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 bg-clip-text text-transparent mt-2">
              {SUBJECT_INFO.topic}
            </h2>
            <div className="flex flex-wrap justify-center gap-2 mt-4 text-xs sm:text-sm text-gray-400 font-medium">
              <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-full">{SUBJECT_INFO.level}</span>
              <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-full">{SUBJECT_INFO.subject}</span>
            </div>
          </div>

          {/* Login Glass Panel */}
          <div className="w-full max-w-md bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden mb-12">
            {/* Glass Glow Shine Effect */}
            <div className="absolute -top-[100%] left-[-50%] w-[200%] h-[100%] bg-gradient-to-b from-transparent via-white/[0.03] to-transparent rotate-[35deg] pointer-events-none"></div>
            
            <h3 className="text-xl font-bold text-cyan-100 mb-6 flex items-center gap-2">
              <Compass className="text-cyan-400 animate-pulse" size={24} />
              ลงชื่อเข้าสู่หน่วยการเรียน
            </h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const name = formData.get("name") as string;
              const role = formData.get("role") as UserRole;
              handleLogin(name, role);
            }}>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">ชื่อ - นามสกุล ของผู้เรียน</label>
                  <input 
                    name="name"
                    type="text" 
                    placeholder="เช่น สมชาย มีความสุข" 
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">บทบาทผู้ใช้งาน</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="relative flex items-center justify-center p-3 rounded-xl border border-white/10 bg-white/5 cursor-pointer hover:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-400 transition-all">
                      <input 
                        type="radio" 
                        name="role" 
                        value="student" 
                        defaultChecked 
                        className="sr-only peer"
                      />
                      <span className="peer-checked:text-cyan-400 font-semibold text-sm text-gray-400">นักศึกษา ปวช.</span>
                      <div className="absolute inset-0 rounded-xl border-2 border-transparent peer-checked:border-cyan-500 pointer-events-none transition-all"></div>
                    </label>

                    <label className="relative flex items-center justify-center p-3 rounded-xl border border-white/10 bg-white/5 cursor-pointer hover:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-400 transition-all">
                      <input 
                        type="radio" 
                        name="role" 
                        value="admin" 
                        className="sr-only peer"
                      />
                      <span className="peer-checked:text-purple-400 font-semibold text-sm text-gray-400">ผู้ดูแลระบบ</span>
                      <div className="absolute inset-0 rounded-xl border-2 border-transparent peer-checked:border-purple-500 pointer-events-none transition-all"></div>
                    </label>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3.5 px-6 rounded-2xl shadow-[0_0_15px_rgba(6,182,212,0.4)] transition duration-200 transform hover:scale-[1.01] flex items-center justify-center gap-2 group cursor-pointer"
                >
                  เข้าสู่ระบบ
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logged In System Dashboard */}
      {currentUser && (
        <div className="flex-1 flex flex-col md:flex-row">
          
          {/* Mobile Navigation Header */}
          <header className="md:hidden bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <Compass className="text-cyan-400 animate-spin" size={20} />
              <span className="font-extrabold text-sm tracking-tight text-slate-200">
                {SUBJECT_INFO.subjectCode} | 
              </span>
              <span className="text-xs text-gray-400 truncate max-w-[120px]">{SUBJECT_INFO.topic}</span>
            </div>
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 transition focus:outline-none"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </header>

          {/* Sidebar Navigation Panel (Section 1.2) */}
          <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-slate-950 border-r border-slate-900 flex flex-col transition-transform duration-300 md:translate-x-0 md:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            
            {/* Desktop Brand Header */}
            <div className="p-6 border-b border-slate-900 hidden md:flex items-center gap-3 bg-slate-950/40">
              <div className="w-9 h-9 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20">
                <Compass className="text-cyan-400" size={20} />
              </div>
              <div>
                <span className="block text-[10px] font-extrabold text-cyan-400 uppercase tracking-widest leading-none">
                  {SUBJECT_INFO.subjectCode}
                </span>
                <span className="block text-xs font-bold text-slate-300 mt-1 truncate max-w-[170px]">
                  {SUBJECT_INFO.topic}
                </span>
              </div>
            </div>

            {/* Sidebar Main Nav Menu */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">เมนูการเรียนรู้</p>

              {/* 1. Pre Test Button */}
              <button 
                onClick={() => {
                  setAdminView(false);
                  setLeaderboardView(false);
                  if (!preTestDone) {
                    startQuiz("pre");
                  } else {
                    Swal.fire({
                      title: "คุณทำแบบทดสอบก่อนเรียนแล้ว",
                      text: `คะแนนของคุณคือ ${preTestScore}/5 สามารถเริ่มเรียนรู้บทเรียนได้เลยค่ะ`,
                      icon: "info",
                      background: "#0d131e",
                      color: "#f8fafc",
                      confirmButtonColor: "#06b6d4"
                    });
                  }
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${quizMode === "pre" ? "bg-cyan-500 text-slate-950 shadow-md" : preTestDone ? "text-emerald-400 hover:bg-slate-800/40" : "text-slate-300 hover:bg-slate-800"}`}
              >
                <div className="flex items-center gap-2.5">
                  <HelpCircle size={18} />
                  <span>1. แบบทดสอบก่อนเรียน</span>
                </div>
                {preTestDone ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Clock size={16} className="text-cyan-400 animate-pulse" />}
              </button>

              {/* 2. Lesson Units Tab Button */}
              <button 
                disabled={!preTestDone}
                onClick={() => {
                  setAdminView(false);
                  setLeaderboardView(false);
                  setQuizMode(null);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition ${!preTestDone ? "opacity-45 cursor-not-allowed" : "cursor-pointer"} ${!adminView && !quizMode && !leaderboardView ? "bg-slate-800 text-cyan-400 border-l-4 border-cyan-400" : "text-slate-300 hover:bg-slate-800"}`}
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen size={18} />
                  <span>2. แหล่งเรียนรู้ (8 หน่วย)</span>
                </div>
                {!preTestDone && <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full">🔐</span>}
              </button>

              {/* 3. Terminology Match Game */}
              <button 
                disabled={!preTestDone}
                onClick={() => {
                  setAdminView(false);
                  setLeaderboardView(false);
                  setQuizMode(null);
                  initMatchingGame();
                  setSidebarOpen(false);
                  
                  // Scroll to matching-game-section
                  setTimeout(() => {
                    const section = document.getElementById("matching-game-section");
                    if (section) {
                      section.scrollIntoView({ behavior: "smooth" });
                    }
                  }, 100);

                  Swal.fire({
                    title: "ภารกิจจับคู่คำศัพท์! 🎮",
                    text: "จับคู่คำศัพท์กับการวิเคราะห์ออกแบบบอทให้ถูกต้อง ได้รับคะแนนเต็ม 100!",
                    icon: "info",
                    background: "#0d131e",
                    color: "#f8fafc",
                    confirmButtonColor: "#06b6d4"
                  });
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition ${!preTestDone ? "opacity-45 cursor-not-allowed" : "cursor-pointer"} hover:bg-slate-800`}
              >
                <div className="flex items-center gap-2.5">
                  <Gamepad2 size={18} />
                  <span>3. มินิเกมจับคู่ทบทวน</span>
                </div>
                {!preTestDone && <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full">🔐</span>}
              </button>

              {/* 4. Post Test Button */}
              <button 
                disabled={!preTestDone}
                onClick={() => {
                  if (postTestDone) {
                    Swal.fire({
                      title: "คุณทำสอบหลังเรียนแล้ว",
                      text: `คะแนนของคุณคือ ${postTestScore}/5 ต้องการสอบเพื่อพัฒนาผลคะแนนอีกรอบใช่หรือไม่?`,
                      icon: "question",
                      showCancelButton: true,
                      confirmButtonText: "สอบใหม่อีกรอบ",
                      cancelButtonText: "ยกเลิก",
                      background: "#0d131e",
                      color: "#f8fafc",
                      confirmButtonColor: "#06b6d4"
                    }).then((result) => {
                      if (result.isConfirmed) {
                        startQuiz("post");
                      }
                    });
                  } else {
                    startQuiz("post");
                  }
                  setAdminView(false);
                  setLeaderboardView(false);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition ${!preTestDone ? "opacity-45 cursor-not-allowed" : "cursor-pointer"} ${quizMode === "post" ? "bg-emerald-500 text-slate-950 shadow-md" : postTestDone ? "text-emerald-400 hover:bg-slate-800" : "text-slate-300 hover:bg-slate-800"}`}
              >
                <div className="flex items-center gap-2.5">
                  <Award size={18} />
                  <span>4. แบบทดสอบหลังเรียน</span>
                </div>
                {postTestDone ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Clock size={16} className="text-slate-500" />}
              </button>

              {/* 5. Leaderboard Button */}
              <button 
                onClick={() => {
                  setLeaderboardView(true);
                  setAdminView(false);
                  setQuizMode(null);
                  setSidebarOpen(false);
                  fetchLeaderboard();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${leaderboardView ? "bg-cyan-500 text-slate-950 shadow-md" : "text-slate-300 hover:bg-slate-800"}`}
              >
                <div className="flex items-center gap-2.5">
                  <Trophy size={18} />
                  <span>5. ตารางอันดับ (Leaderboard)</span>
                </div>
              </button>

              {/* Administrator Only View Button (Section 1.3) */}
              {currentUser.role === "admin" && (
                <div className="pt-4 border-t border-slate-800/80 mt-4 space-y-1">
                  <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest px-3 mb-2">ผู้บริหารระบบ</p>
                  <button 
                    onClick={() => {
                      setAdminView(true);
                      setQuizMode(null);
                      setLeaderboardView(false);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${adminView ? "bg-purple-950 text-purple-300 border-l-4 border-purple-500" : "text-slate-300 hover:bg-slate-800"}`}
                  >
                    <Users size={18} className="text-purple-400" />
                    <span>แผงควบคุมหลัก (Admin)</span>
                  </button>
                </div>
              )}
            </nav>
            {/* Sidebar User Info & Footer buttons */}
            <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-950/60">
              
              {/* User Profile Summary */}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg text-slate-950 ${currentUser.role === 'admin' ? 'bg-gradient-to-tr from-purple-400 to-pink-400' : 'bg-gradient-to-tr from-cyan-400 to-blue-400'}`}>
                  {currentUser.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200 truncate max-w-[160px]">{currentUser.name}</h4>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    สถานะ: 
                    <strong className={learningStatus === 'completed' ? 'text-emerald-400' : 'text-yellow-400'}>
                      {learningStatus === 'completed' ? 'เรียนจบแล้ว' : 'กำลังเรียนรู้'}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                
                {/* Help Button (Section 1.2) */}
                <button 
                  onClick={() => setHelpOpen(true)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-2 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition border border-slate-700/60"
                >
                  <Info size={14} />
                  คู่มือใช้งาน
                </button>

                {/* Logout Button (Section 1.2) */}
                <button 
                  onClick={handleLogout}
                  className="bg-red-950/40 hover:bg-red-900/30 text-red-300 font-medium py-2 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition border border-red-900/40"
                >
                  <LogOut size={14} />
                  ออกจากระบบ
                </button>
              </div>
            </div>
          </aside>

          {/* Main Dashboard Panel Body Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
            
            {/* Locked Content Banner if student hasn't completed Pre-test */}
            {!preTestDone && !quizMode && (
              <div className="glass-panel rounded-3xl p-8 max-w-xl mx-auto text-center shadow-xl space-y-6 border border-yellow-500/30 shine-effect my-12">
                <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto text-yellow-400 border border-yellow-500/30">
                  <ShieldAlert size={32} className="animate-bounce" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-100">บทเรียนออนไลน์ยังไม่พร้อมใช้</h3>
                  <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                    เพื่อประโยชน์สูงสุดและการวัดผลความก้าวหน้าอย่างถูกต้องเป็นระบบ นักศึกษาจำเป็นต้องทำแบบทดสอบก่อนเรียนจำนวน 5 ข้อ ก่อนเข้าศึกษาบทเรียนทั้งหมด
                  </p>
                </div>
                <button 
                  onClick={() => startQuiz("pre")}
                  className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-slate-950 font-extrabold px-8 py-3.5 rounded-2xl cursor-pointer shadow-lg transition duration-200"
                >
                  เริ่มทำแบบทดสอบก่อนเรียน (Pre-test)
                </button>
              </div>
            )}

            {/* Active Quiz Overlay (Pre-test / Post-test View) */}
            {quizMode && (
              <div className="max-w-3xl mx-auto glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl relative border-t-4 border-cyan-400">
                
                {/* Header of Test */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                  <div>
                    <span className="text-[10px] font-bold uppercase px-3 py-1 bg-cyan-950/80 border border-cyan-800 text-cyan-300 rounded-full">
                      {quizMode === "pre" ? "Pre-test (ทดสอบก่อนเรียน)" : "Post-test (ทดสอบหลังเรียน)"}
                    </span>
                    <h3 className="text-lg font-bold text-slate-200 mt-2">ประเมินความรู้: {SUBJECT_INFO.topic}</h3>
                  </div>
                  
                  {/* Timer UI with alert state */}
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-sm font-bold ${quizTimer < 6 ? "bg-red-950/80 text-red-400 border-red-500 animate-pulse" : "bg-slate-900 border-slate-800 text-cyan-400"}`}>
                    <Clock size={16} />
                    <span>00:{quizTimer < 10 ? `0${quizTimer}` : quizTimer}</span>
                  </div>
                </div>

                {/* Progress dot indicators */}
                <div className="flex gap-2 mb-6">
                  {(quizMode === "pre" ? PRE_TEST_QUESTIONS : POST_TEST_QUESTIONS).map((_, index) => (
                    <div 
                      key={index} 
                      className={`h-2 flex-1 rounded-full transition-colors ${index === currentQuizIndex ? "bg-cyan-400" : index < currentQuizIndex ? "bg-emerald-500" : "bg-slate-800"}`}
                    ></div>
                  ))}
                </div>

                {/* Question Text */}
                <div className="mb-6">
                  <span className="text-xs text-slate-400 font-bold uppercase">คำถามข้อที่ {currentQuizIndex + 1} / 5</span>
                  <p className="text-lg sm:text-xl font-bold mt-2 text-slate-100">
                    {(quizMode === "pre" ? PRE_TEST_QUESTIONS : POST_TEST_QUESTIONS)[currentQuizIndex].question}
                  </p>
                </div>

                {/* Options List */}
                <div className="grid grid-cols-1 gap-3 mb-6">
                  {(quizMode === "pre" ? PRE_TEST_QUESTIONS : POST_TEST_QUESTIONS)[currentQuizIndex].options.map((option, index) => {
                    const isSelected = selectedOptionIndex === index;
                    const isCorrect = index === (quizMode === "pre" ? PRE_TEST_QUESTIONS : POST_TEST_QUESTIONS)[currentQuizIndex].answerIndex;
                    
                    let btnClass = "border-slate-800 bg-slate-900/50 hover:border-slate-700 text-slate-300";
                    if (quizFeedback?.show) {
                      if (isCorrect) {
                        btnClass = "border-emerald-500 bg-emerald-950/30 text-emerald-400 font-semibold";
                      } else if (isSelected) {
                        btnClass = "border-red-500 bg-red-950/30 text-red-400";
                      }
                    } else if (isSelected) {
                      btnClass = "border-cyan-400 bg-cyan-950/30 text-cyan-300 font-semibold";
                    }

                    return (
                      <button 
                        key={index}
                        disabled={quizFeedback?.show}
                        onClick={() => setSelectedOptionIndex(index)}
                        className={`w-full text-left p-4 rounded-2xl border text-sm transition-all duration-200 flex items-center justify-between ${btnClass} ${!quizFeedback?.show ? "cursor-pointer hover:-translate-y-[2px]" : "cursor-default"}`}
                      >
                        <span className="flex-1 pr-4">{index + 1}. {option}</span>
                        {quizFeedback?.show && isCorrect && <Check size={18} className="text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Submit / Action buttons */}
                <div className="flex justify-end pt-4 border-t border-slate-800/60">
                  {!quizFeedback?.show ? (
                    <button 
                      onClick={() => handleQuizAnswerSubmit(selectedOptionIndex !== null ? selectedOptionIndex : -1)}
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-6 py-2.5 rounded-xl cursor-pointer shadow transition"
                    >
                      ส่งคำตอบ
                    </button>
                  ) : (
                    <button 
                      onClick={handleNextQuizQuestion}
                      className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-6 py-2.5 rounded-xl cursor-pointer shadow transition flex items-center gap-1"
                    >
                      <span>{currentQuizIndex === 4 ? "วิเคราะห์ผลคะแนน" : "ข้อถัดไป"}</span>
                      <ChevronRight size={18} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Student Study Interface (Tabs 1-8) */}
            {preTestDone && !adminView && !quizMode && !leaderboardView && (
              <div className="space-y-6">
                
                {/* Visual Learning Metrics & Growth Assessment (Section 2.6) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Study Status */}
                  <div className="glass-panel rounded-2xl p-5 flex items-center gap-4 relative shine-effect">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                      <Compass size={24} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">สถานะปัจจุบัน</span>
                      <h4 className="text-lg font-bold text-slate-200 mt-1">
                        {learningStatus === "completed" ? (
                          <span className="text-emerald-400">เรียนจบวิชาสมบูรณ์ 🎓</span>
                        ) : (
                          <span className="text-cyan-400">อยู่ระหว่างศึกษา 📚</span>
                        )}
                      </h4>
                    </div>
                  </div>

                  {/* Pre & Post Test Scores comparison */}
                  <div className="glass-panel rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/30">
                      <Award size={24} />
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ความคุ้มค่า/พัฒนาการ</span>
                      <div className="flex items-center gap-4 mt-1">
                        <div>
                          <span className="text-xs text-slate-400 block">ก่อนเรียน:</span>
                          <span className="font-mono font-bold text-slate-200 text-sm">{preTestScore !== null ? `${preTestScore}/5` : "-"}</span>
                        </div>
                        <div className="text-slate-600">→</div>
                        <div>
                          <span className="text-xs text-slate-400 block">หลังเรียน:</span>
                          <span className="font-mono font-bold text-emerald-400 text-sm">{postTestScore !== null ? `${postTestScore}/5` : "-"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Growth Metrics Evaluation */}
                  <div className="glass-panel rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                      <Trophy size={24} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ระดับคุณภาพวิชาการ</span>
                      <h4 className="text-sm font-bold text-slate-200 mt-1">
                        {postTestScore === null ? (
                          <span className="text-slate-400">รอทำแบบทดสอบหลังเรียน</span>
                        ) : postTestScore === 5 ? (
                          <span className="text-yellow-400">ดีเยี่ยม (Excellent) 🏆</span>
                        ) : postTestScore === 4 ? (
                          <span className="text-cyan-400">ดีมาก (Very Good) ⭐</span>
                        ) : postTestScore === 3 ? (
                          <span className="text-slate-300">ผ่านเกณฑ์ (Passed) 👍</span>
                        ) : (
                          <span className="text-red-400">ควรทบทวนใหม่ (Retake) ⚠️</span>
                        )}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Subheading tab picker of lesson */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                    <BookOpen size={20} className="text-cyan-400" />
                    แผนผังหัวข้อหน่วยการเรียนรู้ (8 Tabs)
                  </h3>
                  <span className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded-md">
                    กำลังศึกษาข้อที่ {activeTab}
                  </span>
                </div>

                {/* Horizontal / Scrollable Tabs Selection (Section 2.2) */}
                <div className="flex overflow-x-auto gap-2 pb-3 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                  {TABS_DATA.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${isActive ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-md font-bold" : "bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-slate-800/80"}`}
                      >
                        {tab.title}
                      </button>
                    );
                  })}
                </div>

                {/* Active Tab Content Panel */}
                <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 relative border-t border-cyan-500/20 shadow-xl">
                  
                  {/* Tab Banner Detail */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                        <Compass size={20} />
                      </div>
                      <div>
                        <span className="text-[10px] text-cyan-400 uppercase font-extrabold tracking-wider bg-cyan-950/80 border border-cyan-800/40 px-2 py-0.5 rounded-full">
                          {TABS_DATA[activeTab - 1].badge}
                        </span>
                        <h4 className="text-xl font-bold text-slate-200 mt-1">{TABS_DATA[activeTab - 1].title}</h4>
                      </div>
                    </div>
                  </div>

                  {/* Descriptive text (supports markdown design blocks) */}
                  <div className="prose prose-invert max-w-none text-slate-300 space-y-4 text-sm sm:text-base leading-relaxed">
                    {/* Convert plain text simulation of lists with nice emojis to beautiful block grids */}
                    {TABS_DATA[activeTab - 1].content.split("\n\n").map((block, bIdx) => {
                      if (block.startsWith("###")) {
                        return <h3 key={bIdx} className="text-lg sm:text-xl font-bold text-cyan-400 pt-3">{block.replace("###", "").trim()}</h3>;
                      }
                      if (block.startsWith("*")) {
                        return (
                          <ul key={bIdx} className="list-disc pl-5 space-y-2 text-slate-300">
                            {block.split("\n").map((li, lIdx) => (
                              <li key={lIdx}>{li.replace("*", "").trim()}</li>
                            ))}
                          </ul>
                        );
                      }
                      return <p key={bIdx} className="text-slate-300 whitespace-pre-line">{block}</p>;
                    })}
                  </div>

                  {/* YouTube Embed Video if Present (Section 2.2 Tabs 2 & 7) */}
                  {TABS_DATA[activeTab - 1].videoUrl && (
                    <div className="space-y-3 mt-6">
                      <h5 className="text-sm font-bold text-cyan-300 flex items-center gap-1.5">
                        <Video size={16} />
                        สื่อวิดีโอประกอบการเรียนรู้ (YouTube Video)
                      </h5>
                      <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-800 shadow-md">
                        <iframe 
                          src={TABS_DATA[activeTab - 1].videoUrl} 
                          title="YouTube Video Player"
                          frameBorder="0" 
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                          allowFullScreen
                          className="w-full h-full"
                        ></iframe>
                      </div>
                    </div>
                  )}

                  {/* Interactive Worksheet / Q&A activity if Present (Tabs 3,4,5,6) */}
                  {TABS_DATA[activeTab - 1].worksheet && (
                    <div className="mt-8 border-t border-slate-800/80 pt-6 space-y-4">
                      <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 text-slate-300 space-y-2">
                        <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider flex items-center gap-1">
                          <Sparkles size={12} />
                          กิจกรรมวิเคราะห์โจทย์ใบความรู้
                        </span>
                        <p className="font-medium text-sm text-slate-200 italic">
                          {TABS_DATA[activeTab - 1].worksheet?.scenario}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-slate-300">
                          คำถาม: {TABS_DATA[activeTab - 1].worksheet?.question}
                        </p>

                        <div className="grid grid-cols-1 gap-2.5">
                          {TABS_DATA[activeTab - 1].worksheet?.choices.map((choice, cIdx) => {
                            const state = worksheetAnswers[activeTab];
                            const isSelected = state?.selected === cIdx;
                            const isCorrectAnswer = cIdx === TABS_DATA[activeTab - 1].worksheet?.correctIndex;

                            let choiceClass = "border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60 cursor-pointer";
                            if (state?.checked) {
                              if (isCorrectAnswer) {
                                choiceClass = "border-emerald-500 bg-emerald-950/20 text-emerald-400 pointer-events-none";
                              } else if (isSelected) {
                                choiceClass = "border-red-500 bg-red-950/20 text-red-400 pointer-events-none";
                              } else {
                                choiceClass = "border-slate-800 bg-slate-950/40 text-slate-500 pointer-events-none";
                              }
                            }

                            return (
                              <button
                                key={cIdx}
                                disabled={state?.checked}
                                onClick={() => handleWorksheetSubmit(activeTab, cIdx, TABS_DATA[activeTab - 1].worksheet!.correctIndex)}
                                className={`text-left p-3.5 rounded-xl border text-xs sm:text-sm transition-all duration-150 flex items-center justify-between ${choiceClass}`}
                              >
                                <span>{choice}</span>
                                {state?.checked && isCorrectAnswer && <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>

                        {/* Hint box if student gets stuck */}
                        {worksheetAnswers[activeTab]?.checked && (
                          <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-900/50 text-xs text-cyan-300/90 leading-relaxed flex items-start gap-2 animate-fadeIn">
                            <Info size={16} className="shrink-0 mt-0.5" />
                            <p><b>คำอธิบาย:</b> {TABS_DATA[activeTab - 1].worksheet?.hint}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Navigation Flow Controls */}
                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-6 mt-8">
                    <button
                      disabled={activeTab === 1}
                      onClick={() => setActiveTab(prev => Math.max(1, prev - 1))}
                      className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer transition"
                    >
                      ย้อนกลับ
                    </button>
                    
                    {activeTab < 8 ? (
                      <button
                        onClick={() => setActiveTab(prev => Math.min(8, prev + 1))}
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold cursor-pointer shadow transition"
                      >
                        บทถัดไป
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const container = document.getElementById("matching-game-section");
                          if (container) {
                            container.scrollIntoView({ behavior: "smooth" });
                          }
                          initMatchingGame();
                          Swal.fire({
                            title: "เริ่มประลองมินิเกมกัน! 🎮",
                            text: "ศึกษาครบ 8 บทเรียนเรียบร้อยแล้ว ลองทำเกมฝึกฝนและทดสอบหลังเรียนถัดไปค่ะ",
                            icon: "success",
                            background: "#0d131e",
                            color: "#f8fafc",
                            confirmButtonColor: "#06b6d4"
                          });
                        }}
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 px-5 py-2 rounded-xl text-xs sm:text-sm font-extrabold cursor-pointer shadow transition animate-bounce"
                      >
                        ศึกษาสำเร็จแล้ว! ไปทำภารกิจเกม →
                      </button>
                    )}
                  </div>
                </div>

                {/* Terminology Matching Game (Section 2.3 & 2.5) */}
                <div id="matching-game-section" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 relative border border-slate-800/80 shadow-xl">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-950/60 border border-indigo-900/60 px-3 py-1 rounded-full">
                      MINI GAME: ท้าดวลสมอง
                    </span>
                    <h4 className="text-xl font-bold text-slate-200 mt-2">{MATCHING_GAME_DATA.title}</h4>
                    <p className="text-sm text-slate-400 mt-1">{MATCHING_GAME_DATA.description}</p>
                  </div>

                  {/* Matching UI Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Left Column: Terms */}
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">คำศัพท์ (Terms)</p>
                      <div className="space-y-2">
                        {shuffledTerms.map((term) => {
                          const isMatched = matchedIds.includes(term.matchId);
                          const isSelected = selectedTermId === term.id;
                          
                          let btnClass = "border-slate-800 bg-slate-900/40 text-slate-300 hover:border-indigo-500/50 hover:bg-slate-900/60 cursor-pointer";
                          if (isMatched) {
                            btnClass = "border-emerald-500/50 bg-emerald-950/20 text-emerald-400/80 line-through opacity-60 pointer-events-none";
                          } else if (isSelected) {
                            btnClass = "border-indigo-400 bg-indigo-950/30 text-indigo-300 font-bold scale-[1.02] shadow-indigo-500/25 shadow-md";
                          }

                          return (
                            <button
                              key={term.id}
                              onClick={() => handleSelectCard(term.id, "term")}
                              className={`w-full text-left p-4 rounded-2xl border text-sm transition-all duration-200 ${btnClass}`}
                            >
                              {term.text}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right Column: Definitions */}
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">คำอธิบาย (Definitions)</p>
                      <div className="space-y-2">
                        {shuffledDefs.map((def) => {
                          const isMatched = matchedIds.includes(def.matchId);
                          const isSelected = selectedDefId === def.id;

                          let btnClass = "border-slate-800 bg-slate-900/40 text-slate-300 hover:border-purple-500/50 hover:bg-slate-900/60 cursor-pointer";
                          if (isMatched) {
                            btnClass = "border-emerald-500/50 bg-emerald-950/20 text-emerald-400/80 line-through opacity-60 pointer-events-none";
                          } else if (isSelected) {
                            btnClass = "border-purple-400 bg-purple-950/30 text-purple-300 font-bold scale-[1.02] shadow-purple-500/25 shadow-md";
                          }

                          return (
                            <button
                              key={def.id}
                              onClick={() => handleSelectCard(def.id, "def")}
                              className={`w-full text-left p-4 rounded-2xl border text-sm transition-all duration-200 ${btnClass}`}
                            >
                              {def.text}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Reset action and stats */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/80 pt-5 mt-4">
                    <div className="flex items-center gap-4 text-sm font-bold">
                      <span className="text-slate-400">ความสำเร็จในการจับคู่:</span>
                      <span className="text-emerald-400 font-mono text-base">{matchedIds.length} / 5 คู่</span>
                    </div>

                    <button
                      onClick={initMatchingGame}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1 transition cursor-pointer"
                    >
                      <RotateCcw size={14} />
                      สลับสุ่มและเริ่มเล่นใหม่
                    </button>
                  </div>
                </div>

                {/* Final Exam Section (Post-test Call-to-Action) */}
                {!postTestDone && (
                  <div className="glass-panel rounded-3xl p-6 sm:p-8 relative border-t-2 border-emerald-500/40 shadow-xl text-center space-y-4">
                    <h4 className="text-lg font-bold text-slate-200">🏁 ด่านสุดท้าย: พิชิตข้อสอบหลังเรียน (Post-test)</h4>
                    <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
                      ทำแบบทดสอบเพื่อตรวจสอบคะแนนเปรียบเทียบประเมินพัฒนาการของตนเองอย่างเป็นระบบ และบันทึกคะแนนสู่สารบรรณ Leaderboard
                    </p>
                    <button
                      onClick={() => startQuiz("post")}
                      className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold px-8 py-3 rounded-2xl cursor-pointer shadow-lg transition duration-200 transform hover:scale-105"
                    >
                      เริ่มทำข้อสอบหลังเรียน
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Leaderboard View (Only shown when logged in and leaderboardView is true) */}
            {leaderboardView && currentUser && (
              <div className="space-y-6">
                
                {/* Leaderboard Header Title */}
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="w-12 h-12 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-2xl flex items-center justify-center">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
                      ความสำเร็จวิชาการ (Academic Leaderboard)
                    </span>
                    <h3 className="text-2xl font-black text-slate-100 mt-1">ตารางอันดับคะแนนสูงสุด</h3>
                  </div>
                </div>

                {/* Top 3 Podiums */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                  {/* Rank 2 */}
                  {leaderboard[1] && (
                    <div className="glass-panel rounded-2xl p-6 text-center border-t-2 border-slate-400 order-2 md:order-1 flex flex-col justify-between">
                      <div>
                        <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-300 font-bold text-lg mb-3">
                          2
                        </div>
                        <h4 className="font-bold text-slate-200 truncate">{leaderboard[1].name}</h4>
                        <p className="text-xs text-slate-400 mt-1">สถานะ: {leaderboard[1].status}</p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-800/60">
                        <span className="text-xs text-slate-400">คะแนนหลังเรียน</span>
                        <div className="text-2xl font-black text-slate-300 font-mono mt-1">{leaderboard[1].postScore}</div>
                      </div>
                    </div>
                  )}

                  {/* Rank 1 */}
                  {leaderboard[0] && (
                    <div className="glass-panel rounded-2xl p-6 text-center border-t-4 border-yellow-500 order-1 md:order-2 flex flex-col justify-between transform md:scale-105 shadow-xl bg-gradient-to-b from-yellow-500/5 to-transparent">
                      <div>
                        <div className="w-14 h-14 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-full flex items-center justify-center mx-auto font-black text-2xl mb-3 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                          👑
                        </div>
                        <h4 className="font-extrabold text-slate-100 text-lg truncate">{leaderboard[0].name}</h4>
                        <p className="text-xs text-yellow-400 mt-1 font-bold">อันดับที่ 1</p>
                        <p className="text-xs text-slate-400 mt-1">สถานะ: {leaderboard[0].status}</p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-800/60">
                        <span className="text-xs text-slate-400">คะแนนหลังเรียน</span>
                        <div className="text-3xl font-black text-yellow-400 font-mono mt-1">{leaderboard[0].postScore}</div>
                      </div>
                    </div>
                  )}

                  {/* Rank 3 */}
                  {leaderboard[2] && (
                    <div className="glass-panel rounded-2xl p-6 text-center border-t-2 border-amber-600 order-3 flex flex-col justify-between">
                      <div>
                        <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-amber-500 font-bold text-lg mb-3">
                          3
                        </div>
                        <h4 className="font-bold text-slate-200 truncate">{leaderboard[2].name}</h4>
                        <p className="text-xs text-slate-400 mt-1">สถานะ: {leaderboard[2].status}</p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-800/60">
                        <span className="text-xs text-slate-400">คะแนนหลังเรียน</span>
                        <div className="text-2xl font-black text-amber-600 font-mono mt-1">{leaderboard[2].postScore}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Full Leaderboard Table */}
                <div className="glass-panel rounded-3xl p-6 shadow-xl relative mt-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h4 className="text-lg font-bold text-slate-200">รายชื่อนักศึกษาทั้งหมดตามคะแนนสอบหลังเรียน</h4>
                      <p className="text-xs text-slate-400 mt-0.5">แข่งขันประชันคะแนนกันเพื่อก้าวสู่สุดยอดผู้สร้างบอทระดับประเทศ</p>
                    </div>

                    <div className="relative max-w-xs w-full">
                      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="ค้นหาตามรายชื่อ..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-850">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900/80 text-slate-300 text-xs font-semibold border-b border-slate-800">
                          <th className="py-4 px-4 text-center w-16">อันดับ</th>
                          <th className="py-4 px-4">ชื่อ-นามสกุล</th>
                          <th className="py-4 px-4 text-center">สถานะการเรียน</th>
                          <th className="py-4 px-4 text-center">คะแนนก่อนเรียน</th>
                          <th className="py-4 px-4 text-center">คะแนนหลังเรียน</th>
                          <th className="py-4 px-4 text-center">พัฒนาการ</th>
                          <th className="py-4 px-4 text-center">เวลาร่วมกิจกรรม</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-sm">
                        {filteredLeaderboard.length > 0 ? (
                          filteredLeaderboard.map((student, index) => {
                            const isCurrentUser = student.name === currentUser.name;
                            return (
                              <tr key={index} className={`hover:bg-slate-900/40 transition ${isCurrentUser ? "bg-cyan-500/5 font-semibold" : ""}`}>
                                <td className="py-4 px-4 text-center">
                                  {student.rank === 1 ? (
                                    <span className="text-xl">🥇</span>
                                  ) : student.rank === 2 ? (
                                    <span className="text-xl">🥈</span>
                                  ) : student.rank === 3 ? (
                                    <span className="text-xl">🥉</span>
                                  ) : (
                                    <span className="font-mono font-bold text-slate-400">{student.rank}</span>
                                  )}
                                </td>
                                <td className="py-4 px-4">
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-200">{student.name}</span>
                                    {isCurrentUser && (
                                      <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded-full font-bold">
                                        ฉัน
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <span className={`text-xs px-2.5 py-0.5 rounded-full ${student.status === "เรียนจบ" ? "bg-emerald-950 text-emerald-400 border border-emerald-900/40" : "bg-yellow-950 text-yellow-400 border border-yellow-900/40"}`}>
                                    {student.status}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-center font-mono text-slate-300 font-bold">{student.preScore}</td>
                                <td className="py-4 px-4 text-center font-mono text-emerald-400 font-bold">{student.postScore}</td>
                                <td className="py-4 px-4 text-center">
                                  <span className={`text-xs ${parseInt(student.postScore) > parseInt(student.preScore) ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                                    {student.devResult}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-center text-xs text-slate-400 font-mono">{student.timestamp}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={7} className="py-8 px-4 text-center text-slate-500">
                              ไม่พบคะแนนผลการเรียนของนักศึกษาตามชื่อที่ระบุ
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Administrator Reports Dashboard View (Section 1.3) */}
            {adminView && currentUser.role === "admin" && (
              <div className="space-y-6">
                
                {/* Admin Header Title */}
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="w-12 h-12 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-2xl flex items-center justify-center">
                    <Users size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] bg-purple-950 border border-purple-800 text-purple-300 font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
                      สิทธิ์ผู้ดูแลระบบ (Admin Access)
                    </span>
                    <h3 className="text-2xl font-black text-slate-100 mt-1">แผงรายงานสถิติและคะแนนผลการศึกษา</h3>
                  </div>
                </div>

                {/* Metrics Stats Summary Widgets */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  
                  {/* Total Registered Students */}
                  <div className="glass-panel rounded-2xl p-4 sm:p-5 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">นักศึกษา ปวช. ทั้งหมด</span>
                    <h5 className="text-3xl font-extrabold text-cyan-400 mt-1">{getAdminStats().total} คน</h5>
                  </div>

                  {/* Course Completed Students Count */}
                  <div className="glass-panel rounded-2xl p-4 sm:p-5 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ผู้ศึกษาจบหลักสูตร</span>
                    <h5 className="text-3xl font-extrabold text-emerald-400 mt-1">{getAdminStats().completedCount} คน</h5>
                  </div>

                  {/* Pre-test Average */}
                  <div className="glass-panel rounded-2xl p-4 sm:p-5 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ค่าเฉลี่ยก่อนเรียน</span>
                    <h5 className="text-3xl font-extrabold text-slate-300 mt-1">{getAdminStats().avgPre} / 5</h5>
                  </div>

                  {/* Post-test Average */}
                  <div className="glass-panel rounded-2xl p-4 sm:p-5 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ค่าเฉลี่ยหลังเรียน</span>
                    <h5 className="text-3xl font-extrabold text-yellow-400 mt-1">{getAdminStats().avgPost} / 5</h5>
                  </div>
                </div>

                {/* Students Detailed Score Spreadsheet List */}
                <div className="glass-panel rounded-3xl p-6 shadow-xl relative">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h4 className="text-lg font-bold text-slate-200">ตารางรายชื่อผลการเรียนแยกตามบุคคล</h4>
                      <p className="text-xs text-slate-400 mt-0.5">แสดงข้อมูลแบบละเอียดเพื่ออำนวยความสะดวกในการตัดเกรดของอาจารย์ผู้ควบคุม</p>
                    </div>

                    <div className="relative max-w-xs w-full">
                      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="พิมพ์ค้นหาชื่อนักเรียนทันที..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-850">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900/80 text-slate-300 text-xs font-semibold border-b border-slate-800">
                          <th className="py-4 px-4 text-center">อันดับ</th>
                          <th className="py-4 px-4">ชื่อ-นามสกุล</th>
                          <th className="py-4 px-4 text-center">สถานะการเรียน</th>
                          <th className="py-4 px-4 text-center">คะแนนก่อนเรียน</th>
                          <th className="py-4 px-4 text-center">คะแนนหลังเรียน</th>
                          <th className="py-4 px-4 text-center">พัฒนาการ</th>
                          <th className="py-4 px-4">เวลาลงทะเบียนเข้าเรียน</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-sm">
                        {getAdminStats().students.filter(item => {
                          if (!searchQuery.trim()) return true;
                          return item.name.toLowerCase().includes(searchQuery.toLowerCase());
                        }).length > 0 ? (
                          getAdminStats().students.filter(item => {
                            if (!searchQuery.trim()) return true;
                            return item.name.toLowerCase().includes(searchQuery.toLowerCase());
                          }).map((student, index) => (
                            <tr key={student.id || index} className="hover:bg-slate-900/40 transition">
                              <td className="py-4 px-4 text-center font-bold text-slate-400">{student.rank}</td>
                              <td className="py-4 px-4 font-semibold text-slate-200">{student.name}</td>
                              <td className="py-4 px-4 text-center">
                                <span className={`text-xs px-2.5 py-0.5 rounded-full ${student.status === "เรียนจบ" ? "bg-emerald-950 text-emerald-400 border border-emerald-900/40" : "bg-yellow-950 text-yellow-400 border border-yellow-900/40"}`}>
                                  {student.status}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-center font-mono text-slate-300 font-bold">{student.preScore}</td>
                              <td className="py-4 px-4 text-center font-mono text-emerald-400 font-bold">{student.postScore}</td>
                              <td className="py-4 px-4 text-center">
                                <span className={`text-xs ${parseInt(student.postScore) > parseInt(student.preScore) ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                                  {student.devResult}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-xs text-slate-400 font-mono">{student.timestamp}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="py-8 px-4 text-center text-slate-500">
                              ไม่พบคะแนนผลการเรียนของนักศึกษาตามชื่อที่ระบุ
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Manual / Help Guide Modal (Section 1.2) */}
      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full relative shadow-2xl">
            <button 
              onClick={() => setHelpOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition focus:outline-none"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-6">
              <Compass className="text-cyan-400 animate-spin" size={24} />
              {HELP_GUIDE_DATA.title}
            </h3>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {HELP_GUIDE_DATA.steps.map((item, index) => (
                <div key={index} className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-1">
                  <h5 className="text-sm font-bold text-cyan-400">{item.step}</h5>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setHelpOpen(false)}
              className="w-full mt-6 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2.5 rounded-xl transition cursor-pointer"
            >
              เข้าใจแล้ว เริ่มศึกษาได้เลย!
            </button>
          </div>
        </div>
      )}

      {/* Bottom Footer Section */}
      <footer className="bg-slate-950/80 border-t border-slate-900 py-6 text-center text-slate-500 text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 Copyright | พัฒนาโดย <span className="text-slate-300 font-medium">{SUBJECT_INFO.developer}</span></p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>{SUBJECT_INFO.subject}</span>
            <span>•</span>
            <span>{SUBJECT_INFO.level}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
