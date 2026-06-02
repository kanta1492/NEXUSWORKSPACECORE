/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Task, ChecklistItem } from "../types";
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ChevronRight,
  List,
  Grid,
  Check,
  Calendar,
  Layers,
  FolderOpen
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TaskManagerProps {
  tasks: Task[];
  onAddTask: (task: Omit<Task, "id" | "createdAt">) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onAddMultipleTasks: (tasks: Omit<Task, "id" | "createdAt">[]) => void;
}

export default function TaskManager({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onAddMultipleTasks,
}: TaskManagerProps) {
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  
  // Form states for manually adding a task
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");
  const [newCategory, setNewCategory] = useState("一般業務");
  const [newEstHours, setNewEstHours] = useState(1);
  const [newDueDate, setNewDueDate] = useState(new Date().toISOString().split("T")[0]);

  // AI Task Generator states
  const [projectGoal, setProjectGoal] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState("");

  const categories = ["一般業務", "資料作成", "会議・打合せ", "リサーチ", "開発・クリエイティブ", "管理・運用"];

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddTask({
      title: newTitle,
      description: newDesc,
      status: "todo",
      priority: newPriority,
      category: newCategory,
      estimatedHours: Number(newEstHours),
      actualHours: 0,
      dueDate: newDueDate,
      checklist: [],
    });

    // Reset Form
    setNewTitle("");
    setNewDesc("");
    setNewPriority("medium");
    setNewCategory("一般業務");
    setNewEstHours(1);
    setShowAddForm(false);
  };

  // Call server-side Gemini to deconstruct heavy goal into structured sub-tasks
  const handleAIGeneratedTasks = async () => {
    if (!projectGoal.trim()) return;
    setIsGenerating(true);
    setAiError("");

    try {
      const response = await fetch("/api/gemini/generate-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectGoal, department: "一般業務・効率化" }),
      });

      if (!response.ok) {
        throw new Error("AIタスク展開の処理に失敗しました。時間をおいて再試行してください。");
      }

      const data = await response.json();
      if (data.tasks && Array.isArray(data.tasks)) {
        const parsed: Omit<Task, "id" | "createdAt">[] = data.tasks.map((t: any) => ({
          title: t.title || "展開されたタスク",
          description: t.description || "",
          status: "todo",
          priority: (t.priority === "high" || t.priority === "low" || t.priority === "medium") ? t.priority : "medium",
          category: t.category || "AI展開",
          estimatedHours: Number(t.estimatedHours) || 2,
          actualHours: 0,
          dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0], // Tomorrow
          checklist: Array.isArray(t.checklist) ? t.checklist.map((cStr: string, idx: number) => ({
            id: `chk-${Date.now()}-${idx}`,
            text: cStr,
            completed: false
          })) : []
        }));

        onAddMultipleTasks(parsed);
        setProjectGoal("");
      } else {
        throw new Error("フォーマットが不正です。再度実行してください。");
      }
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "エラーが発生しました。");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStatusChange = (task: Task, nextStatus: "todo" | "doing" | "done") => {
    onUpdateTask({ ...task, status: nextStatus });
  };

  const toggleChecklistItem = (task: Task, itemId: string) => {
    const updatedChecklist = task.checklist.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    onUpdateTask({ ...task, checklist: updatedChecklist });
  };

  const addChecklistItem = (task: Task, text: string) => {
    if (!text.trim()) return;
    const newItem: ChecklistItem = {
      id: `chk-${Date.now()}`,
      text: text.trim(),
      completed: false,
    };
    onUpdateTask({ ...task, checklist: [...task.checklist, newItem] });
  };

  const incrementActualHours = (task: Task, offset: number) => {
    const nextHours = Math.max(0, task.actualHours + offset);
    onUpdateTask({ ...task, actualHours: nextHours });
  };

  return (
    <div className="space-y-6" id="task-manager-root">
      
      {/* Upper Panel: Manual task registration & View selection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Direct manual task adding form */}
        <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex flex-col justify-between" id="manual-task-form">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Plus className="w-5 h-5 text-[#06B6D4]" />
              <h3 className="text-sm font-bold text-slate-800">新規タスクの自由記述登録</h3>
            </div>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              ご自身で決定したタスクを自由に記述して登録します。優先順位はプルダウンメニュー（高・中・低）から指定してください。
            </p>
          </div>

          <form onSubmit={handleManualSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">タスク名 *</label>
                <input
                  type="text"
                  required
                  placeholder="例: C# Blazor SignalR Hubの実装"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-[#E2E8F0] focus:border-[#06B6D4] focus:outline-none rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">説明・メモ（任意）</label>
                <textarea
                  placeholder="タスクの目的や留意点、接続パラメーター、EFCore migration手順など"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-[#E2E8F0] focus:border-[#06B6D4] focus:outline-none rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 resize-none"
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1">優先度</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full bg-slate-50 border border-[#E2E8F0] focus:border-[#06B6D4] focus:outline-none rounded-xl px-3 py-2 text-xs text-slate-800 font-bold cursor-pointer"
                  >
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1">カテゴリー</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-[#E2E8F0] focus:border-[#06B6D4] focus:outline-none rounded-xl px-3 py-2 text-xs text-slate-800 cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1">予定所要時間 (h)</label>
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={newEstHours}
                    onChange={(e) => setNewEstHours(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-[#E2E8F0] focus:border-[#06B6D4] focus:outline-none rounded-xl px-3 py-1.5 text-xs text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1">完了期日</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-[#E2E8F0] focus:border-[#06B6D4] focus:outline-none rounded-xl px-3.5 py-1.5 text-xs text-slate-800 font-mono text-center"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-[#06B6D4] hover:bg-[#0ea5e9] text-white font-bold py-2 px-3 rounded-xl text-xs transition duration-150 shadow-md flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  タスクを登録する
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* View Switch / Quick Info */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 flex flex-col justify-between shadow-sm" id="view-controls-panel">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2">表示レイアウト選択</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              個人専用ワークスペースを効率よく管理するため、カンバン形式と詳細リスト形式を自由に切り替えて表示できます。
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl text-xs font-bold border transition-all ${
                viewMode === "kanban" 
                  ? "bg-[#06B6D4]/10 border-[#06B6D4]/30 text-[#06B6D4]" 
                  : "bg-slate-50 border-[#E2E8F0] text-slate-600 hover:text-slate-800"
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              カンバン
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl text-xs font-bold border transition-all ${
                viewMode === "list" 
                  ? "bg-[#06B6D4]/10 border-[#06B6D4]/30 text-[#06B6D4]" 
                  : "bg-slate-50 border-[#E2E8F0] text-slate-600 hover:text-slate-800"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              リスト
            </button>
          </div>
        </div>
      </div>

      {/* Main Kanban Workspace containing white cards and borders */}
      {viewMode === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="kanban-board">
          {/* TODO Column */}
          <KanbanColumn
            title="未着手 (Todo)"
            columnStatus="todo"
            count={tasks.filter(t => t.status === "todo").length}
            tasks={tasks.filter(t => t.status === "todo")}
            onStatusChange={handleStatusChange}
            onToggleChecklist={toggleChecklistItem}
            onAddChecklist={addChecklistItem}
            onAddHour={incrementActualHours}
            onDelete={onDeleteTask}
          />
          {/* DOING Column */}
          <KanbanColumn
            title="着手中 (Doing)"
            columnStatus="doing"
            count={tasks.filter(t => t.status === "doing").length}
            tasks={tasks.filter(t => t.status === "doing")}
            onStatusChange={handleStatusChange}
            onToggleChecklist={toggleChecklistItem}
            onAddChecklist={addChecklistItem}
            onAddHour={incrementActualHours}
            onDelete={onDeleteTask}
          />
          {/* DONE Column */}
          <KanbanColumn
            title="完了 (Done)"
            columnStatus="done"
            count={tasks.filter(t => t.status === "done").length}
            tasks={tasks.filter(t => t.status === "done")}
            onStatusChange={handleStatusChange}
            onToggleChecklist={toggleChecklistItem}
            onAddChecklist={addChecklistItem}
            onAddHour={incrementActualHours}
            onDelete={onDeleteTask}
          />
        </div>
      ) : (
        /* List View on Professional Polish crisp background */
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm" id="task-list-view">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                <th className="py-4 px-6">タスク詳細・カテゴリー</th>
                <th className="py-4 px-6 w-28">優先度</th>
                <th className="py-4 px-6 w-36">ステータス変更</th>
                <th className="py-4 px-6 w-32">時間効率 (実績/予定)</th>
                <th className="py-4 px-6 w-32 font-mono">期限日</th>
                <th className="py-4 px-6 w-16 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-slate-700">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold text-xs">
                    選択された条件のタスクが見つかりませんでした。
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/50 transition duration-100">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                        <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded font-bold">
                          {task.category}
                        </span>
                        {task.title}
                      </div>
                      {task.description && (
                        <p className="text-[11px] text-slate-500 mt-1 max-w-xl">{task.description}</p>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className="py-4 px-6">
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task, e.target.value as any)}
                        className="bg-slate-50 border border-[#E2E8F0] focus:outline-none rounded-lg px-2 py-1 text-xs text-slate-700 font-semibold cursor-pointer"
                      >
                        <option value="todo">未着手 (Todo)</option>
                        <option value="doing">着手中 (Doing)</option>
                        <option value="done">完了 (Done)</option>
                      </select>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs">
                      <div className="flex items-center gap-1.5 text-slate-800">
                        <span className="font-bold text-[#06B6D4]">{task.actualHours}h</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-500">{task.estimatedHours}h</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs font-mono text-slate-500">
                      {task.dueDate}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="text-slate-400 hover:text-red-500 p-1.5 rounded transition duration-150"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Sub-Component: Priority Badge Helper (Formatted perfectly to theme)
function PriorityBadge({ priority }: { priority: "low" | "medium" | "high" }) {
  if (priority === "high") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] bg-[#FEE2E2] text-[#EF4444] px-2.5 py-0.5 rounded-full font-bold">
        高
      </span>
    );
  }
  if (priority === "medium") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] bg-[#FEF3C7] text-[#D97706] px-2.5 py-0.5 rounded-full font-bold">
        中
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full font-bold">
      低
    </span>
  );
}

// Sub-Component: Kanban Column
interface KanbanColumnProps {
  title: string;
  columnStatus: "todo" | "doing" | "done";
  count: number;
  tasks: Task[];
  onStatusChange: (task: Task, next: "todo" | "doing" | "done") => void;
  onToggleChecklist: (task: Task, itemId: string) => void;
  onAddChecklist: (task: Task, text: string) => void;
  onAddHour: (task: Task, offset: number) => void;
  onDelete: (id: string) => void;
}

function KanbanColumn({
  title,
  columnStatus,
  count,
  tasks,
  onStatusChange,
  onToggleChecklist,
  onAddChecklist,
  onAddHour,
  onDelete,
}: KanbanColumnProps) {
  const [activeChecklistForId, setActiveChecklistForId] = useState<string | null>(null);
  const [checklistTextInput, setChecklistTextInput] = useState("");

  const handleCreateCheckItem = (e: React.FormEvent, task: Task) => {
    e.preventDefault();
    onAddChecklist(task, checklistTextInput);
    setChecklistTextInput("");
  };

  return (
    <div className="bg-slate-50 border border-[#E2E8F0] rounded-2xl p-4 flex flex-col min-h-[480px]">
      
      {/* Column Title with count and status dot */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E2E8F0]">
        <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${
            columnStatus === "todo" ? "bg-amber-400" :
            columnStatus === "doing" ? "bg-[#06B6D4]" : "bg-emerald-400"
          }`}></span>
          {title}
        </h4>
        <span className="bg-white text-slate-500 border border-[#E2E8F0] text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold">
          {count}
        </span>
      </div>

      {/* Columns Tasks lists */}
      <div className="space-y-4 flex-1 overflow-y-auto max-h-[580px] pr-1">
        <AnimatePresence mode="popLayout">
          {tasks.length === 0 ? (
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-10 text-[11px] text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white/40"
            >
              タスクはありません
            </motion.div>
          ) : (
            tasks.map((task) => (
              <motion.div
                layout
                key={task.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="bg-white border border-[#E2E8F0] hover:border-[#06B6D4] rounded-xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-150 group relative"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[9px] font-bold text-slate-500 bg-slate-50 border border-[#E2E8F0] px-2 py-0.5 rounded">
                      {task.category}
                    </span>
                    <PriorityBadge priority={task.priority} />
                  </div>

                  <h5 className="font-bold text-slate-800 text-xs leading-snug group-hover:text-[#06B6D4] transition-colors">
                    {task.title}
                  </h5>

                  {task.description && (
                    <p className="text-[11px] text-slate-500 mt-1 pb-1 leading-normal">
                      {task.description}
                    </p>
                  )}

                  {/* Checklist Summary Tracker */}
                  {task.checklist.length > 0 && (
                    <div className="mt-2.5 bg-slate-50 border border-[#E2E8F0] rounded-lg p-2.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1 font-bold">
                        <span>進捗タスク</span>
                        <span className="font-mono text-[9px] text-[#06B6D4]">
                          {task.checklist.filter(c => c.completed).length} / {task.checklist.length}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-2">
                        <div 
                           className="bg-[#06B6D4] h-full rounded-full transition-all duration-200" 
                           style={{ width: `${(task.checklist.filter(c => c.completed).length / task.checklist.length) * 100}%` }}
                        ></div>
                      </div>

                      {/* Expand checklist content */}
                      {activeChecklistForId === task.id ? (
                        <div className="space-y-1.5 pt-2 border-t border-slate-200 max-h-24 overflow-y-auto">
                          {task.checklist.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => onToggleChecklist(task, item.id)}
                              className="w-full text-left flex items-start gap-1.5 text-[10px] text-slate-600 hover:text-slate-800 transition"
                            >
                              <div className={`mt-0.5 shrink-0 w-3 h-3 border rounded flex items-center justify-center transition ${
                                item.completed ? "bg-[#06B6D4]/10 border-[#06B6D4] text-[#06B6D4]" : "border-slate-300"
                              }`}>
                                {item.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                              <span className={item.completed ? "line-through text-slate-400" : ""}>{item.text}</span>
                            </button>
                          ))}
                          
                          <form onSubmit={(e) => handleCreateCheckItem(e, task)} className="flex gap-1 mt-2.5 pt-2 border-t border-slate-205">
                            <input
                              type="text"
                              required
                              placeholder="項目の追加..."
                              value={checklistTextInput}
                              onChange={(e) => setChecklistTextInput(e.target.value)}
                              className="flex-1 bg-slate-50 border border-[#E2E8F0] rounded px-2 py-0.5 text-[9px] text-slate-800 focus:outline-none"
                            />
                            <button type="submit" className="bg-[#06B6D4] hover:bg-[#0ea5e9] text-white px-2 rounded text-[9px] font-bold">
                              +
                            </button>
                          </form>
                        </div>
                      ) : (
                        <button
                          onClick={() => setActiveChecklistForId(task.id)}
                          className="text-[9px] text-[#06B6D4] hover:text-[#0ea5e9] font-bold flex items-center gap-0.5 pointer-events-auto"
                        >
                          詳細チェックリストを展開
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Add item when empty but toggled */}
                  {task.checklist.length === 0 && activeChecklistForId === task.id && (
                    <div className="mt-2 bg-slate-50 border border-[#E2E8F0] rounded-lg p-2">
                      <form onSubmit={(e) => handleCreateCheckItem(e, task)} className="flex gap-1">
                        <input
                          type="text"
                          required
                          placeholder="チェック項目を追加..."
                          value={checklistTextInput}
                          onChange={(e) => setChecklistTextInput(e.target.value)}
                          className="flex-1 bg-white border border-[#E2E8F0] rounded px-2 py-0.5 text-[9px] text-slate-800 focus:outline-none"
                        />
                        <button type="submit" className="bg-[#06B6D4] hover:bg-[#0ea5e9] text-white px-2 rounded text-[9px] font-bold">
                          追加
                        </button>
                      </form>
                    </div>
                  )}

                  {task.checklist.length === 0 && activeChecklistForId !== task.id && (
                    <button
                      onClick={() => setActiveChecklistForId(task.id)}
                      className="text-[9px] text-slate-400 hover:text-slate-600 font-bold mt-2 flex items-center gap-0.5 pointer-events-auto"
                    >
                      + チェックリストを作成
                    </button>
                  )}
                  
                  {activeChecklistForId === task.id && (
                    <button
                      onClick={() => setActiveChecklistForId(null)}
                      className="text-[9px] text-slate-400 hover:text-slate-600 font-bold mt-2 block pointer-events-auto"
                    >
                      閉じる
                    </button>
                  )}
                </div>

                {/* Card Footer: Hours & Progress Action */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  {/* Hours Tracking */}
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium font-sans">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono font-bold text-slate-800">{task.actualHours || 0}h</span>
                    <span className="text-slate-300">/</span>
                    <span className="font-mono">{task.estimatedHours || 1}h</span>
                    <div className="flex gap-0.5 ml-1">
                      <button 
                        onClick={() => onAddHour(task, -0.5)} 
                        className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-[10px] w-4 h-4 flex items-center justify-center rounded text-slate-500"
                        title="-0.5h"
                      >
                        -
                      </button>
                      <button 
                        onClick={() => onAddHour(task, 0.5)} 
                        className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-[10px] w-4 h-4 flex items-center justify-center rounded text-slate-500"
                        title="+0.5h"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Move status buttons */}
                  <div className="flex gap-1 text-[10px] h-5">
                    {columnStatus !== "todo" && (
                      <button
                        onClick={() => onStatusChange(task, "todo")}
                        className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded transition"
                      >
                        戻す
                      </button>
                    )}
                    {columnStatus === "todo" && (
                      <button
                        onClick={() => onStatusChange(task, "doing")}
                        className="bg-[#06B6D4] hover:bg-[#0ea5e9] text-white font-bold px-2.5 py-0.5 rounded transition flex items-center gap-0.5 shadow-sm shadow-cyan-500/10 text-[9px]"
                      >
                        着手
                      </button>
                    )}
                    {columnStatus === "doing" && (
                      <button
                        onClick={() => onStatusChange(task, "done")}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-2.5 py-0.5 rounded transition shadow-sm text-[9px]"
                      >
                        完了
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(task.id)}
                      className="text-slate-300 hover:text-red-500 p-1 rounded transition duration-200"
                      title="削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 mt-2 font-mono text-right">
                  期限日: {task.dueDate}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
