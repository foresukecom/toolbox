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
    };
  },
  methods: {
    convertText() {
      this.boldText = this.toBoldText(this.inputText);
      this.italicText = this.toItalicText(this.inputText);
      this.blackletterText = this.toBlackletterText(this.inputText)
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
  }
};
</script>

