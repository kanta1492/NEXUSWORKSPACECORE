import React, { useState } from "react";
import { SecurityLog } from "../types";
import { 
  Key, 
  ShieldAlert, 
  Terminal, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Trash2, 
  Check, 
  X, 
  Search, 
  Sliders, 
  Activity, 
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SettingsAndLogsProps {
  email: string;
  securityLogs: SecurityLog[];
  onUpdateCredentials: (oldPasswordPlain: string, newEmail: string, newPasswordPlain: string) => Promise<{ success: boolean; message: string }>;
  onClearSecurityLogs: () => void;
  onResetWorkspace: () => void;
  addSystemLog: (msg: string) => void;
  isAdmin: boolean;
  onToggleAdmin: (val: boolean) => void;
}

export default function SettingsAndLogs({
  email,
  securityLogs,
  onUpdateCredentials,
  onClearSecurityLogs,
  onResetWorkspace,
  addSystemLog,
  isAdmin,
  onToggleAdmin
}: SettingsAndLogsProps) {
  const [subTab, setSubTab] = useState<"credentials" | "audit">("credentials");
  
  // Form states
  const [oldPassword, setOldPassword] = useState("");
  const [newEmail, setNewEmail] = useState(email);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Status banners
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Audit Logs Search
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Calculate password strength
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "未入力", color: "bg-slate-200" };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score, label: "弱い (安全性が低いです)", color: "bg-rose-500", textColor: "text-rose-500" };
    if (score <= 4) return { score, label: "中程度 (推奨要件クリア)", color: "bg-amber-500", textColor: "text-amber-500" };
    return { score, label: "強力 (極めて安全です)", color: "bg-emerald-500", textColor: "text-emerald-500" };
  };

  const strength = getPasswordStrength(newPassword);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText("");
    setSuccessText("");

    if (!oldPassword) {
      setErrorText("本人確認のため、現在のパスワードを入力してください。");
      return;
    }

    if (!newEmail.trim()) {
      setErrorText("任意のユーザーID、またはメールアドレスを入力してください。");
      return;
    }

    if (newEmail.trim().length < 3) {
      setErrorText("ユーザーIDは3文字以上で入力してください。");
      return;
    }

    // Password change check
    const isChangingPassword = newPassword.length > 0;
    if (isChangingPassword) {
      if (newPassword.length < 6) {
        setErrorText("セキュリティ保護のため、新しいパスワードは6文字以上で入力してください。");
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorText("新しいパスワードと確認入力が一致しません。");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const parentResult = await onUpdateCredentials(
        oldPassword, 
        newEmail.trim(), 
        isChangingPassword ? newPassword : oldPassword
      );

      if (parentResult.success) {
        setSuccessText(parentResult.message);
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        addSystemLog(`Security System: アカウント情報が更新されました。 ID: ${newEmail}`);
      } else {
        setErrorText(parentResult.message);
      }
    } catch {
      setErrorText("処理中にエラーが発生しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredLogs = securityLogs.filter(log => {
    const matchesSearch = log.event.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          log.ipAddress.includes(searchQuery) ||
                          log.userAgent.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (categoryFilter === "all") return matchesSearch;
    return matchesSearch && log.category === categoryFilter;
  });

  return (
    <div className="space-y-6" id="settings-root">
      
      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 bg-white p-1 rounded-xl shadow-sm max-w-sm gap-1">
        <button
          onClick={() => setSubTab("credentials")}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            subTab === "credentials" 
              ? "bg-[#0F172A] text-white" 
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          アカウント設定
        </button>
        <button
          onClick={() => setSubTab("audit")}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            subTab === "audit" 
              ? "bg-[#0F172A] text-white" 
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          セキュリティ監査ログ
          {securityLogs.length > 0 && (
            <span className="w-2.5 h-2.5 bg-rose-500 rounded-full inline-block animate-pulse" />
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {subTab === "credentials" ? (
          <motion.div
            key="cred-sub"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Main Form Panel */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-850 flex items-center gap-2 mb-1.5">
                  <ShieldCheck className="w-5 h-5 text-indigo-500" />
                  認証情報の更新
                </h3>
                <p className="text-xs text-slate-500 leading-normal">
                  ユーザーID (ご自身で決めた任意のID、またはメールアドレス) とログインパスワードの設定を変更できます。現在のパスワードによる認証が必要です。
                </p>
              </div>

              {/* Status Signals */}
              {errorText && (
                <div className="bg-rose-50 border border-rose-200/60 text-rose-700 p-3 rounded-xl text-xs flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{errorText}</span>
                </div>
              )}

              {successText && (
                <div className="bg-emerald-50 border border-emerald-200/60 text-emerald-800 p-3 rounded-xl text-xs flex items-start gap-2.5 animate-fadeIn">
                  <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                  <span>{successText}</span>
                </div>
              )}

              <form onSubmit={handleUpdate} className="space-y-4">
                
                {/* 1. Confirm Old Password */}
                <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-indigo-500" />
                      現在のパスワード <span className="text-rose-500">*必須</span>
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type={showOld ? "text" : "password"}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="現在のパスワードを確認"
                      className="w-full bg-white border border-[#E2E8F0] focus:border-[#06B6D4] focus:ring-1 focus:ring-[#06B6D4]/30 focus:outline-none rounded-xl pl-4 pr-10 py-2 text-xs text-slate-800 font-mono tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOld(!showOld)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    >
                      {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 2. New User ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    新しいユーザーID（メールアドレスまたは任意のID）
                  </label>
                  <input
                    type="text"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="任意のIDまたはメールアドレス"
                    className="w-full bg-white border border-[#E2E8F0] focus:border-[#06B6D4] focus:ring-1 focus:ring-[#06B6D4]/30 focus:outline-none rounded-xl px-4 py-2 text-xs text-slate-855 font-mono"
                  />
                  <p className="text-[10px] text-slate-400">次回ログイン時に使用する、ご自身で決めたユーザーIDまたはアドレスです。</p>
                </div>

                {/* 3. New Password & Confirm */}
                <div className="border-t border-slate-100 pt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.2 font-sans">
                        新しいパスワード
                      </label>
                      <div className="relative">
                        <input
                          type={showNew ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="変更する場合のみ入力 (6文字以上)"
                          className="w-full bg-white border border-[#E2E8F0] focus:border-[#06B6D4] focus:ring-1 focus:ring-[#06B6D4]/30 focus:outline-none rounded-xl pl-4 pr-10 py-2 text-xs text-slate-800 font-mono tracking-wider"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew(!showNew)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                        >
                          {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        新しいパスワード (確認)
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirm ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="変更したキーを再度入力"
                          disabled={!newPassword}
                          className="w-full bg-white border border-[#E2E8F0] focus:border-[#06B6D4] focus:ring-1 focus:ring-[#06B6D4]/30 focus:outline-none rounded-xl pl-4 pr-10 py-2 text-xs text-slate-800 font-mono tracking-wider disabled:bg-slate-50 disabled:cursor-not-allowed"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                          disabled={!newPassword}
                        >
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Password Strength Visual gauge */}
                  {newPassword && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-500">安全強度検査:</span>
                        <span className={strength.textColor}>{strength.label}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden flex gap-0.5">
                        <div className={`h-full ${strength.color}`} style={{ width: `${Math.max(20, strength.score * 20)}%` }}></div>
                      </div>
                      <p className="text-[9px] text-slate-400 leading-normal">
                        パスワードは大小英字、数字、特殊文字（!, %, @など）を組み合わせることで強度が向上し、ブルートフォース（総当たり）推測攻撃に対する耐久性が飛躍的に高まります。
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#0F172A] hover:bg-slate-805 text-white font-bold text-xs py-2 px-5 rounded-xl transition duration-150 shadow-sm flex items-center gap-1.5 disabled:opacity-40"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    認証設定を適用
                  </button>
                </div>

              </form>
            </div>

            {/* Security Context Info Card */}
            <div className="space-y-6">
              
              {/* Security Practices Banner */}
              <div className="bg-[#0D1527] text-white rounded-2xl p-6 shadow-lg space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-820">
                  <ShieldAlert className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold font-mono tracking-wider">SECURITY GUARANTEES</span>
                </div>
                
                <ul className="space-y-2.5 text-[10.5px] leading-relaxed text-slate-400 list-none pl-0">
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">&#10003;</span>
                    <span><strong>クライアント強度ハッシュ保護:</strong> 
                    秘密情報をクライアント環境(ブラウザ)において、業界最先端のSHA-256アルゴリズムで暗号強度ハッシュ化、ソルト処理を行い、平文が漏れない仕組みを徹底しています。</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">&#10003;</span>
                    <span><strong>辞書攻撃・ブルートフォース防御:</strong> 
                    3回連続での無効ログイン検出時、システムが強制的に5秒間の時間遅延ウェイト制御をロック。大量の推測攻撃を防ぎます。</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">&#10003;</span>
                    <span><strong>厳密・安全な変更検証:</strong> 
                    メール、パスワード変更において「現在の認証情報の裏付け」を検証要求。他人事後乗っ取りを完璧に排除します。</span>
                  </li>
                </ul>
              </div>

              {/* Reset Control Card inline */}
              <div className="bg-slate-100 border border-slate-200 rounded-2xl p-5 text-center">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Danger Zone</span>
                <p className="text-[10.5px] text-slate-500 mt-1 mb-4 leading-normal font-semibold">
                  全データベース（未完了タスク、日誌）ならびに設定内容をリセット。
                </p>
                <button
                  type="button"
                  onClick={onResetWorkspace}
                  className="w-full bg-rose-50 border border-rose-250 text-rose-600 hover:bg-rose-100 hover:text-rose-700 text-xs py-2 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  アプリ全データの初期化実行
                </button>
              </div>

            </div>
          </motion.div>
        ) : (
          <motion.div
            key="audit-sub"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
            className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4"
          >
            {/* Filter controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-1">
                  <Terminal className="w-5 h-5 text-[#06B6D4]" />
                  セキュリティ監査ログ (Audit Log Engine)
                </h3>
                <p className="text-xs text-slate-500">
                  あなたのアカウントに発生した最新のログイン成功、失敗、IPアドレス、パスワードの改定など全ての監視セキュリティ監査トレールを表示します。
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClearSecurityLogs}
                  disabled={securityLogs.length === 0}
                  className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  ログを消去
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search input */}
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="検索 (メッセージ, IP, ブラウザ環境...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#06B6D4] rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800"
                />
              </div>

              {/* Category selector */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-[#06B6D4]"
              >
                <option value="all">すべて表示</option>
                <option value="auth_success">ログイン成功 (auth_success)</option>
                <option value="auth_failed">ログイン失敗 (auth_failed)</option>
                <option value="auth_lockout">強制ロック (auth_lockout)</option>
                <option value="profile_change">設定変更 (profile_change)</option>
                <option value="session_logout">ログアウト (session_logout)</option>
                <option value="system">システム初期化 (system)</option>
              </select>
            </div>

            {/* Audit Log Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <div className="overflow-x-auto max-h-[460px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#0F172A] text-slate-200/90 font-bold sticky top-0">
                    <tr>
                      <th className="p-3 text-center w-24">タイムスタンプ</th>
                      <th className="p-3">セキュリティイベント</th>
                      <th className="p-3 w-40 text-center font-mono">カテゴリ</th>
                      <th className="p-3 w-32 font-mono">接続IP</th>
                      <th className="p-3 hidden lg:table-cell">検証エージェント/OS</th>
                      <th className="p-3 w-16 text-center">監査</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 bg-white leading-normal">
                          合致するセキュリティ監査ログがありません。
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => {
                        // Badge formatting
                        let badgeStyle = "bg-slate-100 text-slate-600 border-slate-200";
                        if (log.status === "success") badgeStyle = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
                        else if (log.status === "warning") badgeStyle = "bg-amber-500/10 text-amber-500 border-amber-500/20";
                        else if (log.status === "danger") badgeStyle = "bg-rose-500/10 text-rose-500 border-rose-500/20";
                        else if (log.status === "info") badgeStyle = "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";

                        return (
                          <tr key={log.id} className="border-t border-slate-160 hover:bg-slate-100/50 transition duration-150 bg-white">
                            <td className="p-3 text-center whitespace-nowrap text-[10.5px] font-mono text-slate-500">{log.timestamp}</td>
                            <td className="p-3 font-semibold text-slate-800 leading-normal text-[11px]">{log.event}</td>
                            <td className="p-3 text-center font-mono text-[9px]">
                              <span className={`px-2 py-0.5 rounded-full border ${badgeStyle} font-bold text-[8.5px]`}>
                                {log.category}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-[10px] text-slate-500">{log.ipAddress}</td>
                            <td className="p-3 hidden lg:table-cell text-[10px] text-slate-400 truncate max-w-[200px]">{log.userAgent}</td>
                            <td className="p-3 text-center">
                              <span className={`w-2.5 h-2.5 rounded-full inline-block ${
                                log.status === "success" ? "bg-emerald-500" :
                                log.status === "warning" ? "bg-amber-500" :
                                log.status === "danger" ? "bg-rose-500" : "bg-indigo-500"
                              }`} title={log.status} />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
              <span>システム稼働監査: 正常動作中 (AES / SHA-256 Enabled)</span>
              <span>合計レコード数: {filteredLogs.length}件 / {securityLogs.length}件</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
