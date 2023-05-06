<template>
  <div class="japanese-era">
    <div class="card-container">
      <div class="gregorian">
        <p>{{ gregorianDate }}</p>
      </div>
      <div v-for="(era, index) in eras" :key="index" class="era">
        <p>{{ era.date }}</p>
      </div>
    </div>
  </div>
</template>


<script>
import { ref, onMounted, onUnmounted } from 'vue';
import moment from 'moment';
import { getJapaneseEras, formatJapaneseEra } from '../utilities/japaneseEra';

export default {
  setup() {
    const currentTime = ref(moment());
    const eras = ref([]);
    const gregorianDate = ref('');

    async function updateDateTime() {
      currentTime.value = moment();
      gregorianDate.value = currentTime.value.format('YYYY年M月D日 H:mm:ss');
      const japaneseEras = await getJapaneseEras();
      eras.value = japaneseEras.map((era) => ({
        ...era,
        date: formatJapaneseEra(era, currentTime.value),
      }));
    }

    let timer;

    onMounted(() => {
      timer = setInterval(updateDateTime, 1000);
    });

    onUnmounted(() => {
      clearInterval(timer);
    });

    return {
      eras,
      gregorianDate,
    };
  },
};
</script>

<style scoped>
.japanese-era {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.card-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.gregorian,
.era {
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 1rem;
  margin: 1rem;
  width: 100%;
  text-align: center;
}


</style>
