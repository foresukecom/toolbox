import { Marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// GFM（表・タスクリスト・取り消し線・自動リンク）を有効にし、コードブロックは highlight.js で色付けする
const md = new Marked(
  { gfm: true },
  {
    renderer: {
      code({ text, lang }) {
        const language = (lang || '').trim().split(/\s+/)[0];
        const body = language && hljs.getLanguage(language)
          ? hljs.highlight(language, text).value
          : escapeHtml(text);
        const cls = language ? ` language-${escapeHtml(language)}` : '';
        return `<pre><code class="hljs${cls}">${body}</code></pre>\n`;
      },
    },
  },
);

// Markdown を HTML に変換し、必ずサニタイズしてから返す
export function renderMarkdown(src) {
  return DOMPurify.sanitize(md.parse(src || ''));
}
