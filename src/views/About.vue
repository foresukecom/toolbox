/* eslint-disable vue/multi-word-component-names */

<template>
  <div class="about">
    <h1>About</h1>
    <h2>Google Analyticsについてのプライバシーポリシー</h2>
    <p>
      当サイトでは、サービス向上やサイトの利用状況を理解するために、Google LLCの提供するウェブ解析サービスであるGoogle Analyticsを利用しています。
    </p>
    <p>
      Google Analyticsは、当サイトが発行するクッキー（Cookie）を利用して、個々のユーザーを識別する情報を含みます。ただし、これら情報には個人を特定する情報は含まれません。収集された情報はGoogle LLCのサーバーへ送信・保存されます。
    </p>
    <p>
      Google Analyticsの利用により収集されたデータはGoogle LLCのプライバシーポリシーに基づいて管理されます。Google Analyticsにより収集されたデータの利用に関する説明はGoogle LLCのウェブサイトで確認できます。
    </p>
    <p>
      Google Analyticsのクッキーの使用に関する詳細な情報、及びこれを無効化する方法については以下のGoogle LLCのウェブサイトをご確認ください。
    </p>
    <p>
      <a href="https://www.google.com/intl/ja/policies/technologies/ads/" target="_blank" rel="noopener">Googleの広告に関するポリシー</a>
    </p>
    <p>
      <a href="https://policies.google.com/privacy?hl=ja" target="_blank" rel="noopener">Googleのプライバシーポリシー</a>
    </p>
    <p>
      Google Analyticsを使用しない設定については、以下のGoogle LLCが提供するページからGoogle Analytics Opt-out Browser Add-onをダウンロード・インストールすることでウェブブラウザから無効化することができます。
    </p>
    <p>
      <a href="https://tools.google.com/dlpage/gaoptout?hl=ja" target="_blank" rel="noopener">Google Analytics Opt-out Browser Add-on</a>
    </p>
    <p>
      これらのリンク先はGoogle LLCのウェブサイトであり、当サイトはその内容について一切の責任を負いません。
    </p>
  </div>
</template>

<script>
export default {
  name: 'AboutPage'
};
</script>

<style scoped>
.about {
  padding: 0 30px;
}

h1 {
  font-size: 2em;
  margin-bottom: 0.5em;
}

h2 {
  font-size: 1.5em;
  margin-bottom: 0.5em;
}

p {
  margin-bottom: 1em;
}

a {
  color: blue;
  text-decoration: none;
}
</style>
