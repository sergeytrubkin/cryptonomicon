const API_KEY = '1b48dde3374cb66b9a772f65ba4b5b1a11caa1bea6925e23de1f45f398f60019';

const tickersHandlers = new Map();

const getCoins = async () => {
	const response = await fetch(
		`https://min-api.cryptocompare.com/data/all/coinlist?summary=true&api_key=${API_KEY}`
	);
	const result = await response.json();
	return result.Data;
};

const loadTickers = () => {
	if (!tickersHandlers.size) return;

  fetch(
    `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${Array.from(tickersHandlers.keys()).join(',')}&tsyms=USD&api_key=${API_KEY}`
  ).then((response) => response.json())
	.then((rawData) => {
		const updatedPrice = Object.fromEntries(Object.entries(rawData).map(([key, value]) => [key, value.USD]));
		Object.entries(updatedPrice).map(([name, price]) => {
			const handlers = tickersHandlers.get(name) || [];
			handlers.forEach((handler) => handler(price));
		});
	});
};

const subscribeTicker = (tickerName, cb) => {
	const subscribers = tickersHandlers.get(tickerName) || [];
	tickersHandlers.set(tickerName, [...subscribers ,cb]);
}

const unsubscribeTicker = (tickerName) => {
	console.log(tickerName);
	tickersHandlers.delete(tickerName);
}

setInterval(loadTickers, 5000);

export { subscribeTicker, getCoins, unsubscribeTicker };