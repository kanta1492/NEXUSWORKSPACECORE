/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  Mic, 
  Square, 
  Trash2, 
  Copy, 
  Check, 
  Download, 
  FileText, 
  AlertCircle, 
  Clock, 
  Search, 
  Save, 
  FileCheck,
  Languages,
  Terminal
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SavedMinutes {
  id: string;
  title: string;
  date: string;
  category: string;
  transcript: string;
  markdown: string;
  durationMinutes: number;
  createdAt: string;
  userEmail?: string;
}

interface MinutesTrackerProps {
  currentUserDisplayName?: string;
  currentUserEmail?: string | null;
  isAdmin?: boolean;
  addSystemLog: (msg: string) => void;
  addSecurityLog: (log: any) => void;
}

export default function MinutesTracker({
  currentUserDisplayName = "ユーザー",
  currentUserEmail = null,
  isAdmin = false,
  addSystemLog,
  addSecurityLog
}: MinutesTrackerProps) {
  const [meetingTitle, setMeetingTitle] = useState("移行設計＆システム再設計会議");
  const [category, setCategory] = useState("開発・設計");
  const [option, setOption] = useState("決定事項とToGoリストを極めて具体的にリストに整理してください。");
  
  // Transcription states
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [meetingDuration, setMeetingDuration] = useState(0); // in seconds
  
  // Speech Recognition API ref
  const recognitionRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);
  const simulateTimeoutRef = useRef<any>(null);
  
  // UI and summary compiler states
  const [compiledMinutes, setCompiledMinutes] = useState("");
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileError, setCompileError] = useState("");
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [copiedMinutes, setCopiedMinutes] = useState(false);
  
  // Saved History Database states
  const [history, setHistory] = useState<SavedMinutes[]>(() => {
    const cached = localStorage.getItem("BIZ_MEETING_MINUTES_HISTORY_DB");
    return cached ? JSON.parse(cached) : [
      {
        id: "hist-1",
        title: "C#移行キックオフ定例会議",
        date: "2026-06-02",
        category: "一般定例",
        transcript: "鈴木: それではC#プロジェクトの件ですが、リプレイス計画を共有します。来週中にインフラの構築を完了します。佐藤: 了解です。データベースの接続文字列プロパティについては、設定ページの暗号化を徹底しましょう。",
        markdown: `# 議事録: C#移行キックオフ定例会議\n\n## 1. 会議概要\n* **日時**: 2026年6月2日\n* **主要テーマ**: Blazor/C#へのシステムリプレイスにおけるインフラ配置、認証キーの整合・暗号化確認。\n\n## 2. 決定事項 (Decisions)\n* 来週日曜までに、本番接続用のインフラ環境を完了・展開する。\n* 各種接続情報、認証プロパティは「設定 ＆ セキュリティログ」の暗号化に則り処理する。\n\n## 3. ToDoリスト・Next Actions\n* [鈴木] インフラ配置の検証 (期限: 6月9日)\n* [佐藤] セキュアWebStorage APIの統合・DB疎通コードの作成 (期限: 6月11日)\n\n## 4. 議論の要約 (Detailed Summary)\n開発側佐藤さんよりインデックス改善で30%の速度向上が可能とのエビデンスが提出され、C# EFCoreのリファクタ方針をこれに統一することに全員同意。セキュリティ観点からの設定暗号化も鈴木さんのガイドラインに沿う形に決定。`,
        durationMinutes: 12,
        createdAt: new Date().toISOString()
      },
      {
        id: "hist-2",
        title: "ユーザーインターフェイス (UI/UX) 設計調整",
        date: "2026-06-01",
        category: "企画・ブレスト",
        transcript: "高橋: ユーザーが直感的に使えるようダッシュボードをすっきりさせたいです。白石: 賛成です。不要な margin indicator などを無くし、カード中心のデザインが良いですね。",
        markdown: `# 議事録: UI/UX設計調整\n\n## 1. 会議概要\n* **議題**: ダッシュボードのスマート化、不要なメーターやログ表示の削減（対話率の向上）。\n\n## 2. 決定事項 (Decisions)\n* 余分な margin indicator を削除し、カード間隔を均一な1.5remに統一。\n* 個人作業記録とカンバンボードを1クリックで往来できるレスポンシブなタブ設計とする。\n\n## 3. ToDoリスト\n* [高橋] 新規タブ遷移に関するモーション定義とチェック (期限: 6月5日)\n* [白石] レスポンシブフットプリントの確認 (期限: 6月6日)`,
        durationMinutes: 8,
        createdAt: new Date().toISOString()
      }
    ];
  });
  
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Simulated dialogue pieces to stream
  const SIMULATOR_DIALOGUES = [
    { speaker: "佐藤 健一", text: `お疲れ様です。本日のC# Blazor移行マイルストーン会議を始めます。まずは現在の進行状況を鈴木さんからお願いします。今回は${currentUserDisplayName}さんにも設計統括としてご意見をいただいています。` },
    { speaker: "鈴木 茂", text: "はい、コントローラーのEFCoreバインド部分のリファクタリングですが、本日90%完了しました。残る件は例外処理だけです。" },
    { speaker: currentUserDisplayName, text: "設計チームとしては、処理エラーが起きた場合にシステム全データ破損を防ぐため、「セキュリティ監査ログトレール」へ正しく警告をコミットできるようインターフェースを結合してください。" },
    { speaker: "高橋 翔", text: "UI/UXデザイン側ですが、スマートに仕上げるために不要な margin indicator などを排したシンプルなカード型のダッシュボードを構成し、Tailwind CSSでの描画パフォーマンスを約40%軽量化することに成功しています。" },
    { speaker: "佐藤 健一", text: "高橋さん、ありがとうございます。鈴木さんは自動トランザクションとセキュリティログ格納の統合、高橋さんはUI軽量化コードのマージを夕方までに進めてください。これでミーティングを完了します。" }
  ];

  const dialogueIndexRef = useRef(0);

  // Sync history to general local database
  useEffect(() => {
    localStorage.setItem("BIZ_MEETING_MINUTES_HISTORY_DB", JSON.stringify(history));
  }, [history]);

  // Audio simulation timer
  useEffect(() => {
    if (isRecording || isSimulating) {
      timerIntervalRef.current = setInterval(() => {
        setMeetingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRecording, isSimulating]);

  // Web Speech API - SpeechRecognition binding
  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addSystemLog("Speech Recognition: このブラウザ・環境は Web Speech API 非対応です。代わりに高精度シミュレーション入力が利用可能です。");
      return false;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "ja-JP";

      rec.onstart = () => {
        addSystemLog("Speech Recognition: リアルタイムマイクからの音声認識・テキスト化を開始しました。");
      };

      rec.onresult = (e: any) => {
        let finalStr = "";
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            finalStr += e.results[i][0].transcript + " ";
          }
        }
        if (finalStr) {
          setTranscript(prev => prev + (prev.endsWith(" ") || prev === "" ? "" : "\n") + `【${currentUserDisplayName}】: ` + finalStr.trim());
        }
      };

      rec.onerror = (err: any) => {
        console.error("Speech Recognition Error:", err);
        addSystemLog(`Speech Recognition Error: ${err.error}. 認識制限または権限がありません。`);
      };

      rec.onend = () => {
        addSystemLog("Speech Recognition: リアルタイム音声認識を停止しました。");
        setIsRecording(false);
      };

      recognitionRef.current = rec;
      rec.start();
      return true;
    } catch (e: any) {
      console.error(e);
      addSystemLog("Speech Recognition: 起動エラーが発生しました。");
      return false;
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error(e);
      }
      recognitionRef.current = null;
    }
  };

  // Start actual meeting recording
  const handleToggleRecord = () => {
    if (isSimulating) {
      handleStopSimulation();
    }

    if (isRecording) {
      stopSpeechRecognition();
      setIsRecording(false);
    } else {
      const success = startSpeechRecognition();
      if (success) {
        setIsRecording(true);
      } else {
        // Fallback to simulation invitation
        addSystemLog("Speech Recognition: 代替手段として会議音声シミュレーターをスタートします。");
        handleStartSimulation();
      }
    }
  };

  // Automated Simulation dialogue feed
  const handleStartSimulation = () => {
    if (isRecording) {
      stopSpeechRecognition();
      setIsRecording(false);
    }

    setIsSimulating(true);
    dialogueIndexRef.current = 0;
    setTranscript("--- 会議シミュレーション（自動音声文字起こし再現）配信開始 ---\n");
    addSystemLog("Simulated Feed: 会議対話ストリームシミュレーターを起動。");
    
    streamNextDialoguePiece();
  };

  const streamNextDialoguePiece = () => {
    const idx = dialogueIndexRef.current;
    if (idx < SIMULATOR_DIALOGUES.length) {
      const piece = SIMULATOR_DIALOGUES[idx];
      
      simulateTimeoutRef.current = setTimeout(() => {
        setTranscript(prev => prev + `\n【${piece.speaker}】: ${piece.text}`);
        dialogueIndexRef.current += 1;
        streamNextDialoguePiece();
      }, 3500); // Send new speech part every 3.5 seconds
    } else {
      simulateTimeoutRef.current = setTimeout(() => {
        setTranscript(prev => prev + "\n\n--- 音声テキスト化（レコーディング）が終了しました。 ---");
        setIsSimulating(false);
        addSystemLog("Simulated Feed: ストリームすべての文字起こしパース完了。");
      }, 3000);
    }
  };

  const handleStopSimulation = () => {
    if (simulateTimeoutRef.current) {
      clearTimeout(simulateTimeoutRef.current);
    }
    setIsSimulating(false);
    addSystemLog("Simulated Feed: シミュレーション配信を途中で中断。");
  };

  // Call the Gemini Express router
  const handleCompileMinutes = async () => {
    if (!transcript.trim()) return;
    
    setIsCompiling(true);
    setCompileError("");
    setCompiledMinutes("");
    addSystemLog(`Gemini Minutes: 『${meetingTitle}』の音声トランスクリプト（文字起こし）から議事録を編集作成します...`);

    try {
      const response = await fetch("/api/gemini/summarize-minutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcript,
          title: meetingTitle,
          option: option
        })
      });

      if (!response.ok) {
        throw new Error("議事録作成に失敗しました。サーバー側の通信エラーか、GEMINI_API_KEYが無い可能性があります。");
      }

      const data = await response.json();
      if (data.result) {
        setCompiledMinutes(data.result);
        addSystemLog(`Gemini Minutes: 『${meetingTitle}』の議事録作成に成功しました。`);
      } else {
        throw new Error("返却されたレスポンスにデータが格納されていません。");
      }
    } catch (e: any) {
      console.error(e);
      setCompileError(e.message || "予期しない通信エラーが発生しました。");
      addSystemLog(`Gemini Minutes Error: ${e.message}`);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleSaveResultToHistory = () => {
    if (!compiledMinutes) return;

    const newRecord: SavedMinutes = {
      id: `minutes-${Date.now()}`,
      title: meetingTitle,
      date: new Date().toISOString().split("T")[0],
      category: category,
      transcript: transcript,
      markdown: compiledMinutes,
      durationMinutes: Math.max(1, Math.round(meetingDuration / 60)),
      createdAt: new Date().toISOString(),
      userEmail: currentUserEmail || undefined
    };

    setHistory(prev => [newRecord, ...prev]);
    setSelectedHistoryId(newRecord.id);
    addSystemLog(`Saved Database: 議事録『${meetingTitle}』をローカル履歴データベースへ保存。`);
    
    // Trigger security audit log
    addSecurityLog({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      event: `会議議事録のシステム登録を完了しました（タイトル: ${meetingTitle}）`,
      category: "system",
      ipAddress: "127.0.0.1",
      userAgent: navigator.userAgent,
      status: "success"
    });
  };

  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("この議事録履歴を削除しますか？")) {
      setHistory(prev => prev.filter(item => item.id !== id));
      if (selectedHistoryId === id) {
        setSelectedHistoryId(null);
        setCompiledMinutes("");
        setTranscript("");
      }
      addSystemLog(`Saved Database: 履歴インデックス ${id} を削除しました。`);
    }
  };

  const copyToClipboard = (text: string, setCopiedState: (v: boolean) => void) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
  };

  const downloadAsFile = (title: string, content: string) => {
    if (!content) return;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${title.replace(/\s+/g, "_")}_議事録.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addSystemLog(`Exporter: Markdownファイル「${title}_議事録.md」をローカルにエクスポート。`);
  };

  const formatSeconds = (sec: number) => {
    const mm = Math.floor(sec / 60).toString().padStart(2, "0");
    const ss = (sec % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  // Administrative user filter for minutes history
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>("all");
  
  // Resolve User Maps from local storage
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  useEffect(() => {
    try {
      const mapStr = localStorage.getItem("BIZ_USERS_MAP");
      if (mapStr) {
        setUsersMap(JSON.parse(mapStr));
      }
    } catch (e) {}
  }, [currentUserEmail]);

  // Extract unique users who saved minutes
  const registeredUsers = React.useMemo(() => {
    const list: { email: string; displayName: string }[] = [];
    Object.keys(usersMap).forEach((emailKey) => {
      const u = usersMap[emailKey];
      if (u && u.email) {
        list.push({
          email: u.email,
          displayName: u.displayName || (u.email.includes("@") ? u.email.split("@")[0] : u.email),
        });
      }
    });
    return list;
  }, [usersMap]);

  const filteredHistory = React.useMemo(() => {
    let result = history;

    // Filter by user based on role
    if (!isAdmin) {
      result = history.filter(item => !item.userEmail || item.userEmail.toLowerCase() === currentUserEmail?.toLowerCase());
    } else {
      if (selectedUserFilter !== "all") {
        result = history.filter(item => item.userEmail?.toLowerCase() === selectedUserFilter.toLowerCase());
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.title.toLowerCase().includes(q) || 
        item.transcript.toLowerCase().includes(q) || 
        item.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [history, isAdmin, currentUserEmail, selectedUserFilter, searchQuery]);

  const getUserNameByEmail = (email?: string) => {
    if (!email) return "共通/初期";
    const lower = email.toLowerCase();
    return usersMap[lower]?.displayName || email.split("@")[0];
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="minutes-module-root">
      
      {/* LEFT COLUMN: Controls & Input Area (7 cols) */}
      <div className="lg:col-span-7 flex flex-col gap-6" id="minutes-controls-col">
        
        {/* SETUP CARD */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4" id="minutes-setup-card">
          <div className="flex items-center gap-2 mb-1">
            <Languages className="w-5 h-5 text-[#06B6D4]" />
            <h3 className="text-sm font-bold text-slate-800">1. ミーティング設定</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[10px] text-slate-500 font-bold mb-1">会議テーマ / 議題名</label>
              <input
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="例: AWS移行プラン擦り合わせ..."
                className="w-full bg-slate-50 border border-[#E2E8F0] focus:border-[#06B6D4] focus:outline-none rounded-xl px-3.5 py-2 text-xs text-slate-800 font-medium"
              />
            </div>
            
            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-1">実務分類</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-[#E2E8F0] focus:border-[#06B6D4] focus:outline-none rounded-xl px-3 py-2 text-xs text-slate-800"
              >
                <option value="開発・設計">開発・設計</option>
                <option value="一般定例">一般定例・朝会</option>
                <option value="企画・ブレスト">企画・ブレスト</option>
                <option value="営業・商談">営業・商談</option>
                <option value="人事・面接">人事・労務</option>
                <option value="その他実務">その他実務</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 font-bold mb-1">AIへの追加個別提示（指示オプション）</label>
            <input
              type="text"
              value={option}
              onChange={(e) => setOption(e.target.value)}
              placeholder="例: ToDoを期日順に整理して、鈴木さんに厳密にタスクを割り振ってなど"
              className="w-full bg-slate-50 border border-[#E2E8F0] focus:border-[#06B6D4] focus:outline-none rounded-xl px-3.5 py-2 text-xs text-slate-800"
            />
          </div>
        </div>

        {/* TRANSCRIPT VIEW CARD */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex flex-col justify-between flex-1" id="minutes-recorder-card">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Mic className="w-4 h-4 text-slate-550" />
                  2. 会議発言の音声入力・文字起こし
                </h4>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                  マイクボタンで直接の音声入力を行うか、模擬会議シミュレーターで発言記録をシミュレートできます。
                </p>
              </div>
              
              <div className="text-right">
                <span className="bg-slate-100 border border-[#E2E8F0] text-slate-600 text-[10px] font-mono py-1 px-3 rounded-full font-bold">
                  経過時間: {formatSeconds(meetingDuration)}
                </span>
              </div>
            </div>

            {/* Glowing active waveform helper bar */}
            {(isRecording || isSimulating) && (
              <div className="bg-[#0F172A] p-2.5 rounded-xl mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-455 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    {isRecording ? "DIRECT MICROPHONE RECORDING ACTIVE..." : "CONFERENCE TRANSCRIPTION STREAMING..."}
                  </span>
                </div>
                
                {/* Equalizer animation visual */}
                <div className="flex items-end gap-1 h-3 shrink-0">
                  <span className="w-0.5 h-1.5 bg-cyan-400 rounded-full animate-[pulse_0.7s_infinite_alternate]"></span>
                  <span className="w-0.5 h-3 bg-cyan-400 rounded-full animate-[pulse_0.5s_infinite_alternate_0.1s]"></span>
                  <span className="w-0.5 h-2 bg-cyan-400 rounded-full animate-[pulse_0.6s_infinite_alternate_0.2s]"></span>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2.5 mb-4">
              <button
                type="button"
                onClick={handleToggleRecord}
                className={`text-xs px-4 py-2.5 rounded-xl font-bold transition duration-150 flex items-center gap-1.5 border ${
                  isRecording 
                    ? "bg-rose-50 border-rose-300 text-rose-600 shadow-md scale-[1.01]" 
                    : "bg-[#F8FAFC] border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {isRecording ? (
                  <>
                    <Square className="w-3.5 h-3.5 text-rose-500" />
                    マイク入力を停止
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-slate-500" />
                    マイク録音（音声を文字起こし）
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={isSimulating ? handleStopSimulation : handleStartSimulation}
                className={`text-xs px-4 py-2.5 rounded-xl font-bold transition duration-150 flex items-center gap-1.5 border ${
                  isSimulating 
                    ? "bg-cyan-50 border-cyan-300 text-cyan-600 shadow-md scale-[1.01]" 
                    : "bg-[#F8FAFC] border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {isSimulating ? (
                  <>
                    <Square className="w-3.5 h-3.5 text-cyan-500" />
                    シミュレートを停止
                  </>
                ) : (
                  <>
                    <Terminal className="w-3.5 h-3.5 text-cyan-505" />
                    デモ会議 テキスト自動シミュレート
                  </>
                )}
              </button>

              {transcript.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("これまでの文字起こし記録をクリアしますか？")) {
                      setTranscript("");
                      setMeetingDuration(0);
                    }
                  }}
                  className="bg-slate-50 border border-slate-200 hover:bg-red-50 hover:text-red-500 text-slate-500 px-3.5 py-2 text-xs font-bold rounded-xl transition"
                >
                  リセット
                </button>
              )}
            </div>

            {/* Editable transcript box */}
            <div className="relative">
              <span className="absolute bottom-2.5 right-2 text-[9px] text-slate-400 font-mono select-none bg-slate-55 px-1.5 py-0.5 rounded">
                文字数: {transcript.length}
              </span>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={`【発言記録がここにリアルタイムで記録されます】
マイクから直接話す（Web Speech API）か、または「デモ会議 テキスト自動シミュレート」をクリックすると、メンバー（佐藤、鈴木、高橋、${currentUserDisplayName}）の音声文字起こしが模擬展開されます。
直接テキストエリアに入力・修正・コピーしての持ち込み編集も自由に行えます。`}
                rows={12}
                className="w-full bg-slate-50 text-slate-800 border border-slate-200 font-mono text-[11px] p-4 rounded-xl focus:bg-white focus:outline-none focus:border-[#06B6D4] focus:ring-1 focus:ring-[#06B6D4]/30 leading-relaxed resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
            <button
              onClick={() => copyToClipboard(transcript, setCopiedTranscript)}
              disabled={!transcript}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-bold duration-150 flex items-center gap-1 disabled:opacity-40"
            >
              {copiedTranscript ? (
                <>
                  <Check className="w-3 h-3 text-[#06B6D4]" />
                  コピー完了!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  発言レコードをコピー
                </>
              )}
            </button>

            <button
              onClick={handleCompileMinutes}
              disabled={isCompiling || !transcript.trim()}
              className="bg-[#06B6D4] hover:bg-[#0ea5e9] text-white text-xs font-bold px-6 py-2.5 rounded-xl transition duration-150 shadow-md flex items-center gap-1.5 disabled:opacity-40"
            >
              {isCompiling ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  AIで自動まとめ＆構成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  録音終了・自動で議事録を作成
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Output Preview & Saved Library sidebar (5 cols) */}
      <div className="lg:col-span-5 flex flex-col gap-6" id="minutes-history-col">
        
        {/* COMPILED MINUTES PANEL */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex-1 flex flex-col justify-between min-h-[420px]" id="compiled-minutes-panel">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <FileCheck className="w-5 h-5 text-[#06B6D4]" />
                3. 完成したAI議事録 (Markdown成果物)
              </h3>
              
              {compiledMinutes && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => downloadAsFile(meetingTitle, compiledMinutes)}
                    className="p-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 transition"
                    title="Markdownダウンロード"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => copyToClipboard(compiledMinutes, setCopiedMinutes)}
                    className="p-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 transition"
                    title="クリップボードにコピー"
                  >
                    {copiedMinutes ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>

            {compileError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>エラーが発生しました: {compileError}</span>
              </div>
            )}
          </div>

          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-4 overflow-y-auto max-h-[360px]" id="final-markdown-preview-block">
            {isCompiling ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3.5 py-12">
                <div className="relative">
                  <div className="w-12 h-12 border-3 border-cyan-500/20 border-t-[#06B6D4] rounded-full animate-spin"></div>
                  <Sparkles className="w-5 h-5 text-[#06B6D4] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-800">Gemini AI が議事録を構築中...</p>
                  <p className="text-[10px] text-slate-500 max-w-xs">決定事項の整理、ToDoタスクの切り出し、議論全体の要約をMarkdownで綺麗にフォーマットしています。</p>
                </div>
              </div>
            ) : compiledMinutes ? (
              <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-line font-sans" id="compiled-final-markdown">
                {compiledMinutes}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 select-none py-16">
                <FileText className="w-10 h-10 mb-2 opacity-30 text-[#06B6D4]" />
                <p className="text-xs font-bold">自動要約・議事録の表示エリア</p>
                <p className="text-[10px] max-w-sm mt-1 leading-normal text-slate-500">
                  左側で会議のテキストを録音またはシミュレートし、「録音終了・自動で議事録を作成」をクリックすると、Gemini AIが決定事項やToDoを整理して出力します。
                </p>
              </div>
            )}
          </div>

          {compiledMinutes && !isCompiling && (
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleSaveResultToHistory}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold px-4 py-2 rounded-xl transition duration-150 shadow-sm flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                議事録を履歴データベースに保存
              </button>
            </div>
          )}
        </div>

        {/* LOG HISTORY DATABASE */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4" id="minutes-history-card">
          <div className="flex items-center justify-between pb-2 border-b border-slate-150">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#06B6D4]" />
              議事録の保存履歴 ({filteredHistory.length}件 / 全{history.length}件)
            </h4>
          </div>

          {isAdmin && (
            <div className="bg-cyan-50/50 border border-cyan-100 p-3 rounded-xl space-y-1.5" id="admin-minutes-history-filter">
              <label className="block text-[10px] text-cyan-600 font-bold">メンバー別に絞り込み（管理者限定）</label>
              <select
                value={selectedUserFilter}
                onChange={(e) => setSelectedUserFilter(e.target.value)}
                className="w-full bg-white border border-cyan-200 focus:outline-[#06B6D4] rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold cursor-pointer"
              >
                <option value="all">👥 すべてのメンバー（合算表示）</option>
                {registeredUsers.map((u) => (
                  <option key={u.email} value={u.email}>
                    👤 {u.displayName} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="議題名やカテゴリーから履歴検索..."
              className="w-full bg-slate-50 border border-[#E2E8F0] focus:border-[#06B6D4] focus:outline-none rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800"
            />
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-6 text-[10px] text-slate-400 font-semibold border border-dashed border-slate-200 rounded-xl bg-slate-50">
                該当する保存議事録が見つかりません。
              </div>
            ) : (
              filteredHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedHistoryId(item.id);
                    setMeetingTitle(item.title);
                    setCategory(item.category);
                    setTranscript(item.transcript);
                    setCompiledMinutes(item.markdown);
                    addSystemLog(`Saved Database: 議事録履歴「${item.title}」を読み出しました。`);
                  }}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition flex items-center justify-between gap-2 group ${
                    selectedHistoryId === item.id
                      ? "bg-cyan-50/40 border-[#06B6D4] text-[#06B6D4]"
                      : "bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold flex-wrap">
                      <span>{item.date}</span>
                      <span>•</span>
                      <span className="text-[#06B6D4]">{item.category}</span>
                      <span>•</span>
                      <span>{item.durationMinutes}分</span>
                      {item.userEmail && (
                        <>
                          <span>•</span>
                          <span className="text-slate-500 font-extrabold bg-[#06B6D4]/10 text-[#06B6D4] px-1.5 py-0.5 rounded">👤 {getUserNameByEmail(item.userEmail)}</span>
                        </>
                      )}
                    </div>
                    <h5 className="text-xs font-extrabold text-slate-800 truncate mt-1">
                      {item.title}
                    </h5>
                  </div>

                  <button
                    onClick={(e) => handleDeleteHistory(item.id, e)}
                    className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1 rounded transition"
                    title="削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
