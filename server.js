const rb = require('restbus');
const app = require('express')();
const redis = require('redis');
const compression = require('compression');

const redisClient = redis.createClient();

const getKey = (key) => new Promise((resolve, reject) => {
	redisClient.get(key, (error, result) => {
		if (!error && result) resolve(result);
		else reject(error);
	});
});

const setKey = (key, val, expiry = 5) => {
	let str = ''
	if (typeof val === 'string') str = val;
	else str = JSON.stringify(val);
	redisClient.set(key, str, 'EX', expiry);
}
const corsMiddleware = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
	next();
}

app.use(corsMiddleware);
app.use(compression());

app.use((req, res, next) => {
	getKey(req.url)
	.then((val) => {
		console.info('found in cache');
		res.json(JSON.parse(val));
	})
	.catch((error) => {
		console.info('Not found in cache');
		const json = res.json;
	    res.json = function(...args) {
				if (typeof args[1] === 'object' && args[1].length) {
					 args[1] = args[1].map(item => {
							return {
								id: item.id,
								routeId: item.routeId,
								secsSinceReport: item.secsSinceReport,
								lat: item.lat,
								lon: item.lon,
							}
					 })
				}
	    	setKey(req.url, args[1]);
	        json.call(this, ...args);
	    };
		next();
	})
});

app.use('/', rb.middleware());

app.listen(3000);

