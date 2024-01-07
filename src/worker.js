const ports = [];
self.onconnect = (e) => {
	const port = e.ports[0];
	ports.push(port);
	
	if (ports.length > 1) {
		port.onmessage = (event) => {	
			ports.forEach((port) => {
				port.postMessage(JSON.stringify(event.data));
			});
		};
	}

	port.start();
};
