# CLAUDE.md — Simple Prompt Holder エージェント設定

## プロジェクト概要

MV3 Chrome拡張「Simple Prompt Holder」。頻用プロンプトを任意ページ上のオーバーレイ（Shadow DOM）から検索しクリップボードへコピーする。

**スタック**: WXT 0.20 / React 19 / TypeScript 5 / Biome 2 / Vitest  
**サーバーレス**: chrome.storage.local でデータ保持、JSON エクスポート/インポート対応。

---

## モデル委譲方針（最重要）

**Claude Fable（上位モデル）が担当する**: アーキテクチャ判断、WXT/MV3/Shadow DOM 絡みの非自明なデバッグ、多ファイルリファクタ、統合レビュー、要件解釈。

**Sonnet/Haiku 等の軽量モデルへ Agent ツール（model 指定）で委譲するもの**:
- 既存パターン踏襲のボイラープレート実装
- 機械的編集（リネーム・import 整理）
- 設計済み純関数のユニットテスト
- CSS 微調整
- ドキュメント/README 更新

**判断基準**: 「既存パターンを X について繰り返すだけ」なら委譲。WXT ライフサイクル・MV3 制約・Shadow DOM 隔離の推論が必要なら司令塔（Fable）が実施。

---

## 開発コマンド

| コマンド | 説明 |
|---|---|
| `npm run dev` | WXT 開発サーバー起動（HMR 付き） |
| `npm run build` | プロダクションビルド（`.output/chrome-mv3/`） |
| `npm run check` | Biome でフォーマット + lint チェック |
| `npm run format` | Biome でフォーマット自動修正 |
| `npm run lint` | Biome で lint 自動修正 |
| `npm test` | Vitest でテスト実行（one-shot） |
| `npm run test:watch` | Vitest をウォッチモードで実行 |

`npm install` は postinstall で `wxt prepare` を自動実行し `.wxt/`（型定義・`#imports` エイリアス等）を生成する。`.wxt/` が存在しない場合、TypeScript 解決に失敗するため先に `npm install` を実行すること。`wxt.config.ts` 変更後は `npx wxt prepare` の再実行が必要。

---

## 規約

- **ストレージアクセス**: 必ず `src/storage.ts` 経由。コンポーネントから `wxt storage` / `chrome.storage` を直接叩くことを禁止。
- **ID 生成**: `crypto.randomUUID()` を使用。
- **ストレージキー**: `local:sph_prompts`。
- **メッセージ型**: `src/messages.ts` で定義。
- **UI 文字列**: 日本語。

---

## オーバーレイのトグル経路（4 系統）

1. `chrome.commands` ショートカット `Alt+Shift+P` → background → sendMessage
2. ツールバーアイコン（`action.onClicked`）→ 同左
3. in-page keydown（`e.code === 'KeyP' && alt && shift`、`isTrusted` 不問）
4. `window.dispatchEvent(new CustomEvent('sph:toggle'))` — **自動テスト用フック**

検証時は `javascript_tool` で④を使い、shadow root は `document.querySelector('sph-overlay').shadowRoot` 経由で検査する。

---

## 既知の落とし穴

- `.wxt/` 未生成だと TS 解決不可 → 先に `npm install` を実行する。
- `wxt.config.ts` 変更後は `wxt prepare` の再実行が必要。
- dev 中の content script 変更は拡張リロード + ページリロードが必要。
- `entrypoints/` に `popup` を作らない（`action.onClicked` が無効化される）。
- ビルド出力は `.output/chrome-mv3/`。
