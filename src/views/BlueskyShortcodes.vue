<template>
  <div>
    <h1>Bluesky 埋め込みコード</h1>

    <div @click="toggleAccordion" class="accordion cursor-pointer p-2 bg-gray-200">
      <h2 class="font-bold">前提</h2>
    </div>
    <div v-if="isOpen">
      <p>
        これはHugoで生成するWebページにBlueskyの投稿内容を埋め込むための機能です。
      </p>
      <p>
         Blueskyの公式機能として、 <a href="https://bsky.social/about/blog/post-embeds-guide">WebページへBlueskyのポストを埋め込める機能</a>
          が追加されました。
      </p>
      <p>
        ただし埋め込み用のコードをそのまま貼り付けてもHugoで管理しているWebページでは表示されません。
        なのでBlueskyのポスト表示用の
        <a href="https://gohugo.io/templates/shortcode-templates/">カスタムショートコード</a>
        を作成しました。
        ショートコードは以下の通りです。
      </p>

      <text-highlighter :formattedText="`<blockquote class='bluesky-embed' data-bluesky-uri='{{ .Get 'uri' | safeURL }}' data-bluesky-cid='{{ .Get 'cid' | safeHTMLAttr }}'>
  <p lang='ja'>{{ .Inner }}</p>&mdash; {{ .Get 'author' | safeHTML }}
  (<a href='{{ 'https://bsky.app/profile/' | safeURL }}{{ .Get 'user_uri' | safeURL }}?ref_src=embed'>@{{ .Get 'user_domain' | safeHTML }}</a>)
  <a href='{{ 'https://bsky.app/profile/' | safeURL }}{{ .Get 'user_uri' | safeURL }}/post/{{ .Get 'post_id' | safeURL }}?ref_src=embed'>{{ .Get 'date' | safeHTML }}</a>
</blockquote>
<script async src='https://embed.bsky.app/static/embed.js' charset='utf-8'></script>`"
        highlightLanguage="html"></text-highlighter>

      このショートコードを呼び出すためのコードを、埋め込み用のコードから変換するためのページがこちらになります。
    </div>


    <textarea class="resize border rounded-md p-3 w-2/3" v-model="htmlInput" @input="generateShortcode"
      placeholder="Bluesky 埋め込みコード"></textarea>

    <TextHighlighter :formattedText="shortcodeOutput" highlightLanguage="html" />
  </div>
</template>

<script>
import "highlight.js/styles/monokai.css";
import TextHighlighter from "@/components/TextHighlighter.vue";

export default {
  data() {
    return {
      htmlInput: '',
      shortcodeOutput: '',
      errorMessages: "",
      hasError: false,
      isOpen: false,
    };
  },
  components: {
    TextHighlighter,
  },
  methods: {
    toggleAccordion() {
      this.isOpen = !this.isOpen;
    },
    generateShortcode() {
      // 新しいDOMParserインスタンスを作成
      const parser = new DOMParser();
      // HTML入力を解析してDOMに変換
      const doc = parser.parseFromString(this.htmlInput, "text/html");
      // 必要なデータをDOMから抽出
      const blockquote = doc.querySelector('blockquote.bluesky-embed');
      const p = blockquote.querySelector('p');
      const authorLink = blockquote.querySelector('a[href^="https://bsky.app/profile/"]');
      const postLink = blockquote.querySelector('a[href^="https://bsky.app/profile/"]:last-of-type');

      // 抽出したデータからURIとCIDを取得
      const uri = blockquote.dataset.blueskyUri;
      const cid = blockquote.dataset.blueskyCid;

      // author, user_uri, user_domainの抽出
      let author = p.textContent.trim();
      // 改行を削除
      author = author.replace(/\r?\n|\r/g, " "); // 改行をスペースに置き換える

      const user_uri = new URL(authorLink.href).pathname.split('/')[2];
      const user_domain = authorLink.textContent.trim().replace('@', '');

      // post_id と date の抽出
      const post_id = postLink.href.split('/').pop();
      const date = postLink.textContent.trim();

      // Shortcode形式で出力
      this.shortcodeOutput = `{{< blueskyEmbed uri="${uri}" cid="${cid}" author="${author}" user_uri="did:plc:${user_uri}" user_domain="${user_domain}" post_id="${post_id}" date="${date}" >}}
${p.textContent}
{{< /blueskyEmbed >}}`;
    },
  },
};
</script>
