import '@mdi/font/css/materialdesignicons.css'; // 追加
import { createVuetify } from 'vuetify';
import { mdi } from '@mdi/js'; // この行を変更

export default createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases: {
      mdi: 'mdi',
    },
    sets: {
      mdi, // この行を変更
    },
  },
});
