<script setup>
import { onMounted, watch, ref, nextTick } from 'vue';
import { getCoins } from '../api';
import AddButton from './AddButton.vue';

const props = defineProps({
  error: {
    type: Boolean,
    default: false
  }
});

const emits = defineEmits({
  addTicker: {
    type: String
  }
});

const tickerPlaceholder = 'Введите тикер';
const tickerName = ref('');
const coins = ref([]);
const isDisabled = ref(true);
const isError = ref(props.error);
let coinsList = [];

const add = async () => {
  emits('addTicker', tickerName.value.toUpperCase());
  await nextTick().then(() => {
    if (!props.error) {
      tickerName.value = '';
    }
    isError.value = props.error;
  });
};

const inputCoint = (coinName) => {
  tickerName.value = coinName;
};

onMounted(async () => {
  coinsList = await getCoins();
});

watch(tickerName, () => {
  if (tickerName.value.length > 0) {
    isDisabled.value = false;
    coins.value = Object.entries(coinsList)
      .filter((item) => item[1].FullName.toLowerCase().search(tickerName.value.toLowerCase()) > -1)
      .slice(0, 4);
  } else {
    isDisabled.value = true;
    coins.value = [];
  }
  isError.value = false;
});
</script>

<template>
  <section>
    <div class="flex">
      <div class="max-w-xs">
        <label for="wallet" class="block text-sm font-medium text-gray-700">Тикер</label>
        <div class="mt-1 relative rounded-md shadow-md">
          <input
            v-model="tickerName"
            @keydown.enter="addTicker"
            :placeholder="tickerPlaceholder"
            type="text"
            name="wallet"
            id="wallet"
            class="block w-full pr-10 border-gray-300 text-gray-900 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
          />
        </div>
        <div v-if="coins.length" class="flex bg-white shadow-md p-1 rounded-md flex-wrap">
          <span
            v-for="(coin, index) in coins"
            :key="index"
            @click="inputCoint(coin[1].Symbol)"
            class="inline-flex items-center px-2 m-1 rounded-md text-xs font-medium bg-gray-300 text-gray-800 cursor-pointer"
          >
            {{ coin[1].Symbol }}
          </span>
        </div>
        <div v-if="isError" class="text-sm text-red-600">Такой тикер уже добавлен</div>
      </div>
    </div>
    <add-button @click="add" :disabled="isDisabled" />
  </section>
</template>
