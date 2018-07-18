'use strict';
const unirest = require('unirest');
const Twit = require('twit');
const events = require('events');


// inspired from @KeithCollins botomoter twitbot
// https://github.com/keithcollins/node-botometer

const StockerBot = function(config) {

	var T = new Twit({
		consumer_key: 	 	 config.CONSUMER_KEY,
		consumer_secret: 	 config.CONSUMER_SECRET,
		access_token: 	 	 config.ACCESS_TOKEN,
		access_token_secret: config.ACCESS_TOKEN_SECRET,
		app_only_auth: 		 config.APP_ONLY_AUTH,
		timeout_ms:          config.TIMEOUT_MS

	});

	// make self reference the StockerBot instance 
	var self = this

	const call_delay = config.call_delay || 0
	const logger = config.logger || true
	const logger_path = config.logger_path

	var eventEmitter = new events.EventEmitter()
	this.newTweet = eventEmitter
	this.lastTweet = {}


	const log = function(msg) {
		if (logger) {
			if (logger_path) {
				fs.writefile(logger_path, msg, function(err) {
					if (err) console.log(err)
					// otherwise do nothing
					});
			} else{
				console.log(msg);
			}
		}
	};


	this.analyzeTweet = function analyzeTweet(screen_name, tweet) {

		if (tweet.id > (this.lastTweet[screen_name] || 0)) {
			self.lastTweet[screen_name] = tweet.id;

			//emit the event that a new tweet was analyzed
			tweet.screen_name = screen_name;
			self.emit('newTweet', screen_name, tweet);

		}
	};

	this.pollSpawner = function pollSpawner(screen_names, interval) {
		setInterval(function() {
			var screen_name
			for (var i=0; i <screen_names.length; i++) {
				screen_name = screen_names[i];
				// process.stdout.write('polling worker for ')
				// process.stdout.write(screen_name)
				// process.stdout.write(' ......')
				self.pollWorker(screen_name);
				// process.stdout.write('done!\n')
			}
			// new line
			// console.log()
		}, interval);
	};

	this.pollWorker = function pollWorker(screen_name) {
		const path = 'statuses/user_timeline'

		const options = {
			'screen_name': 		screen_name,
			// 'trim_user':   		'true',
			'exclude_replies': 	'true'
		};

		if (self.lastTweet[screen_name]) {
			options.since_id = self.lastTweet[screen_name]
		}



		T.get(path, options, function(err, data, response) {
			if (err) {
				log('!!!!!!!!!! --> ', screen_name, err)
			}
			else {
				if (data.length) {
					// analyze and store the tweet
					self.analyzeTweet(screen_name, data[0])

					//update last tweet
					self.lastTweet[screen_name] = data[0].id

				}
			}
		});
	};


	this.searchSymbol = function searchSymbol(symbol, count) {
		/*
		 *	if count is set to -1 and the since date parameter is 
		 *	provided, this API will accumulate the tweets in batches ~ if very
		 *	large, it can take a while 
		 * 
		 *	Keep in mind that the search index has a 7-day limit.
		 *
		 */
		const path = 'search/tweets';
		if (symbol.charAt(0) != '$') { symbol = '$' + symbol; }
		symbol = symbol.trim();
		console.log('searching for symbol: ', symbol);
		const options = {
			'q' : symbol,
			'count' : count
		};
		var tweets;
		T.get(path, options, function(err, data, response) {
			if (err) {
				log('\x1b[31m', symbol, '\x1b[0m', err);
			}
			else {
				tweets = data.statuses;
				self.emit('symbolTweets', symbol, tweets);
			}
		});
	}
}

// set up the event emmiter and start it
StockerBot.prototype = new events.EventEmitter;

StockerBot.prototype.pollAccounts = function(screen_names, interval) {
	console.log('Polling accounts ...');
	this.pollSpawner(screen_names, interval);
};

StockerBot.prototype.searchSymbol = function(symbol, count) {
	console.log('Searching Twitter for symbol ', symbol, '...');
	this.searchSymbol(symbol, count);
};

// make available to import from other modules
module.exports = StockerBot;

