/**
 * Pure Browser IndexedDB wrapper to synchronize scheduled alarms and focus timers 
 * between the main React context thread and the background Service Worker thread.
 * This guarantees notifications fire even when the application tab is closed.
 */

export interface DbAlarm {
  id: string;
  title: string;
  time: string; // "HH:MM"
  date: string; // "YYYY-MM-DD"
  timestamp: number; // calculated Alarm time in ms
  notified: boolean;
}

export interface DbTimer {
  id: string; // "focus_timer"
  type: "work" | "break";
  targetTimestamp: number; // Completion absolute time is ms
  isRunning: boolean;
}

const DB_NAME = "NexusDbNotifications";
const DB_VERSION = 1;

export function openNotificationDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = request.result;
      if (!db.objectStoreNames.contains("alarms")) {
        db.createObjectStore("alarms", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("timers")) {
        db.createObjectStore("timers", { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Synchronize current calendar events to the IndexedDB alarms list
 */
export async function syncAlarmsToDb(events: Array<{ id: string; title: string; date: string; time: string; notified: boolean }>) {
  try {
    const db = await openNotificationDb();
    const tx = db.transaction("alarms", "readwrite");
    const store = tx.objectStore("alarms");

    // Clear old items
    store.clear();

    events.forEach(event => {
      // Calculate absolute alarm trigger point (15 minutes before scheduled date state)
      const [year, month, day] = event.date.split("-").map(Number);
      const [hour, minute] = event.time.split(":").map(Number);
      
      const eventDateObject = new Date(year, month - 1, day, hour, minute, 0);
      // Alarm activates 10 minutes before the event
      const alarmTimestamp = eventDateObject.getTime() - 10 * 60 * 1000;

      const dbAlarm: DbAlarm = {
        id: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
        timestamp: alarmTimestamp,
        notified: event.notified
      };

      store.put(dbAlarm);
    });

    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error("Failed to synchronize calendar alarms to IndexedDB:", error);
  }
}

/**
 * Update individual alarm notify status in IndexedDB
 */
export async function markAlarmAsNotifiedInDb(id: string) {
  try {
    const db = await openNotificationDb();
    const tx = db.transaction("alarms", "readwrite");
    const store = tx.objectStore("alarms");
    
    const request = store.get(id);
    request.onsuccess = () => {
      const alarm = request.result as DbAlarm | undefined;
      if (alarm) {
        alarm.notified = true;
        store.put(alarm);
      }
    };
  } catch (err) {
    console.error("Could not update notified status in Db:", err);
  }
}

/**
 * Sync active Pomodoro timer to IndexedDB so the background Service Worker can track completion
 */
export async function syncActiveTimerToDb(timer: DbTimer | null) {
  try {
    const db = await openNotificationDb();
    const tx = db.transaction("timers", "readwrite");
    const store = tx.objectStore("timers");

    if (!timer) {
      store.delete("focus_timer");
    } else {
      store.put(timer);
    }

    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error("Failed to synchronize Focus timer to IndexedDB:", error);
  }
}
