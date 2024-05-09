<template>
  <div>
    <h1>Bluesky 埋め込みコード</h1>

    <h2>前提</h2>
    これはHugoで生成するWebページにBlueskyの投稿内容を埋め込むための機能です。  
    Blueskyの公式機能として、[WebページへBlueskyのポストを埋め込める機能](https://bsky.social/about/blog/post-embeds-guide)が追加されました。  

    ただし埋め込み用のコードをそのまま貼り付けてもHugoで管理しているWebページでは表示されません。  
    なのでBlueskyのポスト表示用の[カスタムショートコード](https://gohugo.io/templates/shortcode-templates/)を作成しました。  
    ショートコードはこちらになります。  

    <text-highlighter :formattedText="`<blockquote class='bluesky-embed' data-bluesky-uri='{{ .Get 'uri' | safeURL }}' data-bluesky-cid='{{ .Get 'cid' | safeHTMLAttr }}'>
  <p lang='ja'>{{ .Inner }}</p>&mdash; {{ .Get 'author' | safeHTML }}
  (<a href='{{ 'https://bsky.app/profile/' | safeURL }}{{ .Get 'user_uri' | safeURL }}?ref_src=embed'>@{{ .Get 'user_domain' | safeHTML }}</a>)
  <a href='{{ 'https://bsky.app/profile/' | safeURL }}{{ .Get 'user_uri' | safeURL }}/post/{{ .Get 'post_id' | safeURL }}?ref_src=embed'>{{ .Get 'date' | safeHTML }}</a>
</blockquote>
<script async src='https://embed.bsky.app/static/embed.js' charset='utf-8'></script>`"
      highlightLanguage="html"></text-highlighter>

      このショートコードを呼び出すためのコードを、埋め込み用のコードから変換するためのページがこちらになります。  

      
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
    };
  },
  components: {
    TextHighlighter,
  },
  methods: {
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
      const author = p.textContent.trim();
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
