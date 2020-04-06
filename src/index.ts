import fs from 'fs';
import _ from 'lodash';
import StockerBot, { StockerBotConfig, Stock, Event } from './StockerBot';
import * as config from '../config.json';
import admin from 'firebase-admin';
import pino from 'pino';

/*
 *
 *	Declare Global vars
 *
 *
 */
const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = ONE_MINUTE * 60;
const ONE_DAY = ONE_HOUR * 24;
const WAIT_PERIOD = ONE_MINUTE * 5;
const MAX_COUNT = 100;
const WATCHLIST_PATH = 'data/stocks.json';
const CSV_PATH = 'data/tweets.csv';
const influencers = [
  'MarketWatch',
  'business',
  'YahooFinance',
  'TechCrunch',
  'WSJ',
  'Forbes',
  'FT',
  'TheEconomist',
  'nytimes',
  'Reuters',
  'GerberKawasaki',
  'jimcramer',
  'TheStreet',
  'TheStalwart',
  'TruthGundlach',
  'Carl_C_Icahn',
  'ReformedBroker',
  'benbernanke',
  'bespokeinvest',
  'BespokeCrypto',
  'stlouisfed',
  'federalreserve',
  'GoldmanSachs',
  'ianbremmer',
  'MorganStanley',
  'AswathDamodaran',
  'mcuban',
  'muddywatersre',
  'StockTwits',
  'SeanaNSmith'
];

/* command line args */
let symbol: string,
  count: number,
  firebase: boolean,
  verified: boolean;
let operation = undefined;
let ref;

function parseCmdArgs () {
  process.argv.forEach(function (val, index) {
    switch (val) {
      case '--symbol':
      case '-s':
        symbol = process.argv[index + 1];
        break;
      case '--count':
      case '-c':
        count = parseInt(process.argv[index + 1]);
        break;
      case '--verified':
        verified = true;
        break;
      case '--firebase':
        firebase = true;
        break;
      case '--operation':
      case '-o':
        operation = process.argv[index + 1];
        break;
      default:
      // do nothing
    }
  });
}


/*
 *
 *	Initalize Firebase account (update to point to your paths & credentials -- different for each user)
 *
 */
function initalizeFirebaseConnection () {
  var serviceAccount, db, ref;
  if (firebase) {
    console.log('Firebase enabled...Attempting to verify credentials.');
    serviceAccount = require('./stockerbot-firebase-adminsdk-1yhwz-6e9672bd0a.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: 'https://stockerbot.firebaseio.com'
    });
    db = admin.database();
    ref = db.ref('/');
    console.log('Firebase account connected \x1b[42m successfully! \x1b[0m');
  } else {
    console.log('Firebase disabled.');
  }
}

function write_to_firebase (tweet, child) {
	/*
	 *
	 *	Writes the tweet to the user's firebase realtime DB at the root
	 *	of the DB using the tweet's ID as the key
	 *
	 */
	var id = tweet.id;
	delete tweet.id;
  
	if (typeof tweet.url == 'undefined') {
	  tweet.url = '';
	}
	ref
	  .child(child)
	  .child(id)
	  .set({
		text: tweet.text,
		timestamp: tweet.created_at,
		source: tweet.source,
		symbols: tweet.symbols,
		company_names: tweet.company_names,
		url: tweet.url,
		verified: tweet.verified
	  });
  
	console.log(
	  'updated Firebase w new tweet ',
	  '(',
	  id,
	  ') ',
	  '\x1b[42m successfully!\x1b[0m'
	);
}

function initalizeWatchList (): Stock[] {
  const watchList = [];
  const obj = JSON.parse(fs.readFileSync(WATCHLIST_PATH, 'utf8'));
  for (var key in obj) {
    const symbol = key;
    const name = obj[key];
    watchList.push({
		Name: name,
		Symbol: symbol
	} as Stock);
  }
  console.log('Number of Companies on watchlist: ', watchList.length);
  return watchList;
}

function initalize () {
  const logger = pino();
  parseCmdArgs();
  if (firebase) {
    initalizeFirebaseConnection();
  }
  const watchList = initalizeWatchList();
  _.set(config, 'watchList', watchList);
  _.set(config, 'filePath', './data/tweets.csv')
  _.set(config, 'logger', logger);
  const stockerBot = new StockerBot(config as StockerBotConfig);
  

/*
 *
 *	StockerBot Methods
 *
 */
switch(operation) {
	case 'search':
		if (!symbol) {
			throw new Error(
			  'Must provide a publicly traded stock ticker for the search API \
			  EXAMPLE: > `npm run search -- -s AAPL`'
			);
		}
		count = _.isUndefined(count) ? 10 : count;
		stockerBot.searchSymbol(symbol, count);
		break
	case 'poll':
		stockerBot.pollAccounts(influencers, WAIT_PERIOD);
		break
	case 'search_poll':
		console.log('search_poll starting..');
		/*
		*	Run once immediately, then start the interval to run every day
		*	after
		*/
		for (var i = 0; i < watchList.length; i++) {
			stockerBot.searchSymbol(watchList[i][0], MAX_COUNT);
		}
		setInterval(function () {
			for (var i = 0; i < watchList.length; i++) {
			stockerBot.searchSymbol(watchList[i][0], MAX_COUNT);
			}
		}, ONE_DAY);
		break;
	default:
		throw new Error(`Unknown operation: '${operation}' `);


}

  /*
 *	Attach event emitters
 *
 */

stockerBot.on(Event.NewTweet, function (screen_name, tweet) {
	console.log('detecting new tweet event was emitted');
	// write_to_firebase(tweet, 'poll');
});
  
stockerBot.on('symbolTweets', function (symbol, tweets) {
	console.log('Found ', tweets.length, ' tweets');

	if (verified) {
		tweets = tweets.filter(t => t.user.verified);
		console.log('Found ', tweets.length, ' verified tweets');
	}

	var tweet;
	for (var i = 0; i < tweets.length; i++) {
		tweet = tweets[i];

		var urls;
		if (tweet.entities.urls) {
			urls = tweet.entities.urls.map(url => url.expanded_url);
			tweet.url = urls[0];
		} else {
			tweet.url = '';
		}
		tweet.source = tweet.user.screen_name;
		tweet.symbols = symbol;
		tweet.company_names = '';
		tweet.verified = tweet.user.verified;
		write_to_firebase(tweet, 'search');
	}
});
  
}

initalize();
