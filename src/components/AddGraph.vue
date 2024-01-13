<script setup>
import { computed, ref, onBeforeUnmount, watch, onMounted } from 'vue';
import ButtonClose from './ButtonClose.vue';

const graph = ref([])
const minHeightBar = 5;
let barItemWidth = 0;
const maxCountBarsOfGraph = ref(5);
const barWrapper = ref(null);
const barItem = ref([]);

const props = defineProps({
	graphValues: {
		type: Object,
    required: true
	},
	tickerName: {
		type: String,
    required: true
	}
});

const emits = defineEmits(['unselectedTicker']);

const normalizedGraph = computed(() => {
  const minValue = Math.min(...graph.value);
  const maxValue = Math.max(...graph.value);

  if (maxValue === minValue) {
    return graph.value.map(() => 50);
  }

  return graph.value.map((value) => {
    const result = 5 + ((value - minValue) / (maxValue - minValue)) * 95;
    return isNaN(result) ? minHeightBar : result;
  });
});

const removeSelectedTicker = () => {
	emits('unselectedTicker', props.tickerName);
};

const getMaxNumberOfGraphValues = () => {
  if (graph.value.length > maxCountBarsOfGraph.value) {
    graph.value = graph.value.slice(
      graph.value.length - maxCountBarsOfGraph.value,
      graph.value.length
    );
  }
};

const calculateMaxCountBarsOfGraph = () => {
  maxCountBarsOfGraph.value = Math.ceil(barWrapper.value.offsetWidth / barItemWidth);
};

const onResizeGraph = () => {
	if (barWrapper.value && barItemWidth !== 0) {
		calculateMaxCountBarsOfGraph();
    getMaxNumberOfGraphValues();
  }
}

onMounted(() => {
	window.addEventListener('resize', onResizeGraph);
})

onBeforeUnmount(() => {
	window.removeEventListener('resize', onResizeGraph);
})

watch(props, () => {
	graph.value = props.graphValues;
	if (barItemWidth === 0 && barItem.value.at(0)) {
		barItemWidth = barItem.value.at(0).offsetWidth;
    calculateMaxCountBarsOfGraph();
	}
	getMaxNumberOfGraphValues();
})
</script>

<template>
  <hr class="w-full border-t border-gray-600 my-4" />
  <section class="relative">
    <h3 class="text-lg leading-6 font-medium text-gray-900 my-8">
      {{ tickerName }} - USD
    </h3>
    <div class="flex items-end border-gray-600 border-b border-l h-64" ref="barWrapper">
      <div
        v-for="bar in normalizedGraph"
        :key="bar.id"
        :style="{ height: bar + '%' }"
        ref="barItem"
        class="bg-purple-800 border w-10"
      ></div>
    </div>

		<button-close @click="removeSelectedTicker" />
  </section>
</template>
