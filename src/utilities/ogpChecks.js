// OGP プレビュー用のロジック（DOM に依存しない純粋関数群）
// ogp-preview 関数のレスポンスから、各サービスの表示内容とチェック結果を作る。

// 推奨値（各サービスの公開ドキュメントの目安）
export const RECOMMENDED_RATIO = 1.91;
export const RATIO_TOLERANCE = 0.05; // ±5% までは 1.91:1 とみなす
export const RECOMMENDED_WIDTH = 1200;
export const RECOMMENDED_HEIGHT = 630;
export const MIN_SIZE = 200; // Facebook の最小 200×200
export const SUMMARY_MIN = 144; // X の小さいカードの最小 144×144
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // X の上限 5MB
export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 160;
export const TWITTER_CARDS = ['summary', 'summary_large_image', 'app', 'player'];

// 文字数（サロゲートペアを 1 文字と数える）
export function charLength(text) {
  return Array.from(text || '').length;
}

// 表示用に長い文字列を切り詰める
export function truncate(text, max) {
  const chars = Array.from(text || '');
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : chars.join('');
}

export function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (e) {
    return '';
  }
}

// 各サービスが実際に使う値（フォールバックの順序を反映する）
export function resolveDisplay(data) {
  const og = data.og || {};
  const tw = data.twitter || {};
  const basic = data.basic || {};
  const pageUrl = og.url || basic.canonical || data.page || '';
  const ogTitle = og.title || basic.title;
  const ogDescription = og.description || basic.description;
  const ogImage = og.image || tw.image;
  return {
    host: hostOf(pageUrl) || hostOf(data.page),
    siteName: og.site_name || hostOf(pageUrl) || hostOf(data.page),
    favicon: basic.favicon || '',
    themeColor: basic.themeColor || '',
    og: { title: ogTitle, description: ogDescription, image: ogImage },
    twitter: {
      card: TWITTER_CARDS.includes(tw.card) ? tw.card : 'summary',
      title: tw.title || ogTitle,
      description: tw.description || ogDescription,
      image: tw.image || og.image,
    },
  };
}

// 画像の幅・高さ（取得した実寸を優先し、無ければ og:image:width / height）
export function imageDimensions(data) {
  const img = data.image || {};
  if (img.width && img.height) return { width: img.width, height: img.height, source: 'actual' };
  const og = data.og || {};
  if (og.imageWidth && og.imageHeight) return { width: og.imageWidth, height: og.imageHeight, source: 'meta' };
  return null;
}

function check(level, label, detail) {
  return { level, label, detail };
}

/**
 * チェック結果の一覧を作る
 * level: error（表示に支障）/ warn（推奨違反）/ info（あると良い）/ ok
 */
export function runChecks(data) {
  const og = data.og || {};
  const tw = data.twitter || {};
  const basic = data.basic || {};
  const list = [];

  // タイトル
  if (!og.title && !basic.title) {
    list.push(check('error', 'タイトルがありません', 'og:title も <title> もありません。'));
  } else if (!og.title) {
    list.push(check('warn', 'og:title がありません', '<title> で代用されますが、og:title を指定するのが確実です。'));
  } else if (charLength(og.title) > TITLE_MAX) {
    list.push(check('warn', 'og:title が長すぎます', `${charLength(og.title)} 文字です。${TITLE_MAX} 文字程度までにすると途中で切れにくくなります。`));
  } else {
    list.push(check('ok', 'og:title', `${charLength(og.title)} 文字`));
  }

  // 説明文
  if (!og.description && !basic.description) {
    list.push(check('warn', '説明文がありません', 'og:description も meta description もありません。'));
  } else if (!og.description) {
    list.push(check('info', 'og:description がありません', 'meta description で代用されます。'));
  } else if (charLength(og.description) > DESCRIPTION_MAX) {
    list.push(check('warn', 'og:description が長すぎます', `${charLength(og.description)} 文字です。${DESCRIPTION_MAX} 文字程度までが目安です（多くのサービスで途中から省略されます）。`));
  } else {
    list.push(check('ok', 'og:description', `${charLength(og.description)} 文字`));
  }
  if (basic.description && charLength(basic.description) > DESCRIPTION_MAX) {
    list.push(check('info', 'meta description が長めです', `${charLength(basic.description)} 文字です。`));
  }

  // 画像
  const imageUrl = og.image || tw.image;
  if (!imageUrl) {
    list.push(check('error', 'og:image がありません', 'シェアしたときに画像が表示されません。'));
  } else {
    if (!og.image) list.push(check('warn', 'og:image がありません', 'twitter:image はありますが、X 以外では使われないことがあります。'));
    if (/^http:/i.test(imageUrl)) list.push(check('warn', '画像が http です', 'https の URL にしないと表示されないサービスがあります。'));
    const img = data.image;
    if (img && img.error) {
      list.push(check('error', '画像を取得できません', `取得に失敗しました（${img.error}）。URL が正しいか確認してください。`));
    } else if (img && img.contentType && !img.contentType.startsWith('image/')) {
      list.push(check('error', '画像の URL が画像を返しません', `Content-Type が ${img.contentType} です。`));
    } else if (img && img.contentType === 'image/svg+xml') {
      list.push(check('warn', '画像が SVG です', 'SVG は多くのサービスで表示されません。PNG / JPEG を使ってください。'));
    }
    if (img && img.bytes && img.bytes > MAX_IMAGE_BYTES) {
      list.push(check('warn', '画像のファイルサイズが大きすぎます', `${(img.bytes / 1024 / 1024).toFixed(1)} MB です。X は 5MB までです。`));
    }

    const dim = imageDimensions(data);
    if (!dim) {
      list.push(check('info', '画像のサイズが分かりません', '寸法を読み取れませんでした。og:image:width / og:image:height を指定すると確実です。'));
    } else {
      const { width, height } = dim;
      const ratio = width / height;
      const sizeText = `${width}×${height}（比 ${ratio.toFixed(2)}:1）`;
      if (width < MIN_SIZE || height < MIN_SIZE) {
        list.push(check('error', '画像が小さすぎます', `${sizeText}。最低でも ${MIN_SIZE}×${MIN_SIZE} が必要です。`));
      } else if (Math.abs(ratio / RECOMMENDED_RATIO - 1) > RATIO_TOLERANCE) {
        list.push(check('warn', '画像の縦横比が推奨と違います', `${sizeText}。大きい画像のカードでは 1.91:1（${RECOMMENDED_WIDTH}×${RECOMMENDED_HEIGHT} など）が推奨で、違うと上下や左右が切り取られます。`));
      } else if (width < RECOMMENDED_WIDTH) {
        list.push(check('info', '画像が推奨より小さめです', `${sizeText}。高解像度の画面では ${RECOMMENDED_WIDTH}×${RECOMMENDED_HEIGHT} 以上が推奨です。`));
      } else {
        list.push(check('ok', '画像サイズ', sizeText));
      }
    }
    if (!og.imageAlt && !tw.imageAlt) {
      list.push(check('info', '画像の代替テキストがありません', 'og:image:alt を指定すると、読み上げ環境で画像の内容が伝わります。'));
    }
  }

  // Twitter Card
  if (!tw.card) {
    list.push(check('info', 'twitter:card がありません', 'X では小さいカード（summary）として扱われます。大きい画像にするには summary_large_image を指定します。'));
  } else if (!TWITTER_CARDS.includes(tw.card)) {
    list.push(check('warn', 'twitter:card の値が不正です', `「${tw.card}」は使えません。summary / summary_large_image などを指定してください。`));
  } else {
    list.push(check('ok', 'twitter:card', tw.card));
  }

  // URL・その他
  if (!og.url) {
    list.push(check('info', 'og:url がありません', 'シェアされた URL がそのまま使われます。'));
  } else if (basic.canonical && stripSlash(og.url) !== stripSlash(basic.canonical)) {
    list.push(check('warn', 'og:url と canonical が違います', `og:url: ${og.url} / canonical: ${basic.canonical}`));
  }
  if (!basic.canonical) list.push(check('info', 'canonical がありません', '<link rel="canonical"> の指定がありません。'));
  if (!og.type) list.push(check('info', 'og:type がありません', 'website または article などを指定します。'));
  if (!og.site_name) list.push(check('info', 'og:site_name がありません', 'サイト名の代わりにドメイン名が表示されます。'));
  if (basic.faviconFallback) list.push(check('info', 'favicon の指定がありません', '<link rel="icon"> が無いため /favicon.ico を仮定しています。'));
  if (data.truncated) list.push(check('info', 'ページの先頭だけを調べました', 'ページが大きいため、先頭 1MB の範囲だけを読み取りました。'));

  const order = { error: 0, warn: 1, info: 2, ok: 3 };
  return list.sort((a, b) => order[a.level] - order[b.level]);
}

function stripSlash(url) {
  return String(url).replace(/\/+$/, '');
}
