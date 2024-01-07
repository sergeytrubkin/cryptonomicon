const API_KEY = '907d1321d5f531cce4f7ef91dfc0a9111f4804111b6820ecfe42f044cf454051';
const AGGREGATE_INDEXES = {
	SUCCESS: '5',
	ERROR: '500',
};
const TICKER_NAMES = {
	MAIN: 'USD',
	BTC: 'BTC',
}
const tickersHandlers = new Map();
const tickersConnectedToBtc = new Map();
const socket = new WebSocket(`wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`)
const myWorker = new SharedWorker("./src/worker.js");
let btcToUsdPrice;
let isBtcToUsdConnected = false;

const getCoins = async () => {
	const response = await fetch(
		`https://min-api.cryptocompare.com/data/all/coinlist?summary=true&api_key=${API_KEY}`
	);
	const result = await response.json();
	return result.Data;
};

const sendMessageToWS = (message) => {
	const stringifiedMessage = JSON.stringify(message);
	if (socket.readyState === socket.OPEN) {
		socket.send(stringifiedMessage);
		return;
	}
	socket.addEventListener('open', () => {
		socket.send(stringifiedMessage);
	}, { once: true });
}

const subscribeTickerToWS = (tickerFrom, tickerTo = TICKER_NAMES.MAIN) => {
	sendMessageToWS({
		"action": "SubAdd",
		"subs": [`5~CCCAGG~${tickerFrom}~${tickerTo}`]
	})
}

const unsubscribeTickerFromWS = (tickerFrom, tickerTo = TICKER_NAMES.MAIN) => {
	sendMessageToWS({
		"action": "SubRemove",
		"subs": [`5~CCCAGG~${tickerFrom}~${tickerTo}`]
	});
}

const subscribeTicker = (tickerName, cb) => {
	const subscribers = tickersHandlers.get(tickerName) || [];
	tickersHandlers.set(tickerName, [...subscribers, cb]);
	subscribeTickerToWS(tickerName, 'USD');
}

const unsubscribeTicker = (tickerName) => {
	tickersHandlers.delete(tickerName);

	if (tickersConnectedToBtc.has(tickerName)) {
		tickersConnectedToBtc.delete(tickerName);
		if (tickersConnectedToBtc.size === 0 && !tickersHandlers.has(TICKER_NAMES.BTC)) {
			unsubscribeTickerFromWS(TICKER_NAMES.BTC, TICKER_NAMES.MAIN);
			unsubscribeTickerFromWS(tickerName, TICKER_NAMES.BTC);
		}
	} else {
		unsubscribeTickerFromWS(tickerName);
	}
}

socket.addEventListener('message', (event) => {
	const {
		TYPE: type,
		FROMSYMBOL: tickerNameFrom,
		TOSYMBOL: tickerNameTo,
		PRICE: newPrice,
		PARAMETER: parameter,
		MESSAGE: message } = JSON.parse(event.data);
	const handlers = tickersHandlers.get(tickerNameFrom) || [];

	if (type === AGGREGATE_INDEXES.SUCCESS) {
		const isEmptyPrice = false;
		switch (tickerNameTo) {
			case TICKER_NAMES.MAIN: {
				myWorker.port.postMessage({tickerNameFrom, newPrice, isEmptyPrice});
				handlers.forEach((handler) => handler(newPrice, isEmptyPrice));
				if (tickerNameFrom === TICKER_NAMES.BTC) btcToUsdPrice = newPrice;
				break;
			}
			case TICKER_NAMES.BTC: {
				const currentPrice = newPrice * btcToUsdPrice;
				handlers.forEach((handler) => handler(currentPrice, isEmptyPrice));
				break;
			}
		}
	}

	if (type === AGGREGATE_INDEXES.ERROR && message === 'INVALID_SUB') {
		const tickerNameFrom = parameter.split('~').at(-2);
		const tickerNameTo = parameter.split('~').at(-1);

		if (tickerNameTo === TICKER_NAMES.MAIN) {
			if (!isBtcToUsdConnected && !tickersHandlers.has(TICKER_NAMES.BTC)) {
				subscribeTickerToWS(TICKER_NAMES.BTC, TICKER_NAMES.MAIN);
			}
			unsubscribeTickerFromWS(tickerNameFrom);
			subscribeTickerToWS(tickerNameFrom, TICKER_NAMES.BTC);
			tickersConnectedToBtc.set(tickerNameFrom);
		} else {
			unsubscribeTickerFromWS(tickerNameFrom, TICKER_NAMES.BTC);
			const handlers = tickersHandlers.get(tickerNameFrom) || [];
			handlers.forEach((handler) => handler(newPrice, true));

			tickersConnectedToBtc.delete(tickerNameFrom);
			if (tickersConnectedToBtc.size === 0 && !tickersHandlers.has(TICKER_NAMES.BTC)) {
				unsubscribeTickerFromWS(TICKER_NAMES.BTC, TICKER_NAMES.MAIN);
			}
		}
	}
})

myWorker.port.onmessage = function (event) {
	console.log(JSON.parse(event.data));
	const { tickerNameFrom, newPrice, isEmptyPrice } = JSON.parse(event.data);
	const handlers = tickersHandlers.get(tickerNameFrom) || [];
	handlers.forEach((handler) => handler(newPrice, isEmptyPrice));
};

export { subscribeTicker, getCoins, unsubscribeTicker };