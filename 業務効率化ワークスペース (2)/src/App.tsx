/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Task, WorkLog, ActiveTab, SecurityLog, CalendarEvent } from "./types";
import TaskManager from "./components/TaskManager";
import DailyReporter from "./components/DailyReporter";
import SettingsAndLogs from "./components/SettingsAndLogs";
import AuthGate from "./components/AuthGate";
import CalendarView from "./components/CalendarView";
import { hashPassword, createSecurityLogEntry } from "./utils/crypto";
import { syncAlarmsToDb, syncActiveTimerToDb, markAlarmAsNotifiedInDb } from "./utils/notificationDb";
import { 
  Briefcase, 
  CheckSquare, 
  FileText, 
  TrendingUp, 
  Clock, 
  Terminal, 
  Upload, 
  Cpu, 
  Database,
  Code,
  CheckCircle,
  HelpCircle,
  Sparkles,
  AlertCircle,
  Search,
  Settings,
  Bell,
  RefreshCw,
  Plus,
  LogOut,
  Calendar,
  Menu,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Default placeholder data
const INITIAL_TASKS: Task[] = [];

const INITIAL_LOGS: WorkLog[] = [];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("tasks");

  // Auth & Session States
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(() => {
    const active = localStorage.getItem("AUTH_SESSION_ACTIVE") || sessionStorage.getItem("AUTH_SESSION_ACTIVE");
    if (active === "true") {
      const activeUser = localStorage.getItem("AUTH_CURRENT_USER");
      if (activeUser) {
        return activeUser;
      }
      const cached = localStorage.getItem("AUTH_CREDENTIALS");
      if (cached) {
        return JSON.parse(cached).email;
      }
    }
    return null;
  });

  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>(() => {
    const cached = localStorage.getItem("BIZ_SECURITY_AUDIT_LOGS");
    return cached ? JSON.parse(cached) : [
      createSecurityLogEntry("セキュアセッション監査エンジンが開始されました。", "system", "info")
    ];
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const cached = localStorage.getItem("BIZ_TASKS_DATA");
    return cached ? JSON.parse(cached) : INITIAL_TASKS;
  });
  const [workLogs, setWorkLogs] = useState<WorkLog[]>(() => {
    const cached = localStorage.getItem("BIZ_WORK_LOGS");
    return cached ? JSON.parse(cached) : INITIAL_LOGS;
  });

  // Helper to get local date string
  const getTodayDateStr = () => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = (now.getMonth() + 1).toString().padStart(2, "0");
    const curDay = now.getDate().toString().padStart(2, "0");
    return `${curYear}-${curMonth}-${curDay}`;
  };

  const [systemTimeDate, setSystemTimeDate] = useState<string>(getTodayDateStr);

  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() => {
    const cached = localStorage.getItem("BIZ_CALENDAR_EVENTS_LIST");
    const today = getTodayDateStr();
    return cached ? JSON.parse(cached) : [
      {
        id: "ev-init-test-live",
        title: "顧客デモ & 運用状況報告",
        date: today,
        time: "14:05",
        priority: "high",
        description: "10分前お知らせ通知テスト用イベント (13:55起算)",
        notified: false,
        createdAt: new Date().toISOString()
      },
      {
        id: "ev-init-1",
        title: "朝会ミーティング & 進捗合わせ",
        date: today,
        time: "10:00",
        priority: "medium",
        description: "BlazorシステムHub接続の確認",
        notified: true,
        createdAt: new Date().toISOString()
      },
      {
        id: "ev-init-2",
        title: "C# EFCore デバッグセッション",
        date: today,
        time: "15:00",
        priority: "high",
        description: "DbContextトランザクション競合の修正作業",
        notified: false,
        createdAt: new Date().toISOString()
      }
    ];
  });

  const [activeNotification, setActiveNotification] = useState<{ id: string; title: string; time: string; priority: string } | null>(null);

  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Data Analyzer specific states
  const [csvRaw, setCsvRaw] = useState<string>("日付,部署,売上金額,作業時間(時間)\n");
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [numericColumn, setNumericColumn] = useState<string>("");
  const [stats, setStats] = useState<{ sum: number; avg: number; count: number; max: number }>({ sum: 0, avg: 0, count: 0, max: 0 });
  
  // Custom generated C# class for the Blazor dev
  const [generatedCSharpClass, setGeneratedCSharpClass] = useState<string>("");
  
  // AI analysis state
  const [analysisResult, setAnalysisResult] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analyzerError, setAnalyzerError] = useState<string>("");
  const [analysisInstructions, setAnalysisInstructions] = useState<string>("部門別の合計売上、作業時間あたりの費用対効果、および生産効率の良い部門の分析をしてください。");

  // Timer states
  const [timerSeconds, setTimerSeconds] = useState<number>(1500); // 25 min default
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerType, setTimerType] = useState<"work" | "break">("work");
  const [systemLogs, setSystemLogs] = useState<string[]>([
    "[" + new Date().toLocaleTimeString() + "] Blazor environment initialized successfully.",
    "[" + new Date().toLocaleTimeString() + "] REST API Engine ready. Port: 3000 Active"
  ]);

  const [resetConfirm, setResetConfirm] = useState(false);

  const handleResetData = () => {
    setTasks([]);
    setWorkLogs([]);
    setCsvRaw("日付,部署,売上金額,作業時間(時間)\n");
    setAnalysisResult("");
    localStorage.removeItem("BIZ_TASKS_DATA");
    localStorage.removeItem("BIZ_WORK_LOGS");
    localStorage.removeItem("AUTH_CREDENTIALS");
    localStorage.removeItem("AUTH_SESSION_ACTIVE");
    localStorage.removeItem("AUTH_CURRENT_USER");
    localStorage.removeItem("FACE_AUTH_CREDS");
    sessionStorage.removeItem("AUTH_SESSION_ACTIVE");
    setCurrentUserEmail(null);
    setSecurityLogs([
      createSecurityLogEntry("ファクトリーリセットによりシステム全データを初期化しました。", "system", "danger")
    ]);
    setResetConfirm(false);
    addSystemLog("SYSTEM: データベース監査トレールおよびアカウント設定の初期化リセットが完了しました。");
  };

  const handleUpdateCredentials = async (
    oldPasswordPlain: string,
    newEmail: string,
    newPasswordPlain: string
  ): Promise<{ success: boolean; message: string }> => {
    const cached = localStorage.getItem("AUTH_CREDENTIALS");
    if (!cached) {
      return { success: false, message: "登録済みの認証情報が見つかりません。" };
    }
    const creds = JSON.parse(cached);
    const hashedOld = await hashPassword(oldPasswordPlain);
    
    if (hashedOld !== creds.passwordHash) {
      // Create failure log
      const log = createSecurityLogEntry(
        `アカウント情報改訂エラー：現在のパスワード検証失敗（試行ID: ${creds.email}）`,
        "profile_change",
        "danger"
      );
      setSecurityLogs(prev => [log, ...prev]);
      return { success: false, message: "現在のパスワードが正しくありません。" };
    }

    const hashedNew = await hashPassword(newPasswordPlain);
    const updatedCreds = {
      email: newEmail.trim(),
      passwordHash: hashedNew,
      registeredAt: creds.registeredAt,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem("AUTH_CREDENTIALS", JSON.stringify(updatedCreds));
    localStorage.setItem("FACE_AUTH_CREDS", JSON.stringify({ email: newEmail.trim(), password: newPasswordPlain }));
    setCurrentUserEmail(newEmail.trim());

    const log = createSecurityLogEntry(
      `アカウント認証情報更新に成功しました（ユーザーID: ${creds.email} -> ${newEmail.trim()}）`,
      "profile_change",
      "success"
    );
    setSecurityLogs(prev => [log, ...prev]);

    return { success: true, message: "アカウント設定が安全に適用されました。" };
  };

  const handleLogout = () => {
    const oldEmail = currentUserEmail || "不明なユーザー";
    sessionStorage.removeItem("AUTH_SESSION_ACTIVE");
    localStorage.removeItem("AUTH_SESSION_ACTIVE");
    localStorage.removeItem("AUTH_CURRENT_USER");
    setCurrentUserEmail(null);
    setIsAdmin(false);

    const log = createSecurityLogEntry(
      `ログアウト処理実施（ユーザーID: ${oldEmail}）`,
      "session_logout",
      "info"
    );
    setSecurityLogs(prev => [log, ...prev]);
    addSystemLog(`Security Audit: セッション切断、${oldEmail} が安全にサインアウト。`);
  };

  // Synchronize with local storage
  useEffect(() => {
    localStorage.setItem("BIZ_TASKS_DATA", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("BIZ_WORK_LOGS", JSON.stringify(workLogs));
  }, [workLogs]);

  useEffect(() => {
    localStorage.setItem("BIZ_SECURITY_AUDIT_LOGS", JSON.stringify(securityLogs));
  }, [securityLogs]);

   useEffect(() => {
    localStorage.setItem("BIZ_CALENDAR_EVENTS_LIST", JSON.stringify(calendarEvents));
    // Synchronize to local IndexedDB store for Service Worker monitoring
    syncAlarmsToDb(calendarEvents);
  }, [calendarEvents]);

  useEffect(() => {
    localStorage.setItem("AUTH_IS_ADMIN", isAdmin ? "true" : "false");
  }, [isAdmin]);

  // View transition auto-refetch safety sync (refetches latest modifications on screen transitions)
  useEffect(() => {
    try {
      const cachedTasks = localStorage.getItem("BIZ_TASKS_DATA");
      if (cachedTasks) {
        const parsed = JSON.parse(cachedTasks);
        if (JSON.stringify(parsed) !== JSON.stringify(tasks)) {
          setTasks(parsed);
        }
      }
      const cachedLogs = localStorage.getItem("BIZ_WORK_LOGS");
      if (cachedLogs) {
        const parsed = JSON.parse(cachedLogs);
        if (JSON.stringify(parsed) !== JSON.stringify(workLogs)) {
          setWorkLogs(parsed);
        }
      }
      const cachedSecurityLogs = localStorage.getItem("BIZ_SECURITY_AUDIT_LOGS");
      if (cachedSecurityLogs) {
        const parsed = JSON.parse(cachedSecurityLogs);
        if (JSON.stringify(parsed) !== JSON.stringify(securityLogs)) {
          setSecurityLogs(parsed);
        }
      }
      const cachedEvents = localStorage.getItem("BIZ_CALENDAR_EVENTS_LIST");
      if (cachedEvents) {
        const parsed = JSON.parse(cachedEvents);
        if (JSON.stringify(parsed) !== JSON.stringify(calendarEvents)) {
          setCalendarEvents(parsed);
        }
      }
    } catch (e) {
      console.error("Auto reload of latest workspace data failed during view transition:", e);
    }
  }, [activeTab]);

  // Service Worker Registration & Native Notification Activation
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then(reg => {
          console.log("Service Worker successfully registered with scope:", reg.scope);
        })
        .catch(err => {
          console.error("Service Worker registration failed:", err);
        });
    }

    // Capture click messages from service worker
    const handleSWMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === "NOTIFICATION_CLICK") {
        const payload = e.data.data;
        if (payload) {
          if (payload.type === "pomodoro_complete") {
            setActiveTab("timer");
          } else if (payload.type === "calendar_alarm") {
            setActiveTab("calendar");
          }
        }
      }
    };
    navigator.serviceWorker?.addEventListener("message", handleSWMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleSWMessage);
    };
  }, []);

  // Background polling to inspect 10-minute scheduled alarms with premium alarm audio
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const now = new Date();
      
      // Calculate local YYYY-MM-DD format based on local zone
      const curYear = now.getFullYear();
      const curMonth = (now.getMonth() + 1).toString().padStart(2, "0");
      const curDay = now.getDate().toString().padStart(2, "0");
      const todayStr = `${curYear}-${curMonth}-${curDay}`;

      setSystemTimeDate(prev => prev !== todayStr ? todayStr : prev);

      const curHours = now.getHours();
      const curMins = now.getMinutes();
      const totalNowMinutes = curHours * 60 + curMins;


      calendarEvents.forEach(event => {
        // Evaluate condition: Event date is today, and event is not yet notified
        if (!event.notified && event.date === todayStr) {
          const [eventHour, eventMinute] = event.time.split(":").map(Number);
          const totalEventMinutes = eventHour * 60 + eventMinute;
          const diffMinutes = totalEventMinutes - totalNowMinutes;

          // Check if event is starting within 10 minutes and hasn't started more than 1 minute ago
          if (diffMinutes >= 0 && diffMinutes <= 10) {
            // Synthesize warning beep chime (Dual high notes)
            try {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc1 = audioCtx.createOscillator();
              const gain1 = audioCtx.createGain();
              osc1.type = "sine";
              osc1.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 high pitch
              gain1.gain.setValueAtTime(0.12, audioCtx.currentTime);
              gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.38);
              osc1.connect(gain1);
              gain1.connect(audioCtx.destination);
              osc1.start();
              osc1.stop(audioCtx.currentTime + 0.38);
              
              setTimeout(() => {
                const osc2 = audioCtx.createOscillator();
                const gain2 = audioCtx.createGain();
                osc2.type = "sine";
                osc2.frequency.setValueAtTime(1046.5, audioCtx.currentTime); // C6 highest key pitch
                gain2.gain.setValueAtTime(0.12, audioCtx.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.38);
                osc2.connect(gain2);
                gain2.connect(audioCtx.destination);
                osc2.start();
                osc2.stop(audioCtx.currentTime + 0.38);
              }, 120);
            } catch (err) {
              console.warn("Audio chime context is blocked before user gesture", err);
            }

            // Set state for visual banner
            setActiveNotification({
              id: event.id,
              title: event.title,
              time: event.time,
              priority: event.priority
            });

            // Trigger native PC desktop notification also
            const notificationTitle = `【直前アラート】${event.title}`;
            const notificationBody = `予定「${event.title}」が10分以内に開始されます。（開始時間: ${event.time}）`;
            triggerNativeNotification(notificationTitle, notificationBody, { type: "calendar_alarm", url: "/?tab=calendar" });

            // Write logs to both system trace and security logs
            addSystemLog(`[時間喚起アラーム] 10分前お知らせ: 予定「${event.title}」が間もなく開始されます。`);
            
            const auditEntry = createSecurityLogEntry(
              `予定スケジュール検知発報: スケジュール「${event.title}」（時間: ${event.time}）開始10分前アラートがトリガーされました。`,
              "system",
              "warning"
            );
            setSecurityLogs(prev => [auditEntry, ...prev]);

            // Set notified flag inside state to avoid repeating alarm triggers
            setCalendarEvents(prev => prev.map(ev => ev.id === event.id ? { ...ev, notified: true } : ev));
            
            // Sync notified state to IndexedDB as well
            markAlarmAsNotifiedInDb(event.id);
          }
        }
      });
    }, 4000); // Check every 4 seconds for maximum responsiveness

    return () => clearInterval(checkInterval);
  }, [calendarEvents]);

  // Handle parsing CSV automatically
  useEffect(() => {
    try {
      const lines = csvRaw.trim().split("\n");
      if (lines.length < 2) return;
      const headers = lines[0].split(",").map(h => h.trim());
      setColumns(headers);

      // Parse objects
      const items = lines.slice(1).map((line, idx) => {
        const values = line.split(",").map(v => v.trim());
        const obj: any = { id_key: idx };
        headers.forEach((h, i) => {
          const val = values[i];
          obj[h] = !isNaN(Number(val)) ? Number(val) : val;
        });
        return obj;
      });
      setParsedData(items);

      // Default numeric column auto-probing
      const firstData = items[0];
      const matchNumCol = headers.find(h => typeof firstData[h] === "number" && h !== "id_key");
      if (matchNumCol) {
        setNumericColumn(matchNumCol);
      } else {
        setNumericColumn(headers[headers.length - 1] || "");
      }
    } catch (e) {
      console.error("CSV parse error", e);
    }
  }, [csvRaw]);

  // Calculate statistics when numericColumn or parsedData changes
  useEffect(() => {
    if (!numericColumn || parsedData.length === 0) return;
    const values = parsedData.map(d => d[numericColumn]).filter(v => typeof v === "number") as number[];
    if (values.length === 0) {
      setStats({ sum: 0, avg: 0, count: 0, max: 0 });
      return;
    }
    const sum = Number(values.reduce((acc, curr) => acc + curr, 0).toFixed(2));
    const avg = Number((sum / values.length).toFixed(1));
    const max = Math.max(...values);
    setStats({ sum, avg, count: values.length, max });

    // Generate neat C# mapping code for Blazor support automatically!
    // A fantastic gift for our C# Developer using Blazor!
    const className = "BusinessLogModel";
    let propertiesCode = `public class ${className}\n{\n`;
    columns.forEach(col => {
      const sanitizedColName = col.replace(/[^a-zA-Z0-9_]/g, "_");
      const firstObj = parsedData[0];
      const typeStr = typeof firstObj[col] === "number" ? "double" : "string";
      propertiesCode += `    public ${typeStr} ${sanitizedColName} { get; set; }\n`;
    });
    propertiesCode += "}";
    setGeneratedCSharpClass(propertiesCode);

  }, [numericColumn, parsedData, columns]);

  // Timer tick effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            
            const title = timerType === "work" ? "【タイムアップ】集中セッション終了" : "【タイムアップ】休憩時間終了";
            const body = timerType === "work" ? "集中セッションが完了しました！リフレッシュのためにゆっくり休みましょう。" : "休憩時間が終了しました。新しいタスクを開始しましょう。";
            
            // Trigger Native Desktop Notification
            triggerNativeNotification(title, body, { type: "pomodoro_complete", url: "/?tab=timer" });

            // Quick buzz simulation
            addSystemLog(`[INFO] ${timerType === "work" ? "作業時間終了" : "休憩時間終了"}。通知音を鳴らしました。`);
            alert(`${timerType === "work" ? "集中セッションが完了しました！" : "休憩時間が終了しました。"}リフレッシュ完了です！`);
            return timerType === "work" ? 300 : 1500; // switch helper
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerType]);

  const triggerNativeNotification = (title: string, body: string, data?: any) => {
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(title, {
            body,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            vibrate: [100, 50, 100],
            requireInteraction: true,
            data: data || { url: "/" }
          } as any);
        });
      } catch (e) {
        new Notification(title, { body, icon: "/favicon.ico" } as any);
      }
    }
  };

  // Synchronize Active Pomodoro Timer to IndexedDB for offline service worker
  useEffect(() => {
    if (isTimerRunning) {
      syncActiveTimerToDb({
        id: "focus_timer",
        type: timerType,
        targetTimestamp: Date.now() + timerSeconds * 1000,
        isRunning: true
      });
    } else {
      syncActiveTimerToDb(null);
    }
  }, [isTimerRunning, timerType]);

  const addSystemLog = (msg: string) => {
    setSystemLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 15)]);
  };

  const handleAddTask = (newTask: Omit<Task, "id" | "createdAt">) => {
    const item: Task = {
      ...newTask,
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setTasks(prev => [item, ...prev]);
    addSystemLog(`C# EFCore Tracker: タスク '${item.title}' がローカルデータベースにコミットされました。`);
  };

  const handleAddTaskEvent = (newEvent: Omit<CalendarEvent, "id" | "createdAt">) => {
    const item: CalendarEvent = {
      ...newEvent,
      id: `ev-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setCalendarEvents(prev => [item, ...prev]);
    addSystemLog(`Scheduler Engine: 新しい予定「${item.title}」をカレンダーに登録しました。`);
  };

  const handleDeleteTaskEvent = (id: string) => {
    setCalendarEvents(prev => prev.filter(e => e.id !== id));
    addSystemLog(`Scheduler Engine: 予定 ID「${id}」を破棄しました。`);
  };

  const handleAddMultipleTasks = (multiple: Omit<Task, "id" | "createdAt">[]) => {
    const items: Task[] = multiple.map((t, i) => ({
      ...t,
      id: `task-${Date.now()}-${i}`,
      createdAt: new Date().toISOString()
    }));
    setTasks(prev => [...items, ...prev]);
    addSystemLog(`AI Agent: 共有プロジェクト目標から ${items.length} 件のサブタスクを展開・挿入しました。`);
  };

  const handleUpdateTask = (updated: Task) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    addSystemLog(`Transactional Write: タスク [${updated.title.slice(0, 10)}...] の状態を同期。`);
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    addSystemLog(`Warning Tracker: タスク ID: [${id}] が破棄されました。`);
  };

  const handleAddWorkLog = (newLog: Omit<WorkLog, "id">) => {
    const log: WorkLog = {
      ...newLog,
      id: `log-${Date.now()}`
    };
    setWorkLogs(prev => [...prev, log]);
    addSystemLog(`TimeCard API: タイムライン [${newLog.time}] に活動 '${newLog.title}' を書き込みました。`);
  };

  const handleDeleteWorkLog = (id: string) => {
    setWorkLogs(prev => prev.filter(l => l.id !== id));
    addSystemLog(`TimeCard API: 作業活動ログ ID ${id} をタイムラインから除去しました。`);
  };

  // Perform data query with gemini server analyzer
  const handleAnalyzeCSVByAI = async () => {
    setIsAnalyzing(true);
    setAnalyzerError("");
    setAnalysisResult("");

    try {
      const response = await fetch("/api/gemini/analyze-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvData: csvRaw,
          customInstructions: analysisInstructions
        })
      });

      if (!response.ok) {
        throw new Error("Gemini AIによる集計・インサイト分析に失敗しました。ファイル規模やネットワークを確認してください。");
      }

      const data = await response.json();
      if (data.analysis) {
        setAnalysisResult(data.analysis);
        addSystemLog("Gemini Analyzer: 自動データマイニングおよびビジネス集計報告を完了しました。");
      } else {
        throw new Error("返却されたレスポンスの構造が不正です。");
      }
    } catch (err: any) {
      console.error(err);
      setAnalyzerError(err.message || "予期しないエラーです。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatTimerTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Stats cards computations
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === "done").length;
  const inProgressTasks = tasks.filter(t => t.status === "doing").length;
  const totalLoggedMinutes = workLogs.reduce((acc, curr) => acc + curr.durationMinutes, 0);

  if (!currentUserEmail) {
    return (
      <AuthGate
        onLoginSuccess={(email) => {
          localStorage.setItem("AUTH_SESSION_ACTIVE", "true");
          localStorage.setItem("AUTH_CURRENT_USER", email);
          sessionStorage.setItem("AUTH_SESSION_ACTIVE", "true");
          setCurrentUserEmail(email);
          setIsAdmin(email === "admin@nexus.core");
        }}
        addSecurityLog={(log) => setSecurityLogs(prev => [log, ...prev])}
        addSystemLog={addSystemLog}
      />
    );
  }

  return (
    <div className="flex h-screen bg-[#F1F5F9] text-[#1E293B] font-sans antialiased overflow-hidden" id="nexus-app-root">
      
      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-45 lg:hidden transition-opacity duration-200"
        />
      )}
      
      {/* 260px Side Navigation Bar (Styled exactly like the Professional Polish theme, now light mode, responsive) */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 lg:static lg:flex flex flex-col w-[260px] bg-[#F8FAFC] text-slate-800 border-r border-[#E2E8F0] shrink-0 transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`} 
        id="sidebar-panel"
      >
         {/* Title Brand Area - Clicking Brand Title toggles admin mode representation */}
        <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between" id="sidebar-header">
          <div 
            className="text-lg font-extrabold tracking-tight flex items-center gap-2.5 text-slate-800 select-none"
          >
            <div className={`w-5 h-5 rounded-lg shadow-lg flex items-center justify-center transition-colors ${isAdmin ? "bg-rose-500 shadow-rose-500/20" : "bg-[#06B6D4]"}`}>
              <Cpu className={`w-3 h-3 text-white ${isAdmin ? "animate-pulse" : ""}`} />
            </div>
            <span>NEXUS CORE</span>
          </div>
          <div className="flex items-center gap-1.5">
            {isAdmin ? (
              <span className="text-[9px] bg-rose-500/10 text-rose-600 font-bold px-2 py-0.5 rounded-full border border-rose-500/20 flex items-center gap-0.5 shadow-sm">
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
                管理者
              </span>
            ) : (
              <span className="text-[9px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full border border-slate-200">
                PERSONAL
              </span>
            )}
            
            {/* Mobile Sidebar Close Button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer active:scale-95 transition-transform"
              title="メニューを閉じる"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dynamic Sidebar Links */}
        <nav className="flex-1 p-5 space-y-1.5 overflow-y-auto" id="sidebar-navi">
          <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 px-3 mb-2">
            メイン業務効率化
          </p>
          
          <button
            onClick={() => {
              setActiveTab("tasks");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full text-left font-medium text-xs px-4 py-3 rounded-xl flex items-center gap-3 relative transition-all duration-150 ${
              activeTab === "tasks" 
                ? "text-slate-900 font-semibold" 
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {activeTab === "tasks" && (
              <motion.div
                layoutId="activeTabNavIndicator"
                className="absolute inset-0 bg-white border border-slate-200/80 rounded-xl -z-10 shadow-sm"
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
              />
            )}
            <CheckSquare className="w-4 h-4 text-[#06B6D4] relative z-10" />
            <span className="relative z-10">タスク管理ボード</span>
            {tasks.filter(t => t.status !== "done").length > 0 && (
              <span className="ml-auto w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 relative z-10">
                {tasks.filter(t => t.status !== "done").length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab("reporter");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full text-left font-medium text-xs px-4 py-3 rounded-xl flex items-center gap-3 relative transition-all duration-150 ${
              activeTab === "reporter" 
                ? "text-slate-900 font-semibold" 
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {activeTab === "reporter" && (
              <motion.div
                layoutId="activeTabNavIndicator"
                className="absolute inset-0 bg-white border border-slate-200/80 rounded-xl -z-10 shadow-sm"
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
              />
            )}
            <FileText className="w-4 h-4 text-[#06B6D4] relative z-10" />
            <span className="relative z-10">作業記録 ＆ 日報自動作成</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("analyzer");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full text-left font-medium text-xs px-4 py-3 rounded-xl flex items-center gap-3 relative transition-all duration-150 ${
              activeTab === "analyzer" 
                ? "text-slate-900 font-semibold" 
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {activeTab === "analyzer" && (
              <motion.div
                layoutId="activeTabNavIndicator"
                className="absolute inset-0 bg-white border border-slate-200/80 rounded-xl -z-10 shadow-sm"
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
              />
            )}
            <TrendingUp className="w-4 h-4 text-[#06B6D4] relative z-10" />
            <span className="relative z-10">自動データ集計・AI分析</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("timer");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full text-left font-medium text-xs px-4 py-3 rounded-xl flex items-center gap-3 relative transition-all duration-150 ${
              activeTab === "timer" 
                ? "text-slate-900 font-semibold" 
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {activeTab === "timer" && (
              <motion.div
                layoutId="activeTabNavIndicator"
                className="absolute inset-0 bg-white border border-slate-200/80 rounded-xl -z-10 shadow-sm"
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
              />
            )}
            <Clock className="w-4 h-4 text-[#06B6D4] relative z-10" />
            <span className="relative z-10">ポモドーロ ＆ サーバーログ</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("calendar");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full text-left font-medium text-xs px-4 py-3 rounded-xl flex items-center gap-3 relative transition-all duration-150 ${
              activeTab === "calendar" 
                ? "text-slate-900 font-semibold" 
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {activeTab === "calendar" && (
              <motion.div
                layoutId="activeTabNavIndicator"
                className="absolute inset-0 bg-white border border-slate-200/80 rounded-xl -z-10 shadow-sm"
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
              />
            )}
            <Calendar className="w-4 h-4 text-[#06B6D4] relative z-10" />
            <span className="relative z-10">予定カレンダー ＆ 通知</span>
            {calendarEvents.filter(e => !e.notified && e.date === systemTimeDate).length > 0 && (
              <span className="ml-auto w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 relative z-10">
                {calendarEvents.filter(e => !e.notified && e.date === systemTimeDate).length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab("settings");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full text-left font-medium text-xs px-4 py-3 rounded-xl flex items-center gap-3 relative transition-all duration-150 ${
              activeTab === "settings" 
                ? "text-slate-900 font-semibold" 
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {activeTab === "settings" && (
              <motion.div
                layoutId="activeTabNavIndicator"
                className="absolute inset-0 bg-white border border-slate-200/80 rounded-xl -z-10 shadow-sm"
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
              />
            )}
            <Settings className="w-4 h-4 text-[#06B6D4] relative z-10" />
            <span className="relative z-10">設定 ＆ セキュリティログ</span>
          </button>

          <div className="pt-6 border-t border-slate-200 mt-6">
            <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 px-3 mb-2.5">
              開発環境プロパティ
            </p>
            <div className="bg-slate-100/50 border border-slate-200 p-3 rounded-xl text-[10px] space-y-2 font-mono text-slate-600">
              <div className="justify-between flex">
                <span>RUNTIME:</span>
                <span className="text-[#06B6D4] font-semibold">C# Blazor Bridge</span>
              </div>
              <div className="flex justify-between">
                <span>SIGNALR:</span>
                <span className="text-emerald-500 font-semibold">• Active (Local)</span>
              </div>
              <div className="flex justify-between">
                <span>ENV API:</span>
                <span className="text-slate-800">v3.5 Flash</span>
              </div>
            </div>

            <div className="mt-4 px-1">
              {!resetConfirm ? (
                <button
                  type="button"
                  onClick={() => setResetConfirm(true)}
                  className="w-full bg-slate-100 hover:bg-rose-50 hover:text-red-500 hover:border-red-500/25 border border-slate-200 text-[10px] py-1.5 px-3 rounded-lg text-slate-500 transition-all font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  ワークスペースをまっさらに初期化
                </button>
              ) : (
                <div className="bg-rose-50 border border-red-500/20 p-2.5 rounded-xl text-center space-y-2">
                  <p className="text-[9px] text-red-600 leading-normal font-semibold">本当に全データを削除してまっさらにしますか？</p>
                  <div className="flex gap-1.5 justify-center">
                    <button
                      type="button"
                      onClick={handleResetData}
                      className="flex-1 bg-red-500 hover:bg-red-400 text-white text-[9px] font-extrabold py-1 px-1.5 rounded-md transition duration-150 cursor-pointer"
                    >
                      リセット実行
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetConfirm(false)}
                      className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[9px] py-1 px-1.5 rounded-md transition duration-150 cursor-pointer"
                    >
                      窓を閉じる
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Connection status area */}
        <div className="p-5 border-t border-slate-200 bg-slate-50" id="sidebar-footer">
          <div className="text-[11px] text-slate-400 uppercase font-bold">Status</div>
          <div className="text-[13px] text-emerald-500 mt-1 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping shrink-0"></span>
            ● System Stable
          </div>
        </div>
      </aside>

      {/* Main Container Area */}
      <main className="flex-1 flex flex-col overflow-hidden" id="main-frame">
        
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-[#E2E8F0] px-4 sm:px-8 flex items-center justify-between shrink-0" id="top-bar">
          <div className="flex items-center gap-2">
            {/* Hamburger Button for Mobile drawer */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-150 border border-slate-200 cursor-pointer transition-colors mr-1 active:scale-95"
              title="メニューを開く"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-xs bg-slate-100 border border-slate-205 rounded-lg px-2.5 py-1 text-slate-500 font-medium">
              業務効率化ワークスペース v1.0
            </span>
          </div>
          
          <div className="flex items-center gap-6" id="user-controls">
            {/* Quick stats items */}
            <div className="hidden md:flex items-center gap-4 text-xs font-medium text-slate-500">
              <div className="flex items-center gap-1">
                <span>タスク完了率:</span>
                <span className="font-bold text-[#1F2937]">{totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}%</span>
              </div>
              <div className="w-px h-3.5 bg-slate-200"></div>
              <div className="flex items-center gap-1">
                <span>今日の実績記録:</span>
                <span className="font-bold text-[#1F2937]">{Math.round(totalLoggedMinutes / 60 * 10) / 10}h</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 justify-end">
                  {isAdmin && (
                    <span className="text-[9px] bg-rose-600 text-white px-1.5 py-0.5 rounded font-black select-none tracking-wider scale-[0.95] inline-block">
                      管理者
                    </span>
                  )}
                  <span>{currentUserEmail ? currentUserEmail.split("@")[0] : "Kanta"}</span>
                </div>
                <div className="text-[10px] text-[#64748B] font-mono tracking-tight font-semibold truncate max-w-[150px]">
                  {currentUserEmail}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition flex items-center justify-center border border-slate-200 cursor-pointer"
                title="セキュアログアウト"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable workspace wrapper */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8" id="outer-scroller">
          
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" id="mini-dashboard">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25, delay: 0.05 }}
              className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all cursor-default"
            >
              <div className="w-10 h-10 bg-[#6366F1]/10 rounded-xl flex items-center justify-center text-[#6366F1]">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900">{totalTasks}</div>
                <div className="text-[11px] font-bold text-slate-400">総登録タスク</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25, delay: 0.1 }}
              className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all cursor-default"
            >
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900">{doneTasks}</div>
                <div className="text-[11px] font-bold text-slate-400">完了済みタスク</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25, delay: 0.15 }}
              className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all cursor-default"
            >
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900">{totalLoggedMinutes} m</div>
                <div className="text-[11px] font-bold text-slate-400">本日タイムログ計</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25, delay: 0.2 }}
              className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all cursor-default"
            >
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900">{isTimerRunning ? "作業中" : "待機状態"}</div>
                <div className="text-[11px] font-bold text-slate-400">エンジンの稼働状態</div>
              </div>
            </motion.div>
          </div>

          {/* Tab Views */}
          <div className="relative" id="tab-holder">
            <AnimatePresence mode="wait">
              {/* TAB 1: Tasks (KANBAN BOARD & MANAGE) */}
              {activeTab === "tasks" && (
                <motion.div
                  key="tasks-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-slate-800">業務タスクボード</h2>
                  </div>
                  <TaskManager
                    tasks={tasks}
                    onAddTask={handleAddTask}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                    onAddMultipleTasks={handleAddMultipleTasks}
                  />
                </motion.div>
              )}

              {/* TAB 2: Progress timeline & Gemini Daily Reporter */}
              {activeTab === "reporter" && (
                <motion.div
                  key="reporter-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-slate-800">本日の作業記録 & 日報自動作成</h2>
                  </div>
                  <DailyReporter
                    tasks={tasks}
                    workLogs={workLogs}
                    onAddWorkLog={handleAddWorkLog}
                    onDeleteWorkLog={handleDeleteWorkLog}
                  />
                </motion.div>
              )}

              {activeTab === "analyzer" && (
                <motion.div
                  key="analyzer-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="space-y-6"
                  id="analyzer-section"
                >
                  
                  {/* Visual data aggregator headers */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* CSV Input Panel */}
                    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex flex-col justify-between lg:col-span-2">
                      <div>
                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-2">
                          <Upload className="w-5 h-5 text-[#06B6D4]" />
                          データ集計 CSV / TSV生データ入力
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                          日々の自動エクスポートデータ、売上、Excelからコピーしたカンマ区切りテキストを貼り付けてください。数値列が検出され、統計情報およびインサイトが動的に構築されます。
                        </p>
                      </div>

                      <textarea
                        value={csvRaw}
                        onChange={(e) => setCsvRaw(e.target.value)}
                        rows={6}
                        className="w-full bg-slate-50 text-slate-800 border border-slate-200 font-mono text-[10px] p-4 rounded-xl focus:bg-white focus:outline-none focus:border-[#06B6D4] focus:ring-1 focus:ring-[#06B6D4]/30 resize-none leading-relaxed"
                        placeholder="日付,部署,売上金額,作業時間(時間)..."
                      />
                      
                      <div className="flex items-center gap-4 mt-3">
                        <div className="text-[10px] text-slate-500">
                          検出された行数: <strong className="text-slate-800">{parsedData.length} 件</strong>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          検出した列ヘッダー: <strong className="text-slate-800">{columns.slice(0, 5).join(", ")}...</strong>
                        </div>
                      </div>
                    </div>

                    {/* Calculations card (Aggregated metrics) */}
                    <div className="bg-[#F8FAFC] text-slate-800 border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
                          <span className="text-xs font-bold text-slate-500">統計自動集計ツール</span>
                          <Database className="w-4 h-4 text-[#06B6D4]" />
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] text-slate-600 mb-1">集計の基準とする対象列を選択</label>
                            <select
                              value={numericColumn}
                              onChange={(e) => setNumericColumn(e.target.value)}
                              className="bg-white border border-slate-200 focus:outline-none focus:border-[#06B6D4] focus:ring-1 focus:ring-[#06B6D4]/30 rounded-lg px-2.5 py-1.5 text-xs text-slate-850 w-full font-mono"
                            >
                              {columns.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>

                          <div className="pt-2 grid grid-cols-2 gap-3">
                            <div className="bg-white rounded-xl p-3 border border-slate-200">
                              <span className="text-[10px] text-slate-500 block font-medium">合計値</span>
                              <span className="text-lg font-bold text-slate-850 font-mono">{stats.sum.toLocaleString()}</span>
                            </div>
                            <div className="bg-white rounded-xl p-3 border border-slate-200">
                              <span className="text-[10px] text-slate-500 block font-medium">平均値</span>
                              <span className="text-lg font-bold text-slate-850 font-mono">{stats.avg.toLocaleString()}</span>
                            </div>
                            <div className="bg-white rounded-xl p-3 border border-slate-200">
                              <span className="text-[10px] text-slate-500 block font-medium">レコード総数</span>
                              <span className="text-lg font-bold text-slate-850 font-mono">{stats.count}</span>
                            </div>
                            <div className="bg-white rounded-xl p-3 border border-slate-200">
                              <span className="text-[10px] text-slate-500 block font-medium">最大値</span>
                              <span className="text-lg font-bold text-[#06B6D4] font-mono">{stats.max.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-[9px] text-slate-400 font-mono mt-4 leading-normal">
                        C# Data Engine v1.0. Processing local arrays. No raw DB calls.
                      </div>
                    </div>
                  </div>

                  {/* Aggregator Visualization & AI Insight Tab Split */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Left: Dynamic Visual Bar Chart with Clean Native CSS / SVG pairing */}
                    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-[#06B6D4]" />
                          データ変化および生産性トレンド
                        </h4>
                        <p className="text-xs text-slate-500 mb-6 font-medium">
                          選択中の数値指標「<span className="text-[#06B6D4] font-bold">{numericColumn}</span>」の傾向を表示します。
                        </p>
                      </div>

                      <div className="h-64 px-2 flex items-end justify-between gap-2.5 border-b border-dashed border-slate-200 pb-2 bg-slate-50 p-4 rounded-xl">
                        {parsedData.length === 0 ? (
                          <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                            可視化する有効なレコードがありません。
                          </div>
                        ) : (
                          parsedData.slice(0, 8).map((item, idx) => {
                            const val = Number(item[numericColumn]);
                            const percentage = stats.max > 0 ? Math.min(100, Math.max(8, (val / stats.max) * 100)) : 10;
                            return (
                              <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                {/* Tooltip on Hover */}
                                <div className="absolute bottom-full mb-2 bg-[#0F172A] text-white font-mono rounded px-2.5 py-1 text-[9px] opacity-0 group-hover:opacity-100 transition shadow z-10 whitespace-nowrap">
                                  {numericColumn}: {val.toLocaleString()}
                                </div>
                                
                                {/* Glowing Bar */}
                                <div 
                                  className="w-full bg-[#06B6D4] hover:bg-cyan-400 duration-200 rounded-t-lg transition-all"
                                  style={{ height: `${percentage}%` }}
                                ></div>
                                
                                {/* Horizontal label */}
                                <span className="text-[8px] font-mono font-bold text-slate-450 mt-2 truncate max-w-[50px] overflow-ellipsis">
                                  {item["日付"] || item["部署"] || `#${idx + 1}`}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-slate-400 mt-4 px-1">
                        <span>※上位8レコードを自動プロットしています</span>
                        <span className="font-mono text-[9px] text-[#06B6D4]">SUM: {stats.sum.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Right: AI Trend analysis report config */}
                    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-emerald-500" />
                          Gemini AI 自動インサイト & 改善分析
                        </h4>
                        <p className="text-xs text-slate-500 mb-4">
                          貼り戻したCSV配列をGeminiが瞬時に計算。ボトルネックの発見、売上の特異値、チームの生産性改善アイデアを出力します。
                        </p>

                        <div className="mb-4">
                          <label className="block text-[10px] text-slate-400 mb-1">AI への個別質問・集計の絞り込み指示</label>
                          <input
                            type="text"
                            value={analysisInstructions}
                            onChange={(e) => setAnalysisInstructions(e.target.value)}
                            className="w-full bg-slate-50 border border-[#E2E8F0] focus:border-[#06B6D4] focus:outline-none rounded-xl px-3.5 py-2 text-xs text-slate-800"
                          />
                        </div>
                      </div>

                      <div className="flex-1 min-h-[160px] bg-slate-50 text-slate-800 border border-slate-200 rounded-xl p-4 font-mono text-[10px] leading-relaxed max-h-[180px] overflow-y-auto mb-4 whitespace-pre-line">
                        {isAnalyzing ? (
                          <div className="flex flex-col items-center justify-center h-full space-y-2 text-slate-500">
                            <div className="w-6 h-6 border-2 border-cyan-500/35 border-t-[#06B6D4] rounded-full animate-spin"></div>
                            <span>CSV大量データを統合・分析中...</span>
                          </div>
                        ) : analyzerError ? (
                          <span className="text-red-500">{analyzerError}</span>
                        ) : analysisResult ? (
                          <span className="text-slate-800 font-sans leading-relaxed text-xs">{analysisResult}</span>
                        ) : (
                          <span className="text-slate-500">
                            「分析実行」を押すと、ここにGemini AIによるデータ集計レビュー（改善が必要な部署、時間効率のアドバイスなど）がリアルタイムに表示されます。
                          </span>
                        )}
                      </div>

                      <button
                        onClick={handleAnalyzeCSVByAI}
                        disabled={isAnalyzing || parsedData.length === 0}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold py-2.5 px-4 rounded-xl transition duration-200 flex items-center justify-center gap-1.5 disabled:opacity-40"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        データ集計インサイトをAI実行
                      </button>
                    </div>
                  </div>

                  {/* GIFT FOR THE C# BLAZOR DEVELOPER! */}
                  {/* Auto Convert CSV file columns into C# Blazor Class boilerplates */}
                  <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                      <Code className="w-4 h-4 text-[#06B6D4]" />
                      C# Blazor / Entity Framework Model 自動生成（業務効率化）
                    </h4>
                    <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                      あなたがブレイザー(Blazor)開発でそのまま使用できるよう、上記のCSV列に最適化されたC# POCOプロパティモデルを自動的に定義してビルドしました。プロジェクトファイルの作成時にコピーしてご活用ください。
                    </p>

                    <div className="bg-slate-50 rounded-xl font-mono text-[10px] p-4 text-emerald-700 border border-slate-205 overflow-x-auto relative">
                      <div className="absolute top-2.5 right-2.5 bg-white border border-slate-200 rounded px-2 py-1 text-[8px] text-slate-500 font-bold">
                        C# Class Model
                      </div>
                      <pre>{generatedCSharpClass}</pre>
                    </div>
                  </div>
                </motion.div>
              )}

            {/* TAB 4: POMODORO TIMER & SYTEM STATUS CODES */}
            {activeTab === "timer" && (
              <motion.div
                key="timer-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-8"
                id="timer-component-root"
              >
                
                {/* Left Frame: Beautiful Business Pomodoro Timer */}
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-sm flex flex-col justify-between items-center text-center">
                  <div className="w-full">
                    <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center justify-center gap-1.5">
                      <Clock className="w-5 h-5 text-[#06B6D4]" />
                      タスク集中ブレイザータイマー (Blazor Timer)
                    </h3>
                    <p className="text-xs text-slate-500">
                      25分間の集中サイクルと5分の休憩を交互に設定し、頭をスッキリ保ち作業を自動集計。
                    </p>
                  </div>

                  <div className="my-10 relative flex items-center justify-center" id="analog-wheel-holder">
                    {/* Ring Outer */}
                    <div className="w-52 h-52 rounded-full border-4 border-slate-100 flex items-center justify-center relative">
                      <div className="absolute inset-0.5 rounded-full border border-[#06B6D4] opacity-20 border-dashed animate-spin" style={{ animationDuration: "120s" }}></div>
                      
                      {/* Precise Text readout */}
                      <div className="text-center">
                        <div className="text-4xl font-black text-slate-900 font-mono tracking-tight">
                          {formatTimerTime(timerSeconds)}
                        </div>
                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">
                          {timerType === "work" ? "FOCUSING" : "BREAK"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mode Buttons */}
                  <div className="flex gap-2.5 mb-6 w-full max-w-sm">
                    <button
                      onClick={() => {
                        setTimerSeconds(1500);
                        setTimerType("work");
                        setIsTimerRunning(false);
                        addSystemLog("Timer Session: 25分集中モードに切り替え。");
                      }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${
                        timerType === "work" 
                          ? "bg-[#06B6D4]/10 border border-[#06B6D4]/30 text-[#06B6D4]" 
                          : "bg-slate-50 border border-slate-200 text-slate-500"
                      }`}
                    >
                      集中時間 (25m)
                    </button>
                    <button
                      onClick={() => {
                        setTimerSeconds(300);
                        setTimerType("break");
                        setIsTimerRunning(false);
                        addSystemLog("Timer Session: 5分休憩モードに切り替え。");
                      }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${
                        timerType === "break" 
                          ? "bg-[#06B6D4]/10 border border-[#06B6D4]/30 text-[#06B6D4]" 
                          : "bg-slate-50 border border-slate-200 text-slate-500"
                      }`}
                    >
                      休憩時間 (5m)
                    </button>
                  </div>

                  {/* Main play action */}
                  <div className="flex gap-3 w-full max-w-sm">
                    <button
                      onClick={() => {
                        setIsTimerRunning(!isTimerRunning);
                        addSystemLog(isTimerRunning ? "Timer Session: 一時停止。" : "Timer Session: タイマー始動。");
                      }}
                      className={`flex-1 py-3 text-xs font-bold text-white rounded-xl transition duration-150 ${
                        isTimerRunning ? "bg-amber-500 hover:bg-amber-400" : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                      }`}
                    >
                      {isTimerRunning ? "一時停止 (Pose)" : "タイマー始動 (Start)"}
                    </button>
                    <button
                      onClick={() => {
                        setTimerSeconds(timerType === "work" ? 1500 : 300);
                        setIsTimerRunning(false);
                        addSystemLog("Timer Session: カウントダウンをリセット完了。");
                      }}
                      className="bg-slate-100 border border-slate-200 text-slate-600 px-4 py-3 text-xs font-bold rounded-xl hover:bg-slate-250 transition"
                    >
                      リセット
                    </button>
                  </div>
                </div>

                {/* Right Frame: Simulated C# Blazor SignalR Output Log Stream */}
                {/* Gives the user a highly customizable tech-dashboard experience matching their Blazor C# background */}
                <div className="bg-white text-slate-800 border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-[#06B6D4]" />
                        C# / Blazor SignalR Hub ステータス通信ログ
                      </h3>
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 py-0.5 px-2 rounded font-mono font-bold animate-pulse">
                        ONLINE HUB
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mb-4 leading-normal">
                      アプリケーションがトリガーしたデータベースクエリ、AIプロンプト、タイムスケジュールの変更などは、C# Blazorアーキテクチャに準じたローカルシミュレーション状態で完全に記録されます。
                    </p>

                    <div className="bg-slate-50 rounded-xl p-4 font-mono text-[10px] text-slate-700 space-y-2 h-[260px] overflow-y-auto leading-relaxed border border-slate-200">
                      {systemLogs.map((log, i) => (
                        <div key={i} className="hover:bg-slate-200 py-0.5 px-1 rounded transition duration-100">
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-4 text-[10px] text-slate-400 font-mono">
                    <span>Active Port: 3000 (HTTPS)</span>
                    <span>Buffer: Stable</span>
                  </div>
                </div>

                </motion.div>
              )}

              {activeTab === "calendar" && (
                <motion.div
                  key="calendar-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <CalendarView
                    events={calendarEvents}
                    onAddEvent={handleAddTaskEvent}
                    onDeleteEvent={handleDeleteTaskEvent}
                    systemTime={systemTimeDate}
                  />
                </motion.div>
              )}

              {activeTab === "settings" && currentUserEmail && (
                <motion.div
                  key="settings-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-800">セキュリティ & ワークスペース環境設定</h2>
                  </div>
                  <SettingsAndLogs
                    email={currentUserEmail}
                    securityLogs={securityLogs}
                    onUpdateCredentials={handleUpdateCredentials}
                    onClearSecurityLogs={() => {
                      setSecurityLogs([]);
                      addSystemLog("Security Engine: セキュリティ監査履歴をクリアしました。");
                    }}
                    onResetWorkspace={handleResetData}
                    addSystemLog={addSystemLog}
                    isAdmin={isAdmin}
                    onToggleAdmin={setIsAdmin}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </main>

      {/* Visual Alarms Toast Notification overlay */}
      <AnimatePresence>
        {activeNotification && (
          <motion.div
            initial={{ opacity: 0, x: 100, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, x: 50 }}
            className="fixed bottom-6 right-6 z-50 bg-white border-2 border-amber-300 rounded-2xl shadow-xl p-5 max-w-sm flex gap-4 ring-4 ring-amber-500/10 cursor-default"
            id="active-alarm-toast"
          >
            <div className="w-10 h-10 bg-amber-100 flex items-center justify-center text-amber-600 rounded-xl animate-bounce shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            
            <div className="space-y-1.5 flex-1 select-none">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-black">
                  10分前通知発報
                </span>
                <span className="text-[11px] font-mono text-slate-400 font-bold">
                  {activeNotification.time}
                </span>
              </div>
              <h4 className="font-extrabold text-xs text-slate-800 leading-snug">
                予定: {activeNotification.title}
              </h4>
              <p className="text-[11px] text-slate-500 leading-normal">
                上記の予定開始時刻の10分前になりました。ご準備をお願いします。
              </p>
              
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setActiveNotification(null)}
                  className="bg-slate-900 text-white rounded-lg px-3 py-1.5 text-[10px] font-bold hover:bg-slate-800 transition shadow cursor-pointer"
                >
                  了解、確認しました
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
