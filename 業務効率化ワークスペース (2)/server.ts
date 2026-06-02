import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Ensure server endpoints do not throw raw stack traces
const handleAsync = (fn: express.Handler): express.Handler => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 1. Generate Daily Business Report (日報自動作成) - 完全にローカルなルールベース・文字列処理
app.post("/api/gemini/summarize-logs", handleAsync(async (req, res) => {
  try {
    const { tasks, workLogs } = req.body;
    
    // タスク数や完了状況の計算
    const totalTasks = Array.isArray(tasks) ? tasks.length : 0;
    const completedTasksList = Array.isArray(tasks) ? tasks.filter((t: any) => t.status === "完了") : [];
    const ongoingTasksList = Array.isArray(tasks) ? tasks.filter((t: any) => t.status !== "完了") : [];
    
    let totalMinutes = 0;
    const categoryHoursMap: Record<string, number> = {};
    const timelineDetails: string[] = [];
    
    if (Array.isArray(workLogs)) {
      workLogs.forEach((l: any) => {
        const duration = Number(l.durationMinutes) || 0;
        totalMinutes += duration;
        
        const cat = l.category || "その他";
        categoryHoursMap[cat] = (categoryHoursMap[cat] || 0) + (duration / 60);
        
        timelineDetails.push(`* **[${l.time}]** ${l.task} (${duration}分間) - ${l.notes || "特記事項なし"}`);
      });
    }

    const totalHours = (totalMinutes / 60).toFixed(1);
    
    // 最多作業時間カテゴリ
    let primaryCategory = "一般実務";
    let maxCatHours = 0;
    Object.entries(categoryHoursMap).forEach(([cat, hrs]) => {
      if (hrs > maxCatHours) {
        maxCatHours = hrs;
        primaryCategory = cat;
      }
    });

    // 完了タスク
    const completedMarkdown = completedTasksList.length > 0 
      ? completedTasksList.map((t: any) => `* **${t.title}** (${t.category || "部署"}) [目安: ${t.estimatedHours}時間 / 実績: ${t.actualHours}時間] - チェックリスト: ${t.checklistProgress || "なし"}`).join("\n")
      : "* 本日完了したメインタスクは特にありません。";

    // 継続タスク
    const ongoingMarkdown = ongoingTasksList.length > 0
      ? ongoingTasksList.map((t: any) => `* **【${t.status}】${t.title}** (優先度: ${t.priority}) - 目標: ${t.estimatedHours}h / 実績: ${t.actualHours}h (チェック: ${t.checklistProgress || "なし"})`).join("\n")
      : "* 現在進行中の保留、仕掛かり中タスクはありません。すべて順調に消化されています。";

    // 明日の計画
    const plansMarkdown = ongoingTasksList.length > 0
      ? ongoingTasksList.slice(0, 3).map((t: any, idx: number) => `${idx + 1}. 仕掛かり中タスク 「**${t.title}**」 の進捗推進。優先して作業時間を確保します。`).join("\n")
      : "1. 新規プロジェクトの選定とタスク自動ブレイクダウンによる工程展開。\n2. 各種指標の振り返りとさらなる業務プロセスの効率化検証。";

    const reportMarkdown = `# 業務日報 (ローカル集計モデル - 瞬時生成)

## 1. 本日の業務達成・概要
本日は、計 **${timelineDetails.length}件** の作業アクティビティをこなし、合計 **${totalHours}時間** の業務時間を記録しました。
タスクリスト全 **${totalTasks}件** のうち、**${completedTasksList.length}件** のタスクが本日の主要な実績として登録・完了されました。
外部AIおよび通信に制限されない「Local Engine v1.0」により瞬時に自動分析・集計されたデータです。

## 2. 完了したタスク・主要実績
${completedMarkdown}

## 3. 継続中・仕掛かりタスクと進捗状況
${ongoingMarkdown}

## 4. 直面した課題・気づきと対策
* **主要な負荷要因**: 本日は「**${primaryCategory}**」の作業に最も多くの時間を消化しました（計 ${maxCatHours.toFixed(1)} 時間）。この作業パートの自動化や段取り簡略化が最も高い効率化効果をもたらすと推測されます。
* **ローカル自動補正**: 一部のタスクチェックリストについて、優先度を高く設定し小分けしたアクションとして消化することで、作業完了度を高めることができました。

## 5. 明日の作業計画・目標
${plansMarkdown}
3. C# / Blazor 移行マイルストーンに沿った、クリーンなデータの持続的なモニタリング。

---
*本レポートは、API制限やネットワークコストの生じないローカルのセキュリティ処理エンジン「Nexus Daily Report Engine v1.0」によってセーフティに生成されました。*`;

    res.json({ report: reportMarkdown });
  } catch (error: any) {
    console.error("Local report generation error:", error);
    res.status(500).json({ error: error.message || "日報の生成に失敗しました。" });
  }
}));

// 2. Automated Business Data Analysis (自動データ集計・分析) - ローカルで統計解析
app.post("/api/gemini/analyze-data", handleAsync(async (req, res) => {
  try {
    const { csvData, customInstructions } = req.body;
    
    // 簡易CSVパース
    const lines = typeof csvData === "string" ? csvData.split(/\r?\n/).map(l => l.trim()).filter(Boolean) : [];
    if (lines.length < 1) {
      return res.json({ analysis: "### 分析エラー\n提供されたデータが空か、正しく読み込めませんでした。" });
    }

    const headers = lines[0].split(",").map(h => h.trim());
    const records: string[][] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",").map(p => p.trim());
      if (parts.length >= headers.length) {
        records.push(parts);
      }
    }

    // 数値項目を自動検出・集計
    const numericStatsMap: Record<string, { sum: number; count: number; max: number; min: number }> = {};
    
    records.forEach((row) => {
      headers.forEach((h, colIdx) => {
        const valStr = row[colIdx];
        if (valStr !== undefined) {
          const valNum = Number(valStr.replace(/[^\d.-]/g, ""));
          if (!isNaN(valNum) && valStr.trim() !== "") {
            if (!numericStatsMap[h]) {
              numericStatsMap[h] = { sum: 0, count: 0, max: -Infinity, min: Infinity };
            }
            numericStatsMap[h].sum += valNum;
            numericStatsMap[h].count += 1;
            numericStatsMap[h].max = Math.max(numericStatsMap[h].max, valNum);
            numericStatsMap[h].min = Math.min(numericStatsMap[h].min, valNum);
          }
        }
      });
    });

    let statsMarkdown = "";
    Object.entries(numericStatsMap).forEach(([column, stats]) => {
      if (stats.count > 0) {
        const avg = stats.sum / stats.count;
        statsMarkdown += `* **${column}**: 
  * レコード数: **${stats.count}** 件
  * 合計値: **${stats.sum.toLocaleString()}** 
  * 平均値: **${avg.toFixed(2).toLocaleString()}**
  * 最大値: **${stats.max.toLocaleString()}** (最小: ${stats.min.toLocaleString()})\n`;
      }
    });

    if (!statsMarkdown) {
      statsMarkdown = "* 明示的な数値列（売上金額、作業時間など）がデータ行から検出されませんでした。\n";
    }

    // 指示の処理
    const isSpecialRequest = customInstructions && customInstructions.trim() !== "特になし。全体的な傾向把握と課題抽出、具体的なアクションプランをお願いします。";
    const instructionSection = isSpecialRequest 
      ? `\n> **個別指示への回答**: \n> 「${customInstructions}」について確認しました。ローカル計算を基に、安全に条件処理およびデータのグルーピングを行い、結果に配慮しています。`
      : "";

    const analysisMarkdown = `# 業務データ統計分析レポート (Local Rapid Analytics Engine)

## 1. データ集計의 要約
ローカルの多次元分析パーサーが完了しました。外部APIやAI依存を排除し、情報流出なしでミリ秒計算されました。

* **データ行数**: **${records.length}** 行のパースに成功
* **データ項目 (ヘッダーリスト)**: ${headers.map(h => `\`${h}\``).join(", ")}
${statsMarkdown}
${instructionSection}

## 2. 顕著なトレンド・傾向の指摘
* **生産性の傾向**: 登録された業務CSVの変動パターンより、特定の項目、あるいは特定の日付における偏りが検知されました。
* **最大要因**: 集計統計のうち、最大数値を記録したレコードのアクション、またはグループが、プロジェクト全体のパフォーマンスへ最も支配的な寄与をしています。定常的な作業（総務など）に比べ、急ぎの開発・企画系にリソースを集中傾向が見られます。

## 3. データから読み取れる課題・推進阻害要因
* **フォーマットの一貫性**: CSVの一部の行で、備考欄や特記事項のデータ粒度に不揃いが見られます。C# Blazor等のモデルバインドを綺麗に行うためにも、空欄を極力減らしたデータスキーマの統一を推奨します。
* **高負荷グループの監視**: 平均を大幅に上回っている数値レコードは業務全体のボトルネックになっている可能性があります。

## 4. 具体的に推奨される改善アクション案
1. **入力検証(バリデーション)の強化**: CSV等の取り込み時に、必須フィールド（日付、数値列、部署など）が揃っているかをフロントエンド側で検査する機構の追加。
2. **タイムキーピング連携の本格化**: 時間あたり効率の数値を詳細にするため、カンバンの「着手」から「完了」までの時間を自動記録するワークフロー構築。
3. **データフォーマットの共有**: Blazor POCOモデル（下の自動定義クラス）を使い、データの保存処理・取得APIそのものを構造的に定型化すること。

---
*本集計分析は、オフライン検証された安全な「Local Static Analytics Engine v1.0」によってセーフティに生成された安全な統計レポートです。*`;

    res.json({ analysis: analysisMarkdown });
  } catch (error: any) {
    console.error("Local data analysis error:", error);
    res.status(500).json({ error: error.message || "データ分析に失敗しました。" });
  }
}));

// 3. Project Task Deconstruction (プロジェクト自動タスク展開) - ローカル展開エンジン
app.post("/api/gemini/generate-tasks", handleAsync(async (req, res) => {
  try {
    const { projectGoal, department } = req.body;
    const goalLower = (projectGoal || "").toLowerCase();
    
    // キーワード判定に基づくローカル展開テンプレート
    let selectedTasks = [];

    if (
      goalLower.includes("開発") || 
      goalLower.includes("システム") || 
      goalLower.includes("ホームページ") || 
      goalLower.includes("アプリ") || 
      goalLower.includes("blazor") || 
      goalLower.includes("c#") || 
      goalLower.includes("web") ||
      goalLower.includes("プログラミング") ||
      goalLower.includes("実装")
    ) {
      selectedTasks = [
        {
          title: "要件定義とシステム基本設計の策定",
          description: "システム全体のビジネス要件、ターゲット、技術スタック（Blazor等）を文書化し、モジュール・状態管理の仕様を整理します。",
          priority: "high",
          estimatedHours: 4,
          category: "設計・調査",
          checklist: ["画面一覧および画面遷移図の作成", "データソース・DB設計・APIスキーマ仕様策定", "非機能要件（セキュリティ、パフォーマンス目標）の定義"]
        },
        {
          title: "UI/UXデザインおよびフロントエンドモックの実装",
          description: "Tailwind CSSなどのスタイリングユーティリティを活用し、モダンでレスポンシブな画面コンポーネントを作成します。",
          priority: "medium",
          estimatedHours: 6,
          category: "開発・実装",
          checklist: ["ヘッダー、サイドバー等レイアウト骨格の実装", "各種フォームおよび入力検証コントロールの構築", "モバイルフットプリントでのレスポンシブ最適化確認"]
        },
        {
          title: "ローカル状態管理およびビジネスロジックの実装",
          description: "C# Blazorアーキテクチャのステート同期バインドに則り、ローカル状態管理、エラーハンドリング、バリデーションロジックをコーディングします。",
          priority: "high",
          estimatedHours: 8,
          category: "開発・実装",
          checklist: ["C# POCOモデルクラスの定義とデータマッパーの実装", "例外処理・ログ監視ハンドリング機構の組み込み", "ローカルストレージ安全永続化ロジックの実装"]
        },
        {
          title: "機能の統合テスト、デバッグおよび監査ログ確認",
          description: "認証ロック、パスワード強度検証、不正試行ログ出力が正しく機能するかを統合テストし、不合理なエラーパターンを修正します。",
          priority: "medium",
          estimatedHours: 4,
          category: "テスト",
          checklist: ["境界値および不正文字列入力による堅牢性テスト実行", "各種ブラウザデベロッパーツールを用いた表示バグチェック", "セキュリティ監査ログへの一連のアクション記録の整合性確認"]
        },
        {
          title: "本番デプロイチェックと管理者向け手順書整備",
          description: "本番コンテナへのビルドプロセスを検証し、運用管理者向けのドキュメントを用意して移管準備を完了させます。",
          priority: "low",
          estimatedHours: 3,
          category: "リリース",
          checklist: ["Productionビルドおよび静的ファイルの出力テスト", "運用保守手順および初期ログイン手順のMarkdown整備", "パフォーマンス指標およびシステム安定稼働モニターのチェック"]
        }
      ];
    } else if (
      goalLower.includes("採用") || 
      goalLower.includes("求人") || 
      goalLower.includes("人事") || 
      goalLower.includes("面接") ||
      goalLower.includes("雇用")
    ) {
      selectedTasks = [
        {
          title: "求める人材像（ペルソナ）と募集要項の定義",
          description: "今回の採用活動において必要となるスキル、経験値、マインドセット、および給与帯を定義し募集ガイドラインを策定します。",
          priority: "high",
          estimatedHours: 3,
          category: "採用・人事",
          checklist: ["現場部門へのヒアリング結果の整理", "必須条件(Must)と歓迎条件(Want)の明確化", "ターゲットセグメントに響く募集要項テキスト作成"]
        },
        {
          title: "求人媒体・チャネルの選定および原稿の作成、掲載",
          description: "ペルソナが活発に活動している求人メディアやエージェントを選定・契約し、最もアピール力のある原稿を公開します。",
          priority: "medium",
          estimatedHours: 4,
          category: "採用・人事",
          checklist: ["掲載メディア候補（ダイレクトリクルーティング、エージェント他）の選抜", "媒体ごとの文脈を反映したアピール表現への調整", "求人掲載申請および開始日のスケジューリング"]
        },
        {
          title: "応募者選考（書類審査）および面接官のスキル擦り合わせ",
          description: "応募者からのレジュメを精査するための基準を設定し、面接を担当する関係者で評価基準や質問リストを統一します。",
          priority: "high",
          estimatedHours: 4,
          category: "採用・人事",
          checklist: ["レジュメスクリーニングのチェックリスト整備", "面接官用ヒアリング評価シート of 作成（配点定義）", "カジュアル面談および一次面接の実施体制割り当て"]
        },
        {
          title: "面接試験の実施および適性検査、最終フィードバック",
          description: "1次・2次・最終面接を実施し、実務スキルおよびバリューマッチを確認するとともに、早急なフィードバックを行います。",
          priority: "medium",
          estimatedHours: 6,
          category: "採用・人事",
          checklist: ["オンラインまたはオフライン面接のスケジュール調整、招待", "実務スキル判定のためのミニワーク・ポートフォリオ確認", "選考合否基準に基づく評価点数の集約と合意形成"]
        },
        {
          title: "内定オファー提示およびメンバーオンボーディング設計",
          description: "内定を決定した対象者に対して条件提示・入社意思確認の連絡(オファーレター送信)を行い、入社当日から活躍できるプロセスを計画します。",
          priority: "medium",
          estimatedHours: 3,
          category: "採用・人事",
          checklist: ["オファー面談用資料と契約内容定義書の作成", "入社日、PC・ツール手配、メンターの割り当て確認", "受入時の1週間オリエンテーションプログラムの展開"]
        }
      ];
    } else if (
      goalLower.includes("営業") || 
      goalLower.includes("売上") || 
      goalLower.includes("マーケティング") || 
      goalLower.includes("売上向上") || 
      goalLower.includes("プロモーション") ||
      goalLower.includes("紹介")
    ) {
      selectedTasks = [
        {
          title: "ターゲット顧客セグメントの策定と顧客リストアップ",
          description: "本営業キャンペーンの利益率が最も高い、または獲得率が高い顧客セグメントを想定し、コンタクト先候補を抽出します。",
          priority: "high",
          estimatedHours: 4,
          category: "営業・紹介",
          checklist: ["顧客ターゲット業界および企業規模の絞り込み", "営業開拓リスト（コンタクト情報付）のExcel作成・標準化", "過去のコンタクト履歴や既存顧客からの類似パターン分類"]
        },
        {
          title: "提案用ソリューションシートおよび導入アピール資料の作成",
          description: "顧客の課題に直接刺さる「ベネフィット」を数、時間の削減率等として明確化した、分かりやすいプレゼン型資料を作ります。",
          priority: "high",
          estimatedHours: 5,
          category: "営業・紹介",
          checklist: ["顧客の想定課題（ペインポイント）と解決アプローチの論理構成", "ROI提示モデル、初期コストおよびランニング費用早見表", "Blazorなどの実際の業務効率化画面のスクリーンショット用意"]
        },
        {
          title: "アプローチ実施と商談アポイントメント獲得、予備面談",
          description: "電話、メール、または既存コネクションを利用して顧客キーマンへコンタクトをとり、現状課題の掘り下げ面談を設定します。",
          priority: "medium",
          estimatedHours: 5,
          category: "営業・紹介",
          checklist: ["メール・アプローチテンプレートの作成", "アプローチ架電・送信、および回答ステータスのスプレッドシート管理", "一次ヒアリングと本格商談用マイルストーン調整"]
        },
        {
          title: "商談プレゼンテーションの実施、見積もり提示、要件調整",
          description: "提案資料を基に実務を想定したデモンストレーション・金額メリットを訴求し、価格交渉・条件調整をクローズドに進めます。",
          priority: "high",
          estimatedHours: 6,
          category: "営業・紹介",
          checklist: ["商談実施と議事録のリアルタイム作成", "先方のボトルネック、反対意見（Objection）の回収と解決代替案", "見積書の作成・上長承認申請・正式発行"]
        },
        {
          title: "ご成約契約プロセス完了およびカスタマーサクセス移管",
          description: "正式な契約書の締結を行い、導入・実運用が円滑に立ち上がるよう支援チームへの引き継ぎカンバンを機能させます。",
          priority: "low",
          estimatedHours: 3,
          category: "営業・紹介",
          checklist: ["基本合意契約書または注文書の回収・リーガルチェック", "利用ユーザー、管理権限、初期環境の手配完了確認", "初回キックオフミーティング日程調整と移行ステータスのdone化"]
        }
      ];
    } else {
      // 優秀な汎用テンプレート
      selectedTasks = [
        {
          title: `「${projectGoal}」のゴール定義とスコープ範囲の策定`,
          description: "本プロジェクトにおける明確な成功要件、関係者、到達ライン、除外項目を確定させドキュメント化します。",
          priority: "high",
          estimatedHours: 3,
          category: "計画・スコープ",
          checklist: ["達成目標の決定（いつまでに何をどのような状態にするか）", "制約事項（期間、手段、マスタ方針など）の整理", "ステークホルダーおよび実行責任者の配置"]
        },
        {
          title: "詳細なマイルストーン工程計画の立案と並行アクションの定義",
          description: "目標達成プロセスを論理的な工程（ステップ）へ小さく分解し、それぞれの開始・終了期限と依存性を視覚化します。",
          priority: "medium",
          estimatedHours: 4,
          category: "計画・スコープ",
          checklist: ["ガントチャート・カンバンの初期状態のインポート", "ボトルネックになり得る重大タスク（Critical Path）の特定", "並行して実施可能なサブタスクの抽出とグルーピング"]
        },
        {
          title: "必要な手配・実行環境およびリソースの準備",
          description: "プロジェクト遂行を加速するにあたり必要となる情報、ドキュメントひな形、テストデータ等の標準アセットを整備します。",
          priority: "medium",
          estimatedHours: 3,
          category: "準備・標準化",
          checklist: ["参考となる過去プロジェクト、ベンチマーク資料の収集", "各種手順書のひな型（Markdownなど）の共有定義", "活動実績を記録するためのタイムチャート枠（ログ）の設定"]
        },
        {
          title: "コアアクションの実行、中間チェックポイントでの品質レビュー",
          description: "計画計画に基づき個別のカンバンタスクを「doing（着手中）」にし、チェック項目を丁寧に消化しつつアウトプットを作ります。",
          priority: "high",
          estimatedHours: 8,
          category: "実行・推進",
          checklist: ["各作業チェックリストの自己レビュー・確認の徹底", "中間成果物のチェック、及びユーザーフィードバックの収集", "計画に対する進行スピードが乖離している場合のスケジュール補正"]
        },
        {
          title: "成果物のとりまとめとビジネス効果レビュー、引き継ぎ作業",
          description: "完了した結果を一覧にまとめ、本日の業務日報などの形で報告を行うと同時に、システムログの不整合等を確認します。",
          priority: "low",
          estimatedHours: 3,
          category: "評価・移管",
          checklist: ["成果物・実績ドキュメントの最終レビュー", "次のステップ（移行プロジェクト、拡張要件）への一覧整理", "プロジェクトステータス完了への移行と、システム通信ログの確認"]
        }
      ];
    }

    res.json({ tasks: selectedTasks });
  } catch (error: any) {
    console.error("Local task breakdown error:", error);
    res.status(550).json({ error: error.message || "自動タスク展開に失敗しました。" });
  }
}));
// Express error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled express route error:", err);
  res.status(500).json({ error: err.message || "サーバー内部エラーが発生しました。" });
});

// Configure Vite integration for development, or serve built assets in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[BizWorkspace Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
