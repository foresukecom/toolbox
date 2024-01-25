<template>
  <div class="container mx-auto px-4">
    <h1 class="text-2xl mb-4">Text Converter</h1>
    <div class="grid grid-cols-3 gap-4">
      <div class="col-span-2">
        <label for="inputText" class="block text-sm font-medium text-gray-700">Input Text</label>
        <textarea id="inputText" v-model="inputText" @input="convertText"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"></textarea>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-4 mt-4">
      <div class="col-span-2 relative">
        <label for="boldText" class="block text-sm font-medium text-gray-700">太字</label>
        <textarea id="boldText" readonly v-model="boldText"
          class="mt-1 block w-full rounded-md bg-gray-100 border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"></textarea>
        <CopyButton :textToCopy="boldText" class="absolute top-2 right-2" />
      </div>
    </div>
    <div class="grid grid-cols-3 gap-4 mt-4">
      <div class="col-span-2 relative">
        <label for="italicText" class="block text-sm font-medium text-gray-700">イタリック</label>
        <textarea id="italicText" readonly v-model="italicText"
          class="mt-1 block w-full rounded-md bg-gray-100 border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"></textarea>
        <CopyButton :textToCopy="italicText" class="absolute top-2 right-2" />
      </div>
    </div>
    <div class="grid grid-cols-3 gap-4 mt-4">
      <div class="col-span-2 relative">
        <label for="blackletterText" class="block text-sm font-medium text-gray-700">古風な文字</label>
        <textarea id="blackletterText" readonly v-model="blackletterText"
          class="mt-1 block w-full rounded-md bg-gray-100 border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"></textarea>
        <CopyButton :textToCopy="blackletterText" class="absolute top-2 right-2" />
      </div>
    </div>
    <div class="grid grid-cols-3 gap-4 mt-4">
      <div class="col-span-2 relative">
        <label for="bubbleText" class="block text-sm font-medium text-gray-700">バブル文字</label>
        <textarea id="bubbleText" readonly v-model="bubbleText"
          class="mt-1 block w-full rounded-md bg-gray-100 border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"></textarea>
        <CopyButton :textToCopy="bubbleText" class="absolute top-2 right-2" />
      </div>
    </div>
    <div class="grid grid-cols-3 gap-4 mt-4">
      <div class="col-span-2 relative">
        <label for="enclosedAlphanumericsText" class="block text-sm font-medium text-gray-700">四角囲み文字</label>
        <textarea id="enclosedAlphanumericsText" readonly v-model="enclosedAlphanumericsText"
          class="mt-1 block w-full rounded-md bg-gray-100 border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"></textarea>
        <CopyButton :textToCopy="enclosedAlphanumericsText" class="absolute top-2 right-2" />
      </div>
    </div>
    <div class="grid grid-cols-3 gap-4 mt-4">
      <div class="col-span-2 relative">
        <label for="underlinedText" class="block text-sm font-medium text-gray-700">下線付き</label>
        <textarea id="underlinedText" readonly v-model="underlinedText"
          class="mt-1 block w-full rounded-md bg-gray-100 border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"></textarea>
        <CopyButton :textToCopy="underlinedText" class="absolute top-2 right-2" />
      </div>
    </div>
    <div class="grid grid-cols-3 gap-4 mt-4">
      <div class="col-span-2 relative">
        <label for="overlinedText" class="block text-sm font-medium text-gray-700">上線付き</label>
        <textarea id="overlinedText" readonly v-model="overlinedText"
          class="mt-1 block w-full rounded-md bg-gray-100 border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"></textarea>
        <CopyButton :textToCopy="overlinedText" class="absolute top-2 right-2" />
      </div>
    </div>
    <div class="grid grid-cols-3 gap-4 mt-4">
      <div class="col-span-2 relative">
        <label for="strikethroughText" class="block text-sm font-medium text-gray-700">打ち消し線付き</label>
        <textarea id="strikethroughText" readonly v-model="strikethroughText"
          class="mt-1 block w-full rounded-md bg-gray-100 border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"></textarea>
        <CopyButton :textToCopy="strikethroughText" class="absolute top-2 right-2" />
      </div>
    </div>
    <div class="grid grid-cols-3 gap-4 mt-4">
      <div class="col-span-2 relative">
        <label for="transparentEnclosedText" class="block text-sm font-medium text-gray-700">囲み文字</label>
        <textarea id="transparentEnclosedText" readonly v-model="transparentEnclosedText"
          class="mt-1 block w-full rounded-md bg-gray-100 border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"></textarea>
        <CopyButton :textToCopy="transparentEnclosedText" class="absolute top-2 right-2" />
      </div>
    </div>
    <div class="grid grid-cols-3 gap-4 mt-4">
      <div class="col-span-2 relative">
        <label for="blackSquareEnclosedText" class="block text-sm font-medium text-gray-700">黒背景四角囲み文字</label>
        <textarea id="blackSquareEnclosedText" readonly v-model="blackSquareEnclosedText"
          class="mt-1 block w-full rounded-md bg-gray-100 border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"></textarea>
        <CopyButton :textToCopy="blackSquareEnclosedText" class="absolute top-2 right-2" />
      </div>
    </div>
    <div class="grid grid-cols-3 gap-4 mt-4">
      <div class="col-span-2 relative">
        <label for="mirrorText" class="block text-sm font-medium text-gray-700">鏡文字</label>
        <textarea id="mirrorText" readonly v-model="mirrorText"
          class="mt-1 block w-full rounded-md bg-gray-100 border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"></textarea>
        <CopyButton :textToCopy="mirrorText" class="absolute top-2 right-2" />
      </div>
    </div>

  </div>
</template>


<script>
import CopyButton from '@/components/CopyButton.vue';
export default {
  components: {
    CopyButton,
  },
  data() {
    return {
      inputText: '',
      boldText: '',
      italicText: '',
      blackletterText: '',
      bubbleText: '',
      enclosedAlphanumericsText: '',
      underlinedText: '',
      overlinedText: '',
      strikethroughText: '',
      transparentEnclosedText: '',
      mirrorText: '',
    };
  },
  methods: {
    convertText() {
      this.boldText = this.toBoldText(this.inputText);
      this.italicText = this.toItalicText(this.inputText);
      this.blackletterText = this.toBlackletterText(this.inputText);
      this.bubbleText = this.toBubbleText(this.inputText);
      this.enclosedAlphanumericsText = this.toEnclosedAlphanumericsText(this.inputText);
      this.underlinedText = this.toUnderlinedText(this.inputText);
      this.overlinedText = this.toOverlinedText(this.inputText);
      this.strikethroughText = this.toStrikethroughText(this.inputText);
      this.transparentEnclosedText = this.toTransparentEnclosedText(this.inputText);
      this.blackSquareEnclosedText = this.toBlackBackgroundEnclosedAlphabetText(this.inputText);
      this.mirrorText = this.toMirrorText(this.inputText);
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
  }
};
</script>

