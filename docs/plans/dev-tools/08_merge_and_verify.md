# Step 08: 統合・最終確認（直列・全エージェント完了後に1人で実施）

## 目的

並列で実装した6ブランチを `feat/dev-tools` に統合し、全体を確認してから `develop` への PR を作る。

## 1. 各ブランチの事前チェック

マージ前に、各ブランチが**担当ファイル以外を変更していないか**確認する。

```bash
cd ~/Library/CloudStorage/Dropbox/local_repo/toolbox
for t in jwt encode cron color diff data-format; do
  echo "== feat/dev-tools-$t"
  git diff --stat feat/dev-tools...feat/dev-tools-$t
done
```

期待: 各ブランチで変更が `src/views/<担当>.vue` の1ファイルだけ。

担当外の変更があった場合:

- 単純なはみ出し（フォーマッタが他ファイルを触った等）→ そのブランチで該当変更を取り消してからマージ
- 依存追加が必要だった旨の報告がある → `feat/dev-tools` で依存を追加するコミットを先に作る

## 2. マージ

```bash
git switch feat/dev-tools
for t in jwt encode cron color diff data-format; do
  git merge --no-ff "feat/dev-tools-$t" -m "merge: feat/dev-tools-$t"
done
```

担当ファイルが分かれているので、コンフリクトは発生しない想定。発生した場合は、どこかのブランチが共有ファイルを触っているので、手順1に戻って確認する。

## 3. 全体確認

1. `yarn install --immutable` が成功（`yarn.lock` に差分が出ない）
2. `yarn lint` がエラー 0
3. `yarn build` が成功。`chunk-vendors` のサイズ増加を記録する（参考: 導入前 3438 KiB）
4. `yarn serve` で起動し、以下を確認
   - ホームの「開発者ツール」に6リンクがあり、すべて「準備中」ではなく実装済みの画面になっている
   - 各ツールで、担当プランの「動作確認」表から最低3項目を抜き打ちで確認
   - ブラウザの開発者ツールの Network タブで、ツール操作中に外部への通信が発生していない
   - ツール間を行き来してもコンソールにエラーが出ない
5. スマホ幅（DevTools のデバイスモード）で表示が崩れない

## 4. 後片付け

```bash
for t in jwt encode cron color diff data-format; do
  git worktree remove ~/worktrees/toolbox-$t
  git branch -d "feat/dev-tools-$t"
done
git worktree prune
```

## 5. ドキュメント更新

[docs/roadmap.md](../../roadmap.md) の Wave 1 の6行を ✅ に更新してコミットする。

## 6. PR 作成

- push 前に差分の要約を提示して確認を取る
- `gh pr create --base develop` で作成。本文には変更概要（6ツールの一覧）と動作確認手順（上記3の内容）を書く
- マージは人間が行う

## 振り返り（herdr 並列化の評価メモ）

次回の Wave 2 に向けて記録しておく。

| 項目 | メモ |
|---|---|
| 並列実装にかかった時間（最初の着手〜全員 done） | |
| blocked になった回数と理由 | |
| 担当外ファイルを触ったエージェント | |
| プランの不足で質問が来た箇所 | |
| 次回プランに追記すべきこと | |
