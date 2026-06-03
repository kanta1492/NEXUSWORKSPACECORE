/**
 * Nexus core Service Worker
 * Handles native PC bottom-right desktop notifications even when the browser tab is inactive or closed.
 */

const DB_NAME = "NexusDbNotifications";
const DB_VERSION = 1;

// Keep track of notified items in memory to guarantee no double firing in the same short cycle
const memoryNotified = new Set();

self.addEventListener("install", (event) => {
  self.skipWaiting();
  console.log("[Worker] Core Service Worker installed.");
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
  console.log("[Worker] Core Service Worker activated and gained authority.");
  
  // Start the background evaluation engine 
  startBackgroundAuditAndAlarmLoop();
});

/**
 * Native IndexedDB reader inside the Service Worker thread
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Self-correcting loop to audit alarm queues and notify users on time
 */
function startBackgroundAuditAndAlarmLoop() {
  setInterval(async () => {
    try {
      const db = await openDatabase();
      
      // 1. Audit scheduled calendar events (Alarms)
      await checkCalendarAlarms(db);

      // 2. Audit active Pomodoro Focus Timers
      await checkFocusTimers(db);

      db.close();
    } catch (err) {
      // Quiet fail in background - prevents log spamming
    }
  }, 5000); // Audit state checks every 5 seconds for ultimate precision
}

/**
 * Check calendar alarm timetables in IndexedDB
 */
async function checkCalendarAlarms(db) {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction("alarms", "readwrite");
      const store = tx.objectStore("alarms");
      const request = store.getAll();

      request.onsuccess = () => {
        const alarms = request.result || [];
        const nowMs = Date.now();

        alarms.forEach((alarm) => {
          // If the scheduled alarm timestamp is reached, and not yet marked notified (DB & memory)
          if (!alarm.notified && !memoryNotified.has(alarm.id) && nowMs >= alarm.timestamp) {
            
            // Check if it's not excessively stale (ignore alarms older than 2 hours to avoid spamming on start)
            if (nowMs - alarm.timestamp < 2 * 60 * 60 * 1000) {
              
              // Trigger Native PC Desktop notification
              self.registration.showNotification(`【直前アラーム】予定が間もなく開始されます`, {
                body: `予定「${alarm.title}」が10分以内に開始されます。（開始時間: ${alarm.time}）`,
                icon: "/favicon.ico",
                badge: "/favicon.ico",
                requireInteraction: true,
                vibrate: [200, 100, 200],
                data: {
                  url: "/",
                  type: "calendar_alarm",
                  id: alarm.id
                },
                tag: `alarm-${alarm.id}`
              });

              memoryNotified.add(alarm.id);
            }

            // Mark completed in IndexedDB
            alarm.notified = true;
            store.put(alarm);
          }
        });
        resolve();
      };
      request.onerror = () => resolve();
    } catch (e) {
      resolve();
    }
  });
}

/**
 * Check active Pomodoro Timers in IndexedDB
 */
async function checkFocusTimers(db) {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction("timers", "readwrite");
      const store = tx.objectStore("timers");
      const request = store.get("focus_timer");

      request.onsuccess = () => {
        const timer = request.result;
        const nowMs = Date.now();

        if (timer && timer.isRunning && nowMs >= timer.targetTimestamp) {
          const timerKey = `timer-${timer.targetTimestamp}`;
          
          if (!memoryNotified.has(timerKey)) {
            const label = timer.type === "work" ? "作業(集中)セッション" : "休憩タイム";
            const nextLabel = timer.type === "work" ? "素晴らしい集中でした！リフレッシュのためにゆっくり休みましょう。" : "休憩時間終了です。新規セッションを開始して進めましょう！";

            self.registration.showNotification(`【タイムアップ】${label}が満了しました`, {
              body: nextLabel,
              icon: "/favicon.ico",
              badge: "/favicon.ico",
              requireInteraction: true,
              vibrate: [100, 50, 100, 50, 300],
              data: {
                url: "/?tab=timer",
                type: "pomodoro_complete"
              },
              tag: `timer-end`
            });

            memoryNotified.add(timerKey);
          }

          // Mark no longer running or delete to avoid repeat triggers
          store.delete("focus_timer");
        }
        resolve();
      };
      request.onerror = () => resolve();
    } catch (e) {
      resolve();
    }
  });
}

/**
 * Handle Desktop Notification Click event. Wakes up or focuses the active tab instantly.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Retrieve notification metadata and navigation target URL
  const targetUrl = event.notification.data ? event.notification.data.url : "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and redirect
      for (const client of clientList) {
        const urlObj = new URL(client.url);
        // Check if matching domain/origin
        if (urlObj.pathname === "/" || client.url.includes(self.registration.scope)) {
          if ("focus" in client) {
            // Send client tab target message or focus
            client.postMessage({ type: "NOTIFICATION_CLICK", data: event.notification.data });
            return client.focus();
          }
        }
      }
      
      // If no tab is active, open a brand new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

/**
 * Listen to instant trigger notifications sent dynamically via the Client Channel
 */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "TRIGGER_TEST_NOTIFICATION") {
    self.registration.showNotification("【テスト通知】接続テスト成功", {
      body: "PCデスクトップ右下通知は完全に動作しています。アプリが閉じていてもアラームは適宜発信されます。",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      vibrate: [100, 200, 100]
    });
  }
});
