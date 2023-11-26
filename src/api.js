const API_KEY = '907d1321d5f531cce4f7ef91dfc0a9111f4804111b6820ecfe42f044cf454051';
const AGGREGATE_INDEX = {
	SUCCESS: '5',
	ERROR: '500',
};

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

const subscribeTickerToWS = (ticker, toSymbol) => {
	sendMessageToWS({
		"action": "SubAdd",
		"subs": [`5~CCCAGG~${ticker}~${toSymbol}`]
	})
}

const unsubscribeTickerFromWS = (ticker, toSymbol) => {
	sendMessageToWS({
		"action": "SubRemove",
		"subs": [`5~CCCAGG~${ticker}~${toSymbol}`]
	});
}

const subscribeTicker = (tickerName, cb) => {
	const subscribers = tickersHandlers.get(tickerName) || [];
	tickersHandlers.set(tickerName, [...subscribers, cb]);
	subscribeTickerToWS(tickerName, 'USD');
}

const unsubscribeTicker = (tickerName) => {
	tickersHandlers.delete(tickerName);
	unsubscribeTickerFromWS(tickerName, 'USD');
	unsubscribeTickerFromWS(tickerName, 'BTC');
}

socket.addEventListener('message', (event) => {
	const {TYPE: type, FROMSYMBOL: tickerName, PRICE: newPrice, PARAMETER: parameter, MESSAGE: message} = JSON.parse(event.data);

	if (type === AGGREGATE_INDEX.SUCCESS) {
		const handlers = tickersHandlers.get(tickerName) || [];
		handlers.forEach((handler) => handler(newPrice));
		return;
	}

	if (type === AGGREGATE_INDEX.ERROR && message === 'INVALID_SUB') {
		const parameterValues = parameter.split('~');
		const tickerName = parameterValues.at(-2);
		const secondTickerName = parameterValues.at(-1);

		switch (secondTickerName) {
			case 'USD':
				unsubscribeTickerFromWS(tickerName, 'USD');
				subscribeTickerToWS(tickerName, 'BTC');
				break;
			case 'BTC':
				unsubscribeTickerFromWS(tickerName, 'BTC');
				const handlers = tickersHandlers.get(tickerName) || [];
				handlers.forEach((handler) => handler(newPrice, true));
				break;
		}
	}

})
export {subscribeTicker, getCoins, unsubscribeTicker};