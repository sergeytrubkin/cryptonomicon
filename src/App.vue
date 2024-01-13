<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { subscribeTicker, unsubscribeTicker } from './api';
import AddTickerVue from './components/AddTicker.vue';
import AddGraphVue from './components/AddGraph.vue';

const tickersCountOnPage = 6;

const selectedTicker = ref(null);

const graph = ref(null);

const tickers = ref([]);
const filter = ref('');

const page = ref(1);
const isError = ref(false);
let id = 0;

const formatPrice = (price) => {
  if (!price) {
    return '-';
  }

  return price > 1 ? price.toFixed(2) : price.toPrecision(2);
};

const updatePrice = async (name, price, isEmpty = false) => {
  const currentTicker = tickers.value.filter((ticker) => ticker.name === name)[0];

  if (isEmpty === true) {
    currentTicker.isEmpty = true;
    return;
  }

  currentTicker.price = price;

  if (selectedTicker.value !== null && name === selectedTicker.value.name) {
    graph.value.push(price);
  }

  currentTicker.isEmpty = false;
};

const addTicker = async (ticker) => {
  if (tickers.value.filter((item) => item.name === ticker).length > 0) {
    isError.value = true;
    return;
  }
  isError.value = false;

  const newTicker = {
    name: ticker,
    price: '-',
    id: id++,
    isEmpty: false
  };
  tickers.value = [...tickers.value, newTicker];
  filter.value = '';

  subscribeTicker(newTicker.name, (newPrice, isEmpty) =>
    updatePrice(newTicker.name, formatPrice(newPrice), isEmpty)
  );
};

const removeTicker = (ticker) => {
  tickers.value = tickers.value.filter((item) => item !== ticker);

  unsubscribeTicker(ticker.name);

  if (ticker === selectedTicker.value) {
    selectedTicker.value = null;
  }
};

const select = async (ticker) => {
  selectedTicker.value = ticker;
};

const unselect = () => {
  selectedTicker.value = null;
}

// a computed refs
const startIndex = computed(() => (page.value - 1) * tickersCountOnPage);

const endIndex = computed(() => page.value * tickersCountOnPage);

const filteredTickers = computed(() => {
  return tickers.value.filter((ticker) =>
    ticker.name.toLowerCase().includes(filter.value.trim().toLocaleLowerCase())
  );
});

const paginatedTickers = computed(() => {
  return filteredTickers.value.slice(startIndex.value, endIndex.value);
});

const hasNextPage = computed(() => {
  return filteredTickers.value.length > endIndex.value;
});

const pageOptionsValue = computed(() => {
  return {
    filter: filter.value,
    page: page.value
  };
});

onMounted(async () => {
  tickers.value = JSON.parse(window.localStorage.getItem('tickers')) || [];

  if (tickers.value.length > 0) {
    tickers.value.forEach((ticker) => {
      subscribeTicker(ticker.name, (newPrice, isEmpty) =>
        updatePrice(ticker.name, formatPrice(newPrice), isEmpty)
      );
    });
  }

  const urlParams = Object.fromEntries(new URL(window.location).searchParams.entries());

  if (urlParams.filter) filter.value = urlParams.filter;
  if (urlParams.page) page.value = urlParams.page;
});

// watchers
watch(tickers, () => {
  window.localStorage.setItem('tickers', JSON.stringify(tickers.value));
});

watch(selectedTicker, () => {
  graph.value = [];
});

watch(filter, () => {
  page.value = 1;
});

watch(pageOptionsValue, (value) => {
  window.history.pushState(
    null,
    null,
    `${window.location.origin}?filter=${value.filter}&page=${value.page}`
  );
});

watch(paginatedTickers, () => {
  if (paginatedTickers.value.length === 0 && page.value > 1) {
    page.value -= 1;
  }
});
</script>

<template>
  <div class="container mx-auto flex flex-col items-center bg-gray-100 p-4">
    <!-- <div class="fixed w-100 h-100 opacity-80 bg-purple-800 inset-0 z-50 flex items-center justify-center">
    <svg class="animate-spin -ml-1 mr-3 h-12 w-12 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  </div> -->
    <div class="container">
      <add-ticker-vue @addTicker="addTicker" :error="isError" />
      <section>
        <div>
          <hr class="w-full border-t border-gray-600 my-4" />
          <button
            v-if="page > 1"
            @click="page--"
            class="my-4 mx-2 inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-full text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Назад
          </button>
          <button
            v-if="hasNextPage"
            @click="page++"
            class="my-4 mx-2 inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-full text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Вперёд
          </button>
          <br />
          Фильтр:
          <input v-model="filter" type="text" />
        </div>
      </section>

      <template v-if="paginatedTickers.length">
        <hr class="w-full border-t border-gray-600 my-4" />
        <dl class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div
            v-for="ticker in paginatedTickers"
            :key="ticker.id"
            @click="ticker.isEmpty ? '' : select(ticker)"
            :class="[
              selectedTicker === ticker ? 'border-4' : '',
              ticker.isEmpty === true ? 'bg-red-100' : 'bg-white'
            ]"
            class="overflow-hidden shadow rounded-lg border-purple-800 border-solid cursor-pointer"
          >
            <div class="px-4 py-5 sm:p-6 text-center">
              <dt class="text-sm font-medium text-gray-500 truncate">{{ ticker.name }} - USD</dt>
              <dd class="mt-1 text-3xl font-semibold text-gray-900">{{ ticker.price }}</dd>
            </div>
            <div class="w-full border-t border-gray-200"></div>
            <button
              @click.stop="removeTicker(ticker)"
              class="flex items-center justify-center font-medium w-full bg-gray-100 px-4 py-4 sm:px-6 text-md text-gray-500 hover:text-gray-600 hover:bg-gray-200 transition-all focus:outline-none"
            >
              <svg
                class="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="#718096"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                ></path></svg
              >Удалить
            </button>
          </div>
        </dl>
      </template>

      <add-graph-vue 
        v-if="selectedTicker" 
        :graphValues="graph" 
        :tickerName="selectedTicker.name"
        @unselectedTicker="unselect" />
    </div>
  </div>
</template>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
