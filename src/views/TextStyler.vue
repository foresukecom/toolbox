<template>
  <div class="flex justify-center">
    <div class="w-2/3 px-4">
      <h1 class="text-2xl mb-4">修飾文字ジェネレーター</h1>

      <p class="mb-4 text-sm text-gray-700">
        このツールを使用して、様々なスタイルでテキストを装飾できます。太字、イタリック、古風な文字、バブル文字など、多様なスタイルが利用可能です。変換されたテキストは、SNSの投稿やデザイン作業などで自由に利用できます。
      </p>

      <div>
        <label for="inputText" class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-900">テキスト入力</label>
        <input type="text" id="inputText" v-model="inputText" @input="convertText"
          class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-900 dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="装飾したいテキストを入力" required>
      </div>

      <div class="mb-8"></div>

      <TextHighlighter width="w-full" :formattedText="boldText" label="太字 [𝗦𝗮𝗺𝗽𝗹𝗲 𝗧𝗘𝗫𝗧]" />
      <TextHighlighter width="w-full" :formattedText="italicText" label="イタリック (𝘚𝘢𝘮𝘱𝘭𝘦 𝘛𝘌𝘟𝘛)" />
      <TextHighlighter width="w-full" :formattedText="boldItalicText" label="太字イタリック [𝙎𝙖𝙢𝙥𝙡𝙚 𝙏𝙀𝙓𝙏]" />
      <TextHighlighter width="w-full" :formattedText="blackletterText" label="古風な文字 [𝔖𝔞𝔪𝔭𝔩𝔢 𝔗𝔈𝔛𝔗]" />
      <TextHighlighter width="w-full" :formattedText="bubbleText" label="バブル文字 [Ⓢⓐⓜⓟⓛⓔ ⓉⒺⓍⓉ]" />
      <TextHighlighter width="w-full" :formattedText="enclosedAlphanumericsText" label="四角囲み文字(大文字のみ対応) [🅂🄰🄼🄿🄻🄴 🅃🄴🅇🅃]" />
      <TextHighlighter width="w-full" :formattedText="underlinedText" label="下線付き [S̲a̲m̲p̲l̲e̲ ̲T̲E̲X̲T̲]" />
      <TextHighlighter width="w-full" :formattedText="overlinedText" label="上線付き [S̅a̅m̅p̅l̅e̅ ̅T̅E̅X̅T̅]" />
      <TextHighlighter width="w-full" :formattedText="strikethroughText" label="打ち消し線付き [S̶a̶m̶p̶l̶e̶ ̶T̶E̶X̶T̶]" />
      <TextHighlighter width="w-full" :formattedText="transparentEnclosedText" label="黒背景丸囲み文字(大文字のみ対応) [🅢🅐🅜🅟🅛🅔 🅣🅔🅧🅣]" />
      <TextHighlighter width="w-full" :formattedText="blackSquareEnclosedText" label="黒背景四角囲み文字(大文字のみ対応) [🆂🅰🅼🅿🅻🅴 🆃🅴🆇🆃]" />
      <TextHighlighter width="w-full" :formattedText="mirrorText" label="鏡文字 [Sɐɯdlǝ ┴ƎX┴]" />
      <TextHighlighter width="w-full" :formattedText="scriptText" label="筆記体 [𝒮𝒶𝓂𝓅𝓁𝑒 𝒯ℰ𝒳𝒯]" />
      <TextHighlighter width="w-full" :formattedText="superscriptText" label="小文字上付き文字(小文字のみ対応) [ˢᵃᵐᵖˡᵉ ᵗᵉˣᵗ]" />
      <TextHighlighter width="w-full" :formattedText="upsideDownText" label="逆さ文字 [⊥XƎ⊥ ǝldɯɐS]" />

    </div>
  </div>
</template>


<script>
import TextHighlighter from "@/components/TextHighlighter.vue";
export default {
  components: {
    TextHighlighter,
  },
  data() {
    return {
      inputText: '',
      boldText: '',
      italicText: '',
      boldItalicText: '',
      blackletterText: '',
      bubbleText: '',
      enclosedAlphanumericsText: '',
      underlinedText: '',
      overlinedText: '',
      strikethroughText: '',
      transparentEnclosedText: '',
      mirrorText: '',
      scriptText: '',
      superscriptText: '',
      upsideDownText: '',
    };
  },
  methods: {
    convertText() {
      this.boldText = this.toBoldText(this.inputText);
      this.italicText = this.toItalicText(this.inputText);
      this.boldItalicText = this.toBoldItalicText(this.inputText);
      this.blackletterText = this.toBlackletterText(this.inputText);
      this.bubbleText = this.toBubbleText(this.inputText);
      this.enclosedAlphanumericsText = this.toEnclosedAlphanumericsText(this.inputText);
      this.underlinedText = this.toUnderlinedText(this.inputText);
      this.overlinedText = this.toOverlinedText(this.inputText);
      this.strikethroughText = this.toStrikethroughText(this.inputText);
      this.transparentEnclosedText = this.toTransparentEnclosedText(this.inputText);
      this.blackSquareEnclosedText = this.toBlackBackgroundEnclosedAlphabetText(this.inputText);
      this.mirrorText = this.toMirrorText(this.inputText);
      this.scriptText = this.toScriptText(this.inputText);
      this.superscriptText = this.toSuperscriptText(this.inputText);
      this.upsideDownText = this.toUpsideDownText(this.inputText);
    },
    toBoldText(str) {
      const boldChars = {
        'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝', 'K': '𝗞', 'L': '𝗟', 'M': '𝗠',
        'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧', 'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
        'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷', 'k': '𝗸', 'l': '𝗹', 'm': '𝗺',
        'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁', 'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
        '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
      };
      return str.split('').map(char => boldChars[char] || char).join('');
    },
    toItalicText(str) {
      const italicChars = {
        'A': '𝘈', 'B': '𝘉', 'C': '𝘊', 'D': '𝘋', 'E': '𝘌', 'F': '𝘍', 'G': '𝘎', 'H': '𝘏', 'I': '𝘐', 'J': '𝘑', 'K': '𝘒', 'L': '𝘓', 'M': '𝘔',
        'N': '𝘕', 'O': '𝘖', 'P': '𝘗', 'Q': '𝘘', 'R': '𝘙', 'S': '𝘚', 'T': '𝘛', 'U': '𝘜', 'V': '𝘝', 'W': '𝘞', 'X': '𝘟', 'Y': '𝘠', 'Z': '𝘡',
        'a': '𝘢', 'b': '𝘣', 'c': '𝘤', 'd': '𝘥', 'e': '𝘦', 'f': '𝘧', 'g': '𝘨', 'h': '𝘩', 'i': '𝘪', 'j': '𝘫', 'k': '𝘬', 'l': '𝘭', 'm': '𝘮',
        'n': '𝘯', 'o': '𝘰', 'p': '𝘱', 'q': '𝘲', 'r': '𝘳', 's': '𝘴', 't': '𝘵', 'u': '𝘶', 'v': '𝘷', 'w': '𝘸', 'x': '𝘹', 'y': '𝘺', 'z': '𝘻',
        // 数字のイタリックは一般的ではないため、ここでは含めていません。
      };
      return str.split('').map(char => italicChars[char] || char).join('');
    },
    toBoldItalicText(str) {
      const boldItalicChars = {
        'A': '𝘼', 'B': '𝘽', 'C': '𝘾', 'D': '𝘿', 'E': '𝙀', 'F': '𝙁', 'G': '𝙂', 'H': '𝙃', 'I': '𝙄', 'J': '𝙅', 'K': '𝙆', 'L': '𝙇', 'M': '𝙈',
        'N': '𝙉', 'O': '𝙊', 'P': '𝙋', 'Q': '𝙌', 'R': '𝙍', 'S': '𝙎', 'T': '𝙏', 'U': '𝙐', 'V': '𝙑', 'W': '𝙒', 'X': '𝙓', 'Y': '𝙔', 'Z': '𝙕',
        'a': '𝙖', 'b': '𝙗', 'c': '𝙘', 'd': '𝙙', 'e': '𝙚', 'f': '𝙛', 'g': '𝙜', 'h': '𝙝', 'i': '𝙞', 'j': '𝙟', 'k': '𝙠', 'l': '𝙡', 'm': '𝙢',
        'n': '𝙣', 'o': '𝙤', 'p': '𝙥', 'q': '𝙦', 'r': '𝙧', 's': '𝙨', 't': '𝙩', 'u': '𝙪', 'v': '𝙫', 'w': '𝙬', 'x': '𝙭', 'y': '𝙮', 'z': '𝙯',
        '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
      };
      return str.split('').map(char => boldItalicChars[char] || char).join('');
    },
    toBlackletterText(str) {
      const blackletterChars = {
        'A': '𝔄', 'B': '𝔅', 'C': 'ℭ', 'D': '𝔇', 'E': '𝔈', 'F': '𝔉', 'G': '𝔊', 'H': 'ℌ', 'I': 'ℑ', 'J': '𝔍', 'K': '𝔎', 'L': '𝔏', 'M': '𝔐',
        'N': '𝔑', 'O': '𝔒', 'P': '𝔓', 'Q': '𝔔', 'R': 'ℜ', 'S': '𝔖', 'T': '𝔗', 'U': '𝔘', 'V': '𝔙', 'W': '𝔚', 'X': '𝔛', 'Y': '𝔜', 'Z': 'ℨ',
        'a': '𝔞', 'b': '𝔟', 'c': '𝔠', 'd': '𝔡', 'e': '𝔢', 'f': '𝔣', 'g': '𝔤', 'h': '𝔥', 'i': '𝔦', 'j': '𝔧', 'k': '𝔨', 'l': '𝔩', 'm': '𝔪',
        'n': '𝔫', 'o': '𝔬', 'p': '𝔭', 'q': '𝔮', 'r': '𝔯', 's': '𝔰', 't': '𝔱', 'u': '𝔲', 'v': '𝔳', 'w': '𝔴', 'x': '𝔵', 'y': '𝔶', 'z': '𝔷'
      };
      return str.split('').map(char => blackletterChars[char] || char).join('');
    },
    toBubbleText(str) {
      const bubbleChars = {
        'A': 'Ⓐ', 'B': 'Ⓑ', 'C': 'Ⓒ', 'D': 'Ⓓ', 'E': 'Ⓔ', 'F': 'Ⓕ', 'G': 'Ⓖ', 'H': 'Ⓗ', 'I': 'Ⓘ', 'J': 'Ⓙ', 'K': 'Ⓚ', 'L': 'Ⓛ', 'M': 'Ⓜ',
        'N': 'Ⓝ', 'O': 'Ⓞ', 'P': 'Ⓟ', 'Q': 'Ⓠ', 'R': 'Ⓡ', 'S': 'Ⓢ', 'T': 'Ⓣ', 'U': 'Ⓤ', 'V': 'Ⓥ', 'W': 'Ⓦ', 'X': 'Ⓧ', 'Y': 'Ⓨ', 'Z': 'Ⓩ',
        'a': 'ⓐ', 'b': 'ⓑ', 'c': 'ⓒ', 'd': 'ⓓ', 'e': 'ⓔ', 'f': 'ⓕ', 'g': 'ⓖ', 'h': 'ⓗ', 'i': 'ⓘ', 'j': 'ⓙ', 'k': 'ⓚ', 'l': 'ⓛ', 'm': 'ⓜ',
        'n': 'ⓝ', 'o': 'ⓞ', 'p': 'ⓟ', 'q': 'ⓠ', 'r': 'ⓡ', 's': 'ⓢ', 't': 'ⓣ', 'u': 'ⓤ', 'v': 'ⓥ', 'w': 'ⓦ', 'x': 'ⓧ', 'y': 'ⓨ', 'z': 'ⓩ',
        '0': '⓪', '1': '①', '2': '②', '3': '③', '4': '④', '5': '⑤', '6': '⑥', '7': '⑦', '8': '⑧', '9': '⑨'
      };
      return str.split('').map(char => bubbleChars[char] || char).join('');
    },
    toEnclosedAlphanumericsText(str) {
      const enclosedAlphanumericsChars = {
        'A': '🄰', 'B': '🄱', 'C': '🄲', 'D': '🄳', 'E': '🄴', 'F': '🄵', 'G': '🄶', 'H': '🄷', 'I': '🄸', 'J': '🄹', 'K': '🄺', 'L': '🄻', 'M': '🄼',
        'N': '🄽', 'O': '🄾', 'P': '🄿', 'Q': '🅀', 'R': '🅁', 'S': '🅂', 'T': '🅃', 'U': '🅄', 'V': '🅅', 'W': '🅆', 'X': '🅇', 'Y': '🅈', 'Z': '🅉',
        // 四角囲み文字は通常、数字には対応していません。
      };
      return str.split('').map(char => enclosedAlphanumericsChars[char] || char).join('');
    },
    toUnderlinedText(str) {
      const underlineCombiningChar = '\u0332';
      return str.split('').map(char => char + underlineCombiningChar).join('');
    },
    toOverlinedText(str) {
      const overlineCombiningChar = '\u0305';
      return str.split('').map(char => char + overlineCombiningChar).join('');
    },
    toStrikethroughText(str) {
      const strikethroughCombiningChar = '\u0336';
      return str.split('').map(char => char + strikethroughCombiningChar).join('');
    },
    toTransparentEnclosedText(str) {
      const transparentEnclosedChars = {
        'A': '🅐', 'B': '🅑', 'C': '🅒', 'D': '🅓', 'E': '🅔', 'F': '🅕', 'G': '🅖', 'H': '🅗', 'I': '🅘', 'J': '🅙', 'K': '🅚', 'L': '🅛', 'M': '🅜',
        'N': '🅝', 'O': '🅞', 'P': '🅟', 'Q': '🅠', 'R': '🅡', 'S': '🅢', 'T': '🅣', 'U': '🅤', 'V': '🅥', 'W': '🅦', 'X': '🅧', 'Y': '🅨', 'Z': '🅩',
        // 透明な四角囲み文字は通常、数字には対応していません。
      };
      return str.split('').map(char => transparentEnclosedChars[char] || char).join('');
    },
    toBlackBackgroundEnclosedAlphabetText(str) {
      const blackBackgroundEnclosedAlphabetChars = {
        'A': '🅰', 'B': '🅱', 'C': '🅲', 'D': '🅳', 'E': '🅴', 'F': '🅵', 'G': '🅶', 'H': '🅷', 'I': '🅸', 'J': '🅹', 'K': '🅺', 'L': '🅻', 'M': '🅼',
        'N': '🅽', 'O': '🅾', 'P': '🅿', 'Q': '🆀', 'R': '🆁', 'S': '🆂', 'T': '🆃', 'U': '🆄', 'V': '🆅', 'W': '🆆', 'X': '🆇', 'Y': '🆈', 'Z': '🆉',
      };
      return str.split('').map(char => blackBackgroundEnclosedAlphabetChars[char] || char).join('');
    },
    toMirrorText(str) {
      const mirrorChars = {
        'a': 'ɐ', 'b': 'q', 'c': 'ɔ', 'd': 'p', 'e': 'ǝ', 'f': 'ɟ', 'g': 'ƃ', 'h': 'ɥ', 'i': 'ı', 'j': 'ɾ', 'k': 'ʞ', 'l': 'l', 'm': 'ɯ',
        'n': 'u', 'o': 'o', 'p': 'd', 'q': 'b', 'r': 'ɹ', 's': 's', 't': 'ʇ', 'u': 'n', 'v': 'ʌ', 'w': 'ʍ', 'x': 'x', 'y': 'ʎ', 'z': 'z',
        'A': '∀', 'B': 'ᗺ', 'C': 'Ɔ', 'D': 'ᗡ', 'E': 'Ǝ', 'F': 'Ⅎ', 'G': 'פ', 'H': 'H', 'I': 'I', 'J': 'ſ', 'K': '丬', 'L': '˥', 'M': 'W',
        'N': 'N', 'O': 'O', 'P': 'Ԁ', 'Q': 'Ό', 'R': 'ᴚ', 'S': 'S', 'T': '┴', 'U': '∩', 'V': 'Λ', 'W': 'M', 'X': 'X', 'Y': '⅄', 'Z': 'Z',
        // 数字やその他の文字は含まれていません。
      };
      return str.split('').map(char => mirrorChars[char] || char).join('');
    },
    toScriptText(str) {
      const scriptChars = {
        'A': '𝒜', 'B': 'ℬ', 'C': '𝒞', 'D': '𝒟', 'E': 'ℰ', 'F': 'ℱ', 'G': '𝒢', 'H': 'ℋ', 'I': 'ℐ', 'J': '𝒥', 'K': '𝒦', 'L': 'ℒ', 'M': 'ℳ',
        'N': '𝒩', 'O': '𝒪', 'P': '𝒫', 'Q': '𝒬', 'R': 'ℛ', 'S': '𝒮', 'T': '𝒯', 'U': '𝒰', 'V': '𝒱', 'W': '𝒲', 'X': '𝒳', 'Y': '𝒴', 'Z': '𝒵',
        'a': '𝒶', 'b': '𝒷', 'c': '𝒸', 'd': '𝒹', 'e': '𝑒', 'f': '𝒻', 'g': '𝑔', 'h': '𝒽', 'i': '𝒾', 'j': '𝒿', 'k': '𝓀', 'l': '𝓁', 'm': '𝓂',
        'n': '𝓃', 'o': '𝑜', 'p': '𝓅', 'q': '𝓆', 'r': '𝓇', 's': '𝓈', 't': '𝓉', 'u': '𝓊', 'v': '𝓋', 'w': '𝓌', 'x': '𝓍', 'y': '𝓎', 'z': '𝓏',
      };
      return str.split('').map(char => scriptChars[char] || char).join('');
    },
    toSuperscriptText(str) {
      const superscriptChars = {
        'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ', 'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ',
        'n': 'ⁿ', 'o': 'ᵒ', 'p': 'ᵖ', 'q': 'ᵠ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ', 'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ',
        // 大文字や数字の小文字上付きは一般的ではないため、ここでは含めていません。
      };
      return str.split('').map(char => superscriptChars[char] || char).join('');
    },
    toUpsideDownText(str) {
      const upsideDownChars = {
        'a': 'ɐ', 'b': 'q', 'c': 'ɔ', 'd': 'p', 'e': 'ǝ', 'f': 'ɟ', 'g': 'ƃ', 'h': 'ɥ', 'i': 'ᴉ', 'j': 'ɾ', 'k': 'ʞ', 'l': 'l', 'm': 'ɯ',
        'n': 'u', 'o': 'o', 'p': 'd', 'q': 'b', 'r': 'ɹ', 's': 's', 't': 'ʇ', 'u': 'n', 'v': 'ʌ', 'w': 'ʍ', 'x': 'x', 'y': 'ʎ', 'z': 'z',
        'A': '∀', 'B': '𐐒', 'C': 'Ɔ', 'D': 'ᗡ', 'E': 'Ǝ', 'F': 'Ⅎ', 'G': '⅁', 'H': 'H', 'I': 'I', 'J': 'ſ', 'K': 'ᐴ', 'L': '˥', 'M': 'W',
        'N': 'N', 'O': 'O', 'P': 'Ԁ', 'Q': 'Ὁ', 'R': 'ᴚ', 'S': 'S', 'T': '⊥', 'U': '∩', 'V': 'Λ', 'W': 'M', 'X': 'X', 'Y': '⅄', 'Z': 'Z',
        '1': 'Ɩ', '2': 'ᄅ', '3': 'Ɛ', '4': 'ㄣ', '5': 'ϛ', '6': '9', '7': 'ㄥ', '8': '8', '9': '6', '0': '0',
        '.': '˙', ',': '\'', '?': '¿', '!': '¡', '"': ',,', "'": ',', '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{',
        '<': '>', '>': '<', '&': '⅋', '_': '‾'
      };
      return str.split('').map(char => upsideDownChars[char] || char).join('').split('').reverse().join('');
    },
  }
};
</script>
