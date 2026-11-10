# 🔧toolbox

このプロジェクト/ウェブサイトは、様々な便利なツールを提供することで、日常の作業や開発プロセスを効率化することを目的としています。  
[English version](README.en.md)

ウェブサイトは[こちら](https://tools.foresuke.com)で公開しています。  


## 機能

以下の機能が含まれます：
※機能は順次追加予定です。

### クライアント情報
- 閲覧環境

### 文字列操作ツール
- Text Hash
- json整形
- xml整形
- テキストケース変換
- ランダム文字列生成
- ルビ生成

### 日付ツール
- 祝日タイマー
- 世界時計
- タイムゾーン変換
- 時間進捗バー
- UNIXTIME変換
- 生年月日情報

### 単位ツール
- 距離単位変換

## 構成

本サイトはNetlifyを使用してホスティングしています。  

基本的にはVue.js を使用してフロント側でのみ処理をしていますが、[閲覧環境](https://tools.foresuke.com/client-info)画面でIPアドレスからおおまかな地域を取得する機能は外部API([ipinfo.io](https://ipinfo.io/))を使用しています。  
CORSエラーを防ぐためにNetlify functions を経由して外部APIを呼び出しています。  

機密情報などはNetlify の環境変数として指定しています。  
指定している項目は以下の通りです。

| Key| サンプル | 説明 | 
| --- | --- | --- | 
| IPINFO_API_TOKEN | aaaaaaaaa | ipinfo.io を呼び出す際に指定するトークン | 
| VUE_APP_AUTHOR | bbbbbbb | 作者名。ブラウザの開発者ツールでコンソールを開くと表示されます | 
| VUE_APP_GA_TRACKING_ID | G-ccccccc | Google Analytics のトラッキングID | 
| VUE_APP_NETLIFY_FUNCTION_DOMAIN | https://hogehoge.netlify.app | バックエンド(Netlify functions)のエンドポイント | 

## セットアップ

開発環境は [Nix](https://nixos.org/) (flakes) と [direnv](https://direnv.net/) で構築します。  
Node.js / Yarn / Go / just などの開発ツールは `flake.nix` で定義しています。

### 前提

- Nix (flakes を有効化済み)
- direnv (シェルへのフック設定済み。[nix-direnv](https://github.com/nix-community/nix-direnv) の併用推奨)

### 手順

1. 本リポジトリを`git clone` する
1. リポジトリ直下で `direnv allow` を実行する (初回は開発ツールの取得に時間がかかります)
1. `.env.sample` を`.env`にコピーして、必要な情報を追記する (`just env` でも可)
1. `just install` で依存パッケージをインストールする
1. `just serve` で開発サーバを起動する
1. [localhost:8080](http://localhost:8080) にブラウザからアクセスする

direnv を使わない場合は `nix develop` で同じ開発シェルに入れます。

## コントリビューション

不具合や機能追加要望などがありましたら、GitHubのIssueやPull Requestを通じてお気軽にどうぞ。

直接連絡を取るにはこちらから。  
- [X(Twitter)](https://twitter.com/foresukecom)
- [Bluesky](https://bsky.app/profile/foresuke.com)
- [discord](https://discord.com/users/1138361849843302482)

## ライセンス

MIT
