/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Task, WorkLog } from "../types";
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Clock, 
  FileText, 
  AlertCircle 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DailyReporterProps {
  tasks: Task[];
  workLogs: WorkLog[];
  onAddWorkLog: (log: Omit<WorkLog, "id">) => void;
  onDeleteWorkLog: (id: string) => void;
}

export default function DailyReporter({
  tasks,
  workLogs,
  onAddWorkLog,
  onDeleteWorkLog,
}: DailyReporterProps) {
  const [logTime, setLogTime] = useState("09:00");
  const [logTitle, setLogTitle] = useState("");
  const [logCategory, setLogCategory] = useState<WorkLog["category"]>("operational");
  const [logDuration, setLogDuration] = useState(60);
  const [logNotes, setLogNotes] = useState("");

  // Gemini generator states
  const [generatedReport, setGeneratedReport] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [copied, setCopied] = useState(false);

  const categoriesMap: Record<WorkLog["category"], { label: string; color: string }> = {
    meeting: { label: "会議・打合せ", color: "bg-purple-50 text-purple-600 border-purple-200" },
    operational: { label: "一般事務・定例", color: "bg-slate-50 text-slate-605 border-slate-200" },
    creative: { label: "開発・制作", color: "bg-cyan-50 text-cyan-600 border-cyan-200" },
    research: { label: "調査・リサーチ", color: "bg-amber-50 text-amber-600 border-amber-200" },
    break: { label: "休憩・ブレイク", color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
    other: { label: "その他", color: "bg-rose-50 text-rose-600 border-rose-200" },
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTitle.trim()) return;

    onAddWorkLog({
      time: logTime,
      title: logTitle,
      category: logCategory,
      durationMinutes: Number(logDuration),
      notes: logNotes.trim() || undefined,
    });

    setLogTitle("");
    setLogNotes("");
  };

  // Trigger server-side daily report generator using complete data
  const handleGenerateReportByAI = async () => {
    setIsGenerating(true);
    setGenerationError("");
    setGeneratedReport("");

    // Gather tasks to provide high context matching current state
    const todayTasks = tasks.map((t) => ({
      title: t.title,
      status: t.status === "todo" ? "未着手" : t.status === "doing" ? "着手中" : "完了",
      priority: t.priority === "high" ? "高" : t.priority === "medium" ? "中" : "低",
      estimatedHours: t.estimatedHours,
      actualHours: t.actualHours,
      category: t.category,
      checklistProgress: t.checklist.length > 0 ? `${t.checklist.filter(c => c.completed).length}/${t.checklist.length}完了` : "なし"
    }));

    const todayTimeline = workLogs.map((l) => ({
      time: l.time,
      task: l.title,
      category: categoriesMap[l.category].label,
      durationMinutes: l.durationMinutes,
      notes: l.notes || ""
    }));

    try {
      const response = await fetch("/api/gemini/summarize-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: todayTasks,
          workLogs: todayTimeline
        }),
      });

      if (!response.ok) {
        throw new Error("日報の生成に失敗しました。サーバーに一時的な問題が発生している可能性があります。");
      }

      const data = await response.json();
      if (data.report) {
        setGeneratedReport(data.report);
      } else {
        throw new Error("レポートのデータフォーマットが不正です。");
      }
    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || "予期しないエラーが発生しました。");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedReport) return;
    navigator.clipboard.writeText(generatedReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="daily-reporter-root">
      
      {/* Left Panel: Activity list and Log creation (5 cols) */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Form panel */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm" id="time-log-generator">
          <h3 className="text-sm font-bold text-slate-805 flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-[#06B6D4]" />
            タイムライン追加（作業ログ）
          </h3>
          <p className="text-xs text-slate-500 mb-5 leading-normal">
            今日完了した特定のタスク、またはMTGや障害対応などタイムスケジュールの経過時間（分）を入力して時間配分を把握。
          </p>

          <form onSubmit={handleAddLog} className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-slate-450 font-bold mb-1">開始時間</label>
                <input
                  type="time"
                  value={logTime}
                  onChange={(e) => setLogTime(e.target.value)}
                  className="w-full bg-slate-50 border border-[#E2E8F0] focus:border-[#06B6D4] focus:outline-none rounded-xl px-3 py-2 text-xs font-mono text-slate-800"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-455 font-bold mb-1">カテゴリー</label>
                <select
                  value={logCategory}
                  onChange={(e) => setLogCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-[#E2E8F0] focus:border-[#06B6D4] focus:outline-none rounded-xl px-3 py-2 text-xs text-slate-800"
                >
                  <option value="operational">一般事務・定例</option>
                  <option value="creative">開発・制作・創作</option>
                  <option value="meeting">ミーティング・折衝</option>
                  <option value="research">リサーチ・資料収集</option>
                  <option value="break">休憩・昼食</option>
                  <option value="other">その他</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-3">
                <label className="block text-[10px] text-slate-450 font-bold mb-1">活動内容 *</label>
                <input
                  type="text"
                  required
                  placeholder="例: C# Blazor SignalR疎通テスト、進捗朝会..."
                  value={logTitle}
                  onChange={(e) => setLogTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-[#E2E8F0] focus:border-[#06B6D4] focus:outline-none rounded-xl px-3 py-2 text-xs text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-450 font-bold mb-1">期間 (分)</label>
                <input
                  type="number"
                  required
                  min={5}
                  step={5}
                  value={logDuration}
                  onChange={(e) => setLogDuration(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-[#E2E8F0] focus:border-[#06B6D4] focus:outline-none rounded-xl px-3 py-2 text-xs text-slate-800 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-450 font-bold mb-1">詳細メモ / 決定事項など（任意）</label>
              <textarea
                placeholder="話した内容、エラーログ、次回アクションなど"
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                rows={2}
                className="w-full bg-slate-50 border border-[#E2E8F0] focus:border-[#06B6D4] focus:outline-none rounded-xl px-3 py-2 text-xs text-slate-800 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#06B6D4] hover:bg-[#0ea5e9] text-white text-xs font-bold py-2.5 px-4 rounded-xl transition duration-155 shadow-md flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" />
              タイムラインに追記
            </button>
          </form>
        </div>

        {/* Chronological Vertical Timeline View */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm" id="chronological-activity-list">
          <div className="flex items-center justify-between mb-4 border-b border-[#E2E8F0] pb-2">
            <h4 className="text-xs font-black text-slate-800">本日の活動タイムライン</h4>
            <span className="bg-slate-50 border border-[#E2E8F0] text-slate-600 font-mono text-[10px] py-0.5 px-2.5 rounded-full font-bold">
              タイムライン累計: {workLogs.reduce((acc, l) => acc + l.durationMinutes, 0)} 分
            </span>
          </div>

          {workLogs.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs font-semibold border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              まだスケジュールが登録されていません。上のフォームから業務記録を作成してください。
            </div>
          ) : (
            <div className="relative border-l border-slate-200 pl-4 ml-2.5 space-y-6 max-h-[350px] overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {workLogs
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((log) => (
                    <motion.div
                      layout
                      key={log.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ duration: 0.18 }}
                      className="relative group/timeline"
                    >
                      {/* Bullet marker */}
                      <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full border border-white bg-[#06B6D4] scale-90 shadow-md group-hover/timeline:scale-110 transition duration-150"></div>
                      
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono font-black text-slate-700 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-405" />
                          {log.time} ({log.durationMinutes}分)
                        </span>
                        <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border ${categoriesMap[log.category].color}`}>
                          {categoriesMap[log.category].label}
                        </span>
                      </div>

                      <h5 className="font-bold text-xs text-slate-800 mt-1">
                        {log.title}
                      </h5>

                      {log.notes && (
                        <p className="text-[11px] text-slate-500 mt-1 pl-2 border-l border-slate-200 leading-normal font-medium">
                          {log.notes}
                        </p>
                      )}

                      <button
                        onClick={() => onDeleteWorkLog(log.id)}
                        className="absolute right-0 top-1 text-slate-400 hover:text-red-500 opacity-0 group-hover/timeline:opacity-100 p-1 rounded transition duration-150"
                        title="削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Auto-Generated Business Report by Gemini AI (7 cols) */}
      <div className="lg:col-span-7 flex flex-col h-full space-y-6">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex-1 flex flex-col justify-between" id="report-generator-container">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E2E8F0]">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-5 h-5 text-[#06B6D4]" />
                Gemini AI 日報自動生成
              </h3>
              <button
                onClick={handleGenerateReportByAI}
                disabled={isGenerating || tasks.length === 0}
                className="bg-[#06B6D4] hover:bg-[#0ea5e9] text-white text-xs font-bold px-4 py-2 rounded-xl transition duration-150 shadow-md flex items-center gap-1.5 disabled:opacity-40"
              >
                {isGenerating ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    レポート作成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    日報レポートを作成
                  </>
                )}
              </button>
            </div>
            
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              タイムラインの作業結果、課題事項、直面したエラー情報、および未完了・完了済みのタスクをGemini AIが自動的にビジネスライクに分析し、そのまま貼り付け・送信可能なドラフトとしてMarkdownへ統合定義。
            </p>

            {tasks.length === 0 && (
              <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-600 text-xs p-3 rounded-lg flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>コンテキスト：タスク管理にお持ちの案件を登録すると、日報により解像度の高い実績が反映されます。</span>
              </div>
            )}

            {generationError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-lg flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>エラーが発生しました：{generationError}</span>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-[300px] flex flex-col bg-slate-50 border border-slate-200 rounded-2xl relative overflow-hidden" id="report-view-slate">
            {/* Copy button */}
            {generatedReport && (
              <div className="absolute top-2.5 right-2.5 z-10 flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg text-[10px] font-bold duration-150 flex items-center gap-1 shadow-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-[#06B6D4]" />
                      コピーしました!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      クリップボードにコピー
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Display Markdown Report */}
            {isGenerating ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                <div className="relative flex items-center justify-center">
                  <div className="w-12 h-12 border-3 border-cyan-500/25 border-t-[#06B6D4] rounded-full animate-spin"></div>
                  <Sparkles className="w-5 h-5 text-cyan-505 absolute animate-pulse" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-800">C# / Gemini Agent 執筆中...</p>
                  <p className="text-[10px] text-slate-500">本日の作業ログとカンバンの完了ステータス・チェックリストを突合・集約中です。</p>
                </div>
              </div>
            ) : generatedReport ? (
              <div className="flex-1 overflow-y-auto p-5 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-line" id="md-report-presentation">
                {generatedReport}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 select-none">
                <FileText className="w-10 h-10 mb-2.5 opacity-30 text-[#06B6D4]" />
                <p className="text-xs font-bold">出力結果プレビューはこちら</p>
                <p className="text-[10px] max-w-sm mt-1 leading-normal text-slate-500 font-medium">
                  「日報レポートを作成」ボタンをクリックすると、Gemini AIがあなたのタイムスケジュールと今日の成果活動を分析し、レポートを出力します。
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
