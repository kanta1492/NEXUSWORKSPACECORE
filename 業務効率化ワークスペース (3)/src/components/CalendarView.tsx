/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { CalendarEvent } from "../types";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Clock, 
  Bell, 
  AlertCircle,
  Calendar,
  Layers
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CalendarViewProps {
  events: CalendarEvent[];
  onAddEvent: (event: Omit<CalendarEvent, "id" | "createdAt">) => void;
  onDeleteEvent: (id: string) => void;
  systemTime: string; // "YYYY-MM-DD" e.g., for highlighting today or comparison
}

export default function CalendarView({
  events,
  onAddEvent,
  onDeleteEvent,
  systemTime,
}: CalendarViewProps) {
  // Parse systemTime to get initial year & month dynamically
  const getInitialYearAndMonth = (timeStr: string) => {
    const parsedDate = timeStr ? new Date(timeStr) : new Date();
    if (!isNaN(parsedDate.getTime())) {
      return {
        year: parsedDate.getFullYear(),
        month: parsedDate.getMonth()
      };
    }
    return { year: 2026, month: 5 }; // June 2026 fallback
  };

  const initialParsed = getInitialYearAndMonth(systemTime);

  const [currentYear, setCurrentYear] = useState(initialParsed.year);
  const [currentMonth, setCurrentMonth] = useState(initialParsed.month); // 0-indexed
  const [selectedDateStr, setSelectedDateStr] = useState<string>(systemTime);

  // Sync state if systemTime propagates down as updated
  React.useEffect(() => {
    if (systemTime) {
      setSelectedDateStr(systemTime);
      const parsedDate = new Date(systemTime);
      if (!isNaN(parsedDate.getTime())) {
        setCurrentYear(parsedDate.getFullYear());
        setCurrentMonth(parsedDate.getMonth());
      }
    }
  }, [systemTime]);


  // Form states for new calendar event
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("12:00");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");
  const [newDesc, setNewDesc] = useState("");
  const [formError, setFormError] = useState("");

  const weeks = ["日", "月", "火", "水", "木", "金", "土"];
  const monthsJapanese = [
    "1月", "2月", "3月", "4月", "5月", "6月",
    "7月", "8月", "9月", "10月", "11月", "12月"
  ];

  // Helper to generate days for the calendar month grid representation
  const getDaysInMonth = (year: number, month: number) => {
    // month is 0-indexed
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay(); // 0 is Sunday, 6 is Saturday
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  // Array of days representing the month grid includes empty spaces for starts
  const gridCells: { dayNum: number | null; dateStr: string | null }[] = [];
  
  // Padding cells before day 1
  for (let i = 0; i < firstDayIndex; i++) {
    gridCells.push({ dayNum: null, dateStr: null });
  }

  // Actual days
  for (let d = 1; d <= daysInMonth; d++) {
    const paddedMonth = (currentMonth + 1).toString().padStart(2, "0");
    const paddedDay = d.toString().padStart(2, "0");
    const cellDateStr = `${currentYear}-${paddedMonth}-${paddedDay}`;
    gridCells.push({ dayNum: d, dateStr: cellDateStr });
  }

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (dateStr: string | null) => {
    if (!dateStr) return;
    setSelectedDateStr(dateStr);
  };

  const handleAddEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!newTitle.trim()) {
      setFormError("予定を入力してください。");
      return;
    }

    onAddEvent({
      title: newTitle.trim(),
      date: selectedDateStr,
      time: newTime,
      priority: newPriority,
      description: newDesc.trim(),
      notified: false,
    });

    // Reset fields (keep date & priority as default helper)
    setNewTitle("");
    setNewTime("12:00");
    setNewDesc("");
  };

  // Get active events for the selected day
  const selectedDayEvents = events
    .filter(ev => ev.date === selectedDateStr)
    .sort((a, b) => a.time.localeCompare(b.time));

  // Count events for a specific cell date
  const getEventsForCell = (dateStr: string) => {
    return events.filter(ev => ev.date === dateStr);
  };

  return (
    <div className="space-y-6" id="calendar-view-root">
      
      {/* Upper Information Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex items-center justify-between" id="calendar-header-banner">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#06B6D4]/10 rounded-xl flex items-center justify-center text-[#06B6D4]">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">カレンダー予定管理ボード & 15分前通知センター</h3>
            <p className="text-xs text-slate-500 max-w-xl">
              日付をクリックして、ミーティングやBlazor C#デバッグなどの予定を登録できます。予定開始時間の「15分前」になると、システムが音と視覚トースターで強力にお知らせします。
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 rounded-full font-bold">
            今日: {systemTime}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Elegant Calendar Grid of Month (2 Columns Span) */}
        <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex flex-col justify-between" id="calendar-grid-card">
          <div>
            {/* Calendar Controls Navbar */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E2E8F0]">
              <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <span>{currentYear}年</span>
                <span className="text-cyan-500">{monthsJapanese[currentMonth]}</span>
              </h4>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 rounded-xl border border-slate-205 hover:bg-slate-50 text-slate-650 transition"
                  title="先月"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const parsedDate = new Date(systemTime);
                    if (!isNaN(parsedDate.getTime())) {
                      setCurrentYear(parsedDate.getFullYear());
                      setCurrentMonth(parsedDate.getMonth());
                    }
                    setSelectedDateStr(systemTime);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-205 text-[11px] font-bold hover:bg-slate-50 text-slate-650 transition"
                >
                  今月へ
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-2 rounded-xl border border-slate-205 hover:bg-slate-50 text-slate-650 transition"
                  title="翌月"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weeks columns */}
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-black text-slate-400 mb-3">
              {weeks.map((wk, idx) => (
                <div 
                  key={wk} 
                  className={
                    idx === 0 ? "text-red-500" :
                    idx === 6 ? "text-[#06B6D4]" : "text-slate-400"
                  }
                >
                  {wk}
                </div>
              ))}
            </div>

            {/* Monthly Calendar Day Cells */}
            <div className="grid grid-cols-7 gap-2" id="monthly-days-grid">
              {gridCells.map((cell, idx) => {
                const isSelected = cell.dateStr === selectedDateStr;
                const isTodayStr = cell.dateStr === systemTime;
                const hasEvents = cell.dateStr ? getEventsForCell(cell.dateStr).length > 0 : false;
                const cellEvents = cell.dateStr ? getEventsForCell(cell.dateStr) : [];
                
                // Weekend index in 7-column grid
                const colIdx = idx % 7;
                const isSunday = colIdx === 0;
                const isSaturday = colIdx === 6;

                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectDay(cell.dateStr)}
                    className={`min-h-[72px] p-2 rounded-xl border transition-all relative flex flex-col justify-between cursor-pointer group ${
                      !cell.dayNum 
                        ? "bg-slate-50/40 border-slate-100 pointer-events-none opacity-20" 
                        : isSelected 
                          ? "bg-cyan-50/60 border-cyan-500 text-[#06B6D4] shadow-sm font-bold scale-[1.02]" 
                          : isTodayStr
                            ? "bg-amber-50/50 border-amber-300 text-amber-700 font-semibold"
                            : "bg-white border-[#E2E8F0] text-slate-800 hover:border-slate-400"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-xs ${
                        !cell.dayNum ? "" :
                        isSunday ? "text-red-500" :
                        isSaturday ? "text-[#06B6D4]" : "text-slate-800"
                      }`}>
                        {cell.dayNum}
                      </span>
                      {isTodayStr && (
                        <span className="text-[7px] bg-amber-500/20 text-amber-700 px-1 rounded font-bold">
                          今日
                        </span>
                      )}
                    </div>

                    {/* Rendering event mini visual flags on cells */}
                    {cell.dayNum && hasEvents && (
                      <div className="space-y-0.5 mt-1.5 max-h-[36px] overflow-hidden">
                        {cellEvents.slice(0, 2).map((ev) => (
                          <div 
                            key={ev.id}
                            className={`text-[8px] px-1 py-0.5 rounded truncate font-medium text-left leading-none ${
                              ev.priority === "high" ? "bg-red-50 border border-red-100 text-red-600" :
                              ev.priority === "medium" ? "bg-amber-50 border border-amber-100 text-amber-600" :
                              "bg-slate-50 border border-slate-100 text-slate-600"
                            }`}
                          >
                            <span className="font-mono font-bold text-[7px] mr-0.5">{ev.time}</span>
                            {ev.title}
                          </div>
                        ))}
                        {cellEvents.length > 2 && (
                          <div className="text-[7px] text-slate-400 font-bold pl-0.5 text-left font-mono">
                            他 +{cellEvents.length - 2}件
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-mono mt-6 border-t border-slate-100 pt-3 flex items-center justify-between">
            <span>カレンダースケジューラ配列: {events.length}件登録中</span>
            <span>時刻指定: 24時間フォーマット (例: 14:15)</span>
          </div>
        </div>

        {/* Right Side: Selected Date Schedules & Create Event Form (1 Column) */}
        <div className="flex flex-col gap-6" id="calendar-sidebar-details">
          
          {/* Active Schedule Panel */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex-1 flex flex-col justify-between" id="schedule-list-panel">
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E2E8F0]">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#06B6D4]" />
                  <span>{selectedDateStr} の予定一覧</span>
                </h4>
                <span className="bg-[#06B6D4]/10 text-[#06B6D4] text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono">
                  {selectedDayEvents.length}件
                </span>
              </div>

              {/* Schedules Loop */}
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                <AnimatePresence mode="popLayout">
                  {selectedDayEvents.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-xs"
                    >
                      予定はありません。<br />
                      右下のフォームから追加できます。
                    </motion.div>
                  ) : (
                    selectedDayEvents.map((ev) => (
                      <motion.div
                        layout
                        key={ev.id}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        className="bg-slate-50 border border-[#E2E8F0] hover:border-cyan-400 duration-150 p-3 rounded-xl flex items-start justify-between gap-2.5 group"
                      >
                        <div className="space-y-1 overflow-hidden flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-slate-800 bg-white border border-slate-202 px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-sm text-cyan-600">
                              <Clock className="w-3 h-3 text-cyan-500" />
                              {ev.time}
                            </span>
                            
                            {/* Priority label */}
                            {ev.priority === "high" && (
                              <span className="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">高</span>
                            )}
                            {ev.priority === "medium" && (
                              <span className="text-[8px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-bold">中</span>
                            )}
                            {ev.priority === "low" && (
                              <span className="text-[8px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">低</span>
                            )}
                          </div>
                          <h5 className="font-bold text-slate-800 text-xs truncate">{ev.title}</h5>
                          {ev.description && (
                            <p className="text-[10px] text-slate-500 max-h-12 overflow-y-auto leading-relaxed">{ev.description}</p>
                          )}
                          
                          {/* Checked if notifies triggered */}
                          {ev.notified && (
                            <div className="flex items-center gap-1 text-[9px] text-[#06B6D4] font-bold">
                              <Bell className="w-2.5 h-2.5" />
                              <span>15分前通知発報済み</span>
                            </div>
                          )}
                        </div>
                        
                        <button
                          onClick={() => onDeleteEvent(ev.id)}
                          className="text-slate-300 hover:text-red-500 p-1.5 rounded transition shrink-0"
                          title="予定の削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="text-[9px] text-slate-400 mt-4 leading-normal">
              ※15分前になると、システムがバックグラウンド巡回し自動でトーストアラームを発報。
            </div>
          </div>

          {/* Form to Create Calendar Event */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm" id="calendar-event-form">
            <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2 pb-1 border-b border-slate-100">
              <Layers className="w-4 h-4 text-[#06B6D4]" />
              予定を自由記述登録 ({selectedDateStr})
            </h4>

            <form onSubmit={handleAddEventSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">予定件名 *</label>
                <input
                  type="text"
                  required
                  placeholder="例: C# BlazorHub の統合テスト"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-[#E2E8F0] focus:border-[#06B6D4] focus:outline-none rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1">予定時刻 *</label>
                  <input
                    type="time"
                    required
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-slate-50 border border-[#E2E8F0] focus:border-[#06B6D4] focus:outline-none rounded-xl px-3 py-1.5 text-xs text-slate-800 font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1">優先順位</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full bg-slate-50 border border-[#E2E8F0] focus:border-[#06B6D4] focus:outline-none rounded-xl px-3 py-1.5 text-xs text-slate-800 cursor-pointer font-bold"
                  >
                    <option value="high">高 (High)</option>
                    <option value="medium">中 (Medium)</option>
                    <option value="low">低 (Low)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">説明・メモ（任意）</label>
                <textarea
                  placeholder="会議室、参加者、持参資料、議題メモなど"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-[#E2E8F0] focus:border-[#06B6D4] focus:outline-none rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 resize-none text-[11px]"
                />
              </div>

              {formError && (
                <div className="text-red-500 text-[10px] flex items-center gap-1 font-bold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{formError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-[#06B6D4] hover:bg-[#0ea5e9] text-white font-bold py-2 px-4 rounded-xl text-xs transition duration-150 shadow-md flex items-center justify-center gap-1.5 mt-2"
              >
                <Plus className="w-4 h-4" />
                この日に予定を追加
              </button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
}
