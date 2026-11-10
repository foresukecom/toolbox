# 開発の友 - 開発タスクランナー
#
# `just` をインストールしたうえで `just <recipe>` で実行する。
# 引数なしで `just` を叩くと利用可能なレシピ一覧が表示される。

set shell := ["bash", "-cu"]

# 既定: レシピ一覧表示
default:
    @just --list

# 依存パッケージのインストール
install:
    yarn install

# 開発サーバを起動 (vue-cli-service serve)
serve:
    yarn serve

# `serve` のエイリアス
dev: serve

# 本番ビルド -> dist/
build:
    yarn build

# Lint 実行
lint:
    yarn lint

# Lint 自動修正
lint-fix:
    yarn lint --fix

# 出力物・キャッシュを削除
clean:
    rm -rf dist node_modules/.cache

# node_modules ごと初期化して再インストール
reinstall:
    rm -rf node_modules
    yarn install

# .env が無ければ .env.sample から生成
env:
    test -f .env || cp .env.sample .env

# Lint と build をまとめて実行 (CI 想定)
check: lint build
