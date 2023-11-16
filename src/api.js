const API_KEY = '907d1321d5f531cce4f7ef91dfc0a9111f4804111b6820ecfe42f044cf454051';
const AGGREGATE_INDEX = '5';

const tickersHandlers = new Map();
const socket = new WebSocket(`wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`)

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
	}, {once: true});
}

const subscribeTickerToWS = (ticker) => {
	sendMessageToWS({
		"action": "SubAdd",
		"subs": [`5~CCCAGG~${ticker}~USD`]
	})
}

const unsubscribeTickerFromWS = (ticker) => {
	sendMessageToWS({
		"action": "SubRemove",
		"subs": [`5~CCCAGG~${ticker}~USD`]
	});
}

const subscribeTicker = (tickerName, cb) => {
	const subscribers = tickersHandlers.get(tickerName) || [];
	tickersHandlers.set(tickerName, [...subscribers, cb]);
	subscribeTickerToWS(tickerName);
}

const unsubscribeTicker = (tickerName) => {
	tickersHandlers.delete(tickerName);
	unsubscribeTickerFromWS(tickerName);
}

socket.addEventListener('message', (message) => {
	const {TYPE: type, FROMSYMBOL: tickerName, PRICE: newPrice} = JSON.parse(message.data);

	if (type !== AGGREGATE_INDEX) {
		return;
	}

	const handlers = tickersHandlers.get(tickerName) || [];
	handlers.forEach((handler) => handler(newPrice));
})
export {subscribeTicker, getCoins, unsubscribeTicker};