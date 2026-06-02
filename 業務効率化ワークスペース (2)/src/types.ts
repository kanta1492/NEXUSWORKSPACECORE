/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "doing" | "done";
  priority: "low" | "medium" | "high";
  category: string;
  estimatedHours: number;
  actualHours: number;
  dueDate: string;
  checklist: ChecklistItem[];
  createdAt: string;
}

export interface WorkLog {
  id: string;
  time: string; // e.g. "09:30"
  title: string;
  category: "meeting" | "operational" | "creative" | "research" | "break" | "other";
  durationMinutes: number;
  notes?: string;
}

export interface AggregatedRecord {
  id: string;
  label: string; // Name of the category, date, or item
  value: number; // Quantitative metric
  secondaryLabel?: string;
  secondaryValue?: number;
}

export interface SecurityLog {
  id: string;
  timestamp: string;
  event: string;
  category: "auth_success" | "auth_failed" | "auth_lockout" | "profile_change" | "session_logout" | "info" | "system";
  ipAddress: string;
  userAgent: string;
  status: "success" | "warning" | "danger" | "info";
}

export interface UserCredentials {
  email: string;
  passwordHash: string;
  registeredAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // e.g., "2026-06-01"
  time: string; // e.g., "14:15"
  priority: "low" | "medium" | "high";
  description: string;
  notified?: boolean;
  createdAt: string;
}

export type ActiveTab = "tasks" | "reporter" | "analyzer" | "timer" | "settings" | "calendar";
