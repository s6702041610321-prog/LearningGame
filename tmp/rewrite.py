import os

with open('src/App.tsx', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

start_marker = '            {/* Sidebar Main Nav Menu */}'
end_marker = '            {/* Sidebar User Info & Footer buttons */}'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Error: Markers not found!")
    os._exit(1)

replacement = """            {/* Sidebar Main Nav Menu */}
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
"""

new_content = content[:start_idx] + replacement + content[end_idx:]
with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("SUCCESS")
