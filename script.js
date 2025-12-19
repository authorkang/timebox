// ---------------- PWA ----------------
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js");
    });
}

// ---------------- STATE ----------------
let tags = JSON.parse(localStorage.getItem("tags")) || [
    { name: "Work", color: "#3498db" }
];
let logs = JSON.parse(localStorage.getItem("logs")) || [];

let currentTag = tags[0].name;
let startTime = null;
let isRunning = false;
let timerInterval = null;
let viewMode = "day";

// ---------------- TAGS ----------------
function renderTags() {
    const el = document.getElementById("tags");
    el.innerHTML = "";

    tags.forEach((tag, index) => {
        const div = document.createElement("div");
        div.className = "tag-item";
        if (tag.name === currentTag) {
            div.classList.add("selected");
            div.style.background = tag.color;
        }

        div.innerHTML = `
      <button class="tag-button">${tag.name}</button>
      <button class="tag-delete-btn">×</button>
    `;

        div.querySelector(".tag-button").onclick = () => {
            if (isRunning) return alert("Stop timer first");
            currentTag = tag.name;
            renderTags();
            updateCurrentTag();
        };

        div.querySelector(".tag-delete-btn").onclick = (e) => {
            e.stopPropagation();
            if (tags.length === 1) return alert("At least one tag required");
            tags.splice(index, 1);
            currentTag = tags[0].name;
            saveTags();
            renderTags();
        };

        el.appendChild(div);
    });

    document.getElementById("tagCount").textContent = `${tags.length}/5 tags`;
}

function addTag() {
    const input = document.getElementById("tagInput");
    const color = document.getElementById("tagColor").value;
    const name = input.value.trim();

    if (!name) return;
    if (tags.length >= 5) return alert("Max 5 tags");
    if (tags.find(t => t.name === name)) return alert("Duplicate");

    tags.push({ name, color });
    input.value = "";
    saveTags();
    renderTags();
}

function saveTags() {
    localStorage.setItem("tags", JSON.stringify(tags));
}

function updateCurrentTag() {
    document.getElementById("currentTag").textContent =
        `Current tag: ${currentTag}`;
}

// ---------------- TIMER ----------------
function toggleTimer() {
    const btn = document.getElementById("toggleBtn");

    if (!isRunning) {
        startTime = new Date();
        isRunning = true;
        btn.textContent = "Stop";
        btn.classList.add("running");
        timerInterval = setInterval(updateTimer, 1000);
        // 타이머 상태 저장
        localStorage.setItem("timerState", JSON.stringify({
            isRunning: true,
            startTime: startTime.toISOString(),
            currentTag: currentTag
        }));
    } else {
        const endTime = new Date();
        const duration = Math.round((endTime - startTime) / 60000);

        logs.push({
            tag: currentTag,
            start: startTime.toISOString(),
            end: endTime.toISOString(),
            duration
        });

        localStorage.setItem("logs", JSON.stringify(logs));
        clearInterval(timerInterval);
        isRunning = false;
        btn.textContent = "Start";
        btn.classList.remove("running");
        startTime = null;
        localStorage.removeItem("timerState");
        renderLogs();
    }
}

function updateTimer() {
    if (!startTime) return;
    const diff = Math.floor((new Date() - startTime) / 1000);
    const h = String(Math.floor(diff / 3600)).padStart(2, "0");
    const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
    const s = String(diff % 60).padStart(2, "0");
    document.getElementById("currentTimer").textContent = `${h}:${m}:${s}`;
}

// ---------------- UTILS ---------------- 
function getLuminance(hex) {
    // hex를 RGB로 변환
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    // 상대적 밝기 계산 (WCAG 표준)
    const [rs, gs, bs] = [r, g, b].map(val => {
        val = val / 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastColor(hex) {
    const luminance = getLuminance(hex);
    // 밝기가 0.5보다 크면 어두운 텍스트, 작으면 밝은 텍스트
    return luminance > 0.5 ? "#333333" : "#ffffff";
}

// ---------------- LOGS ---------------- 
function renderLogs() {
    const list = document.getElementById("logsList");
    list.innerHTML = "";

    if (logs.length === 0) {
        list.innerHTML = "<div class='empty-logs'>No logs</div>";
        return;
    }

    // 오늘 날짜의 로그 필터링
    const today = new Date().toDateString();
    const todayLogs = logs.filter(log => {
        const logDate = new Date(log.start).toDateString();
        return logDate === today;
    });

    // 누적 시간 계산 (시간 순으로 정렬)
    const sortedTodayLogs = [...todayLogs].sort((a, b) => 
        new Date(a.start) - new Date(b.start)
    );
    
    const cumulativeTotals = {};
    sortedTodayLogs.forEach((log, idx) => {
        const prevTotal = idx > 0 ? cumulativeTotals[sortedTodayLogs[idx - 1].start] : 0;
        cumulativeTotals[log.start] = prevTotal + log.duration;
    });

    logs.slice().reverse().forEach((log, index) => {
        const originalIndex = logs.length - 1 - index; // 원본 배열의 인덱스
        const div = document.createElement("div");
        div.className = "log-item";
        div.style.cursor = "pointer";
        
        // 태그 색상 찾기
        const tag = tags.find(t => t.name === log.tag);
        const tagColor = tag ? tag.color : "#3498db";
        const textColor = getContrastColor(tagColor);
        
        // 시간 포맷팅
        const startTime = new Date(log.start);
        const endTime = new Date(log.end);
        const startStr = startTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        const endStr = endTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        
        // 누적 시간 계산
        const cumulativeMinutes = cumulativeTotals[log.start] || log.duration;
        const cumulativeHours = Math.floor(cumulativeMinutes / 60);
        const cumulativeMins = cumulativeMinutes % 60;
        const cumulativeStr = cumulativeHours > 0 
            ? `${cumulativeHours}h ${cumulativeMins}m` 
            : `${cumulativeMins}m`;
        
        div.innerHTML = `
      <div class="log-tag" style="background: ${tagColor}; color: ${textColor};">${log.tag}</div>
      <div class="log-time">${startStr} - ${endStr}</div>
      <div class="log-duration">${log.duration} min</div>
      <div class="log-cumulative">${cumulativeStr}</div>
      <div class="log-delete-icon" onclick="event.stopPropagation(); deleteLogDirect(${originalIndex})">🗑️</div>
    `;
        
        // 클릭 이벤트 추가
        div.onclick = () => openLogModal(originalIndex);
        
        list.appendChild(div);
    });
}

function deleteLogDirect(logIndex) {
    if (!confirm("Are you sure you want to delete this log?")) {
        return;
    }
    
    logs.splice(logIndex, 1);
    localStorage.setItem("logs", JSON.stringify(logs));
    
    renderLogs();
}

let currentEditLogIndex = -1;

function openLogModal(logIndex) {
    currentEditLogIndex = logIndex;
    const log = logs[logIndex];
    
    // 태그 선택 옵션 채우기
    const tagSelect = document.getElementById("editTagSelect");
    tagSelect.innerHTML = "";
    tags.forEach(tag => {
        const option = document.createElement("option");
        option.value = tag.name;
        option.textContent = tag.name;
        if (tag.name === log.tag) {
            option.selected = true;
        }
        tagSelect.appendChild(option);
    });
    
    // 시간 설정 (datetime-local 형식으로 변환)
    const startTime = new Date(log.start);
    const endTime = new Date(log.end);
    
    // datetime-local 형식: YYYY-MM-DDTHH:mm
    const formatDateTime = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    
    document.getElementById("editStartTime").value = formatDateTime(startTime);
    document.getElementById("editEndTime").value = formatDateTime(endTime);
    document.getElementById("editDuration").value = log.duration;
    
    // 모달 표시
    const modal = document.getElementById("logEditModal");
    modal.classList.remove("hidden");
    
    // 모달 오버레이 클릭 시 닫기
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeLogModal();
        }
    };
    
    // 시간 변경 시 duration 자동 계산
    const startInput = document.getElementById("editStartTime");
    const endInput = document.getElementById("editEndTime");
    const durationInput = document.getElementById("editDuration");
    
    const updateDuration = () => {
        if (startInput.value && endInput.value) {
            const start = new Date(startInput.value);
            const end = new Date(endInput.value);
            if (end > start) {
                const diffMinutes = Math.round((end - start) / 60000);
                if (diffMinutes > 0) {
                    durationInput.value = diffMinutes;
                }
            }
        }
    };
    
    startInput.onchange = updateDuration;
    endInput.onchange = updateDuration;
}

function closeLogModal() {
    document.getElementById("logEditModal").classList.add("hidden");
    currentEditLogIndex = -1;
}

function saveLogEdit() {
    if (currentEditLogIndex === -1) return;
    
    const log = logs[currentEditLogIndex];
    const newTag = document.getElementById("editTagSelect").value;
    const startTimeStr = document.getElementById("editStartTime").value;
    const endTimeStr = document.getElementById("editEndTime").value;
    const duration = parseInt(document.getElementById("editDuration").value);
    
    if (!startTimeStr || !endTimeStr || !duration || duration < 1) {
        alert("Please fill in all fields correctly");
        return;
    }
    
    const startTime = new Date(startTimeStr);
    const endTime = new Date(endTimeStr);
    
    if (endTime <= startTime) {
        alert("End time must be after start time");
        return;
    }
    
    // 로그 업데이트
    log.tag = newTag;
    log.start = startTime.toISOString();
    log.end = endTime.toISOString();
    log.duration = duration;
    
    // localStorage 저장
    localStorage.setItem("logs", JSON.stringify(logs));
    
    // UI 업데이트
    renderLogs();
    closeLogModal();
}

function deleteLog() {
    if (currentEditLogIndex === -1) return;
    
    if (!confirm("Are you sure you want to delete this log?")) {
        return;
    }
    
    logs.splice(currentEditLogIndex, 1);
    localStorage.setItem("logs", JSON.stringify(logs));
    
    renderLogs();
    closeLogModal();
}

// ---------------- SETTLE ---------------- 
function settleToday() {
    const today = new Date().toDateString();
    const todayLogs = logs.filter(log => {
        const logDate = new Date(log.start).toDateString();
        return logDate === today;
    });

    if (todayLogs.length === 0) {
        alert("No logs for today");
        return;
    }

    // 태그별로 집계
    const tagTotals = {};
    let totalMinutes = 0;

    todayLogs.forEach(log => {
        if (!tagTotals[log.tag]) {
            tagTotals[log.tag] = 0;
        }
        tagTotals[log.tag] += log.duration;
        totalMinutes += log.duration;
    });

    // Settlement UI 렌더링
    const settlementEl = document.getElementById("settlement");
    settlementEl.classList.remove("hidden");

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const totalTime = hours > 0 
        ? `${hours}h ${minutes}m` 
        : `${minutes}m`;

    let html = `
        <div class="settlement-total">Total: ${totalTime}</div>
        <div class="settlement-tags">
    `;

    // 태그별 시간 정렬 (내림차순)
    const sortedTags = Object.entries(tagTotals)
        .sort((a, b) => b[1] - a[1]);

    sortedTags.forEach(([tagName, minutes]) => {
        const tag = tags.find(t => t.name === tagName);
        const tagColor = tag ? tag.color : "#3498db";
        const tagHours = Math.floor(minutes / 60);
        const tagMins = minutes % 60;
        const tagTime = tagHours > 0 
            ? `${tagHours}h ${tagMins}m` 
            : `${tagMins}m`;

        html += `
            <div class="settlement-tag-item">
                <div class="settlement-tag-color" style="background: ${tagColor}"></div>
                <div class="settlement-tag-name">${tagName}</div>
                <div class="settlement-tag-time">${tagTime}</div>
            </div>
        `;
    });

    html += `</div>`;
    settlementEl.innerHTML = html;
}

// ---------------- WEEK ANALYSIS ---------------- 
function renderWeekAnalysis() {
    const weekAnalysisEl = document.getElementById("weekAnalysis");
    
    // 지난 7일간의 로그 필터링
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    const weekLogs = logs.filter(log => {
        const logDate = new Date(log.start);
        return logDate >= sevenDaysAgo && logDate <= today;
    });
    
    if (weekLogs.length === 0) {
        weekAnalysisEl.innerHTML = '<div class="empty-analysis">No data for the past 7 days</div>';
        return;
    }
    
    // 전체 통계 계산
    let totalMinutes = 0;
    const tagTotals = {};
    const dailyTotals = {};
    
    weekLogs.forEach(log => {
        totalMinutes += log.duration;
        
        // 태그별 집계
        if (!tagTotals[log.tag]) {
            tagTotals[log.tag] = 0;
        }
        tagTotals[log.tag] += log.duration;
        
        // 일별 집계
        const logDate = new Date(log.start).toDateString();
        if (!dailyTotals[logDate]) {
            dailyTotals[logDate] = {
                total: 0,
                tags: {}
            };
        }
        dailyTotals[logDate].total += log.duration;
        if (!dailyTotals[logDate].tags[log.tag]) {
            dailyTotals[logDate].tags[log.tag] = 0;
        }
        dailyTotals[logDate].tags[log.tag] += log.duration;
    });
    
    const totalHours = Math.floor(totalMinutes / 60);
    const totalMins = totalMinutes % 60;
    const avgMinutes = Math.round(totalMinutes / 7);
    const avgHours = Math.floor(avgMinutes / 60);
    const avgMins = avgMinutes % 60;
    
    // 기록한 일수 계산 (하루에 하나라도 로그가 있으면 카운트)
    const recordedDays = Object.keys(dailyTotals).length;
    
    // 최대값 찾기 (차트용)
    const maxTagTime = Math.max(...Object.values(tagTotals), 0);
    
    let html = `
        <h2>Week Analysis (Last 7 Days)</h2>
        
        <div class="week-stats">
            <div class="stat-card">
                <div class="stat-label">Total Time</div>
                <div class="stat-value">${totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Daily Average</div>
                <div class="stat-value">${avgHours > 0 ? `${avgHours}h ${avgMins}m` : `${avgMins}m`}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Recorded Days</div>
                <div class="stat-value">${recordedDays} / 7</div>
            </div>
        </div>
        
        <div class="tag-chart">
            <h3>Time by Tag</h3>
    `;
    
    // 태그별 차트 (시간 순으로 정렬)
    const sortedTags = Object.entries(tagTotals)
        .sort((a, b) => b[1] - a[1]);
    
    sortedTags.forEach(([tagName, minutes]) => {
        const tag = tags.find(t => t.name === tagName);
        const tagColor = tag ? tag.color : "#3498db";
        const percentage = maxTagTime > 0 ? (minutes / maxTagTime) * 100 : 0;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        
        html += `
            <div class="chart-bar-item">
                <div class="chart-bar-label">${tagName}</div>
                <div class="chart-bar-container">
                    <div class="chart-bar" style="background: ${tagColor}; width: ${percentage}%;"></div>
                    <div class="chart-bar-value">${timeStr}</div>
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    
    // 일별 리스트
    html += `
        <div class="daily-list">
            <h3>Daily Breakdown</h3>
    `;
    
    // 날짜 순으로 정렬 (최신순)
    const sortedDays = Object.entries(dailyTotals)
        .sort((a, b) => new Date(b[0]) - new Date(a[0]));
    
    sortedDays.forEach(([dateStr, data]) => {
        const hours = Math.floor(data.total / 60);
        const mins = data.total % 60;
        const totalStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        
        html += `
            <div class="daily-item">
                <div class="daily-date">${dateStr}</div>
                <div class="daily-total">Total: ${totalStr}</div>
                <div class="daily-tags">
        `;
        
        // 해당 날짜의 태그들 표시
        Object.entries(data.tags)
            .sort((a, b) => b[1] - a[1])
            .forEach(([tagName, minutes]) => {
                const tag = tags.find(t => t.name === tagName);
                const tagColor = tag ? tag.color : "#3498db";
                const textColor = getContrastColor(tagColor);
                const tagHours = Math.floor(minutes / 60);
                const tagMins = minutes % 60;
                const tagTimeStr = tagHours > 0 ? `${tagHours}h ${tagMins}m` : `${tagMins}m`;
                
                html += `
                    <div class="daily-tag" style="background: ${tagColor}; color: ${textColor};">
                        ${tagName}: ${tagTimeStr}
                    </div>
                `;
            });
        
        html += `
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    
    weekAnalysisEl.innerHTML = html;
}

// ---------------- MONTH ANALYSIS ---------------- 
function renderMonthAnalysis() {
    const monthAnalysisEl = document.getElementById("monthAnalysis");
    
    // 지난 4주간의 로그 필터링
    const today = new Date();
    const fourWeeksAgo = new Date(today);
    fourWeeksAgo.setDate(today.getDate() - 28);
    
    const monthLogs = logs.filter(log => {
        const logDate = new Date(log.start);
        return logDate >= fourWeeksAgo && logDate <= today;
    });
    
    if (monthLogs.length === 0) {
        monthAnalysisEl.innerHTML = '<div class="empty-analysis">No data for the past 4 weeks</div>';
        return;
    }
    
    // 주별, 태그별 집계
    const weeklyTagTotals = {}; // { weekKey: { tagName: minutes } }
    
    monthLogs.forEach(log => {
        const logDate = new Date(log.start);
        const weekStart = new Date(logDate);
        weekStart.setDate(logDate.getDate() - logDate.getDay()); // 해당 주의 일요일
        const weekKey = weekStart.toISOString().split('T')[0]; // YYYY-MM-DD 형식
        
        if (!weeklyTagTotals[weekKey]) {
            weeklyTagTotals[weekKey] = {};
        }
        
        if (!weeklyTagTotals[weekKey][log.tag]) {
            weeklyTagTotals[weekKey][log.tag] = 0;
        }
        
        weeklyTagTotals[weekKey][log.tag] += log.duration;
    });
    
    // 모든 태그 목록 가져오기
    const allTags = tags.map(t => t.name);
    
    // 주별로 정렬 (최신순)
    const sortedWeeks = Object.entries(weeklyTagTotals)
        .sort((a, b) => new Date(b[0]) - new Date(a[0]));
    
    let html = `
        <h2>Month Analysis (Last 4 Weeks)</h2>
        <div class="month-table-container">
            <table class="month-table">
                <thead>
                    <tr>
                        <th>Week</th>
    `;
    
    // 태그별 헤더 추가
    allTags.forEach(tagName => {
        html += `<th>${tagName}</th>`;
    });
    
    html += `
                    </tr>
                </thead>
                <tbody>
    `;
    
    // 주별 데이터 행 추가
    sortedWeeks.forEach(([weekKey, tagData]) => {
        const weekStart = new Date(weekKey);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const weekLabel = `${weekStart.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}`;
        
        html += `<tr>`;
        html += `<td class="week-label">${weekLabel}</td>`;
        
        // 각 태그별 시간 표시
        allTags.forEach(tagName => {
            const minutes = tagData[tagName] || 0;
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            const timeStr = minutes > 0 
                ? (hours > 0 ? `${hours}h ${mins}m` : `${mins}m`)
                : '-';
            
            const tag = tags.find(t => t.name === tagName);
            const tagColor = tag ? tag.color : "#3498db";
            
            html += `<td class="tag-time-cell" style="background: ${tagColor}20;">
                <span style="color: ${tagColor}; font-weight: 600;">${timeStr}</span>
            </td>`;
        });
        
        html += `</tr>`;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    monthAnalysisEl.innerHTML = html;
}

// ---------------- VIEW ---------------- 
function setView(mode) {
    viewMode = mode;
    
    // 각 뷰 섹션 표시/숨김 처리
    document.getElementById("logsSection").classList.toggle("hidden", mode !== "day");
    document.getElementById("weekAnalysis").classList.toggle("hidden", mode !== "week");
    document.getElementById("monthAnalysis").classList.toggle("hidden", mode !== "month");
    
    // View 버튼 활성화 상태 업데이트
    document.getElementById("dayBtn").classList.toggle("active", mode === "day");
    document.getElementById("weekBtn").classList.toggle("active", mode === "week");
    document.getElementById("monthBtn").classList.toggle("active", mode === "month");
    
    // 각 모드별 분석 렌더링
    if (mode === "week") {
        renderWeekAnalysis();
    } else if (mode === "month") {
        renderMonthAnalysis();
    }
}

// ---------------- INIT ---------------- 
function init() {
    renderTags();
    updateCurrentTag();
    renderLogs();
    document.getElementById("currentDate").textContent =
        new Date().toDateString();
    
    // 태그 입력에서 Enter 키 지원
    const tagInput = document.getElementById("tagInput");
    if (tagInput) {
        tagInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                addTag();
            }
        });
    }
    
    // 타이머 상태 복원 (PWA에서 페이지를 다시 열었을 때)
    const savedTimerState = localStorage.getItem("timerState");
    if (savedTimerState) {
        try {
            const timerState = JSON.parse(savedTimerState);
            if (timerState.isRunning && timerState.startTime) {
                const savedStartTime = new Date(timerState.startTime);
                const now = new Date();
                // 24시간 이내의 타이머만 복원
                if (now - savedStartTime < 24 * 60 * 60 * 1000) {
                    startTime = savedStartTime;
                    isRunning = true;
                    const btn = document.getElementById("toggleBtn");
                    if (btn) {
                        btn.textContent = "Stop";
                        btn.classList.add("running");
                    }
                    timerInterval = setInterval(updateTimer, 1000);
                    updateTimer();
                } else {
                    // 24시간 이상 지난 타이머는 초기화
                    localStorage.removeItem("timerState");
                }
            }
        } catch (e) {
            console.error("Failed to restore timer state", e);
        }
    }
    
    // 페이지를 떠날 때 타이머 상태 저장
    window.addEventListener("beforeunload", () => {
        if (isRunning && startTime) {
            localStorage.setItem("timerState", JSON.stringify({
                isRunning: true,
                startTime: startTime.toISOString(),
                currentTag: currentTag
            }));
        } else {
            localStorage.removeItem("timerState");
        }
    });
    
    // 페이지가 다시 포커스를 받을 때 타이머 업데이트
    window.addEventListener("focus", () => {
        if (isRunning && startTime) {
            updateTimer();
        }
    });
}

document.addEventListener("DOMContentLoaded", init);
