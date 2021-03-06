'use strict';
var fs = require('fs');
var StockerBot = require('./index.js');
var config = require('./config');	// update to point to your Twit credentials 
var parse = require('csv-parse');
var async = require('async');
var csv = require('csv');
var admin = require("firebase-admin");



/*
 *
 *	Parse command line arguments & set flags
 *
 */

var symbol, count;
var firebase = false;
var verified = false;
var search = false;
var poll = false;
var search_poll = false;
var csvExport = false;
process.argv.forEach(function (val, index, array) {
  // console.log(index + ': ' + val);
  if (val == '--symbol' || val == '-s') { symbol = process.argv[index+1]; }
  if (val == '--count' || val == '-c') { count = parseInt(process.argv[index+1]); }
  if (val == '--firebase') { firebase = true; }
  if (val == '--verified') { verified = true; }
  if (val == '--search') { search = true; }
  if (val == '--poll') { poll = true; }
  if (val == '--search_poll') { search_poll = true; }
  if (val == '--csv') { csvExport = true; }
});


/*
 *
 *	Initalize Firebase account (update to point to your paths & credentials -- different for each user)
 *
 */
 var serviceAccount, db, ref;
 if (firebase) {
 	console.log('Firebase enabled...Attempting to verify credentials.')
 	serviceAccount = require("./stockerbot-firebase-adminsdk-1yhwz-6e9672bd0a.json");
 	admin.initializeApp({
	  credential: admin.credential.cert(serviceAccount),
	  databaseURL: "https://stockerbot.firebaseio.com"
	});
	db = admin.database();
	ref = db.ref('/');

	console.log('Firebase account connected \x1b[42m successfully! \x1b[0m');
 } else { console.log('Firebase disabled.'); }


/*
 *
 *	Declare Global vars 
 *
 *
 */
const ONE_MINUTE = 60*1000;
const ONE_HOUR = ONE_MINUTE*60;
const ONE_DAY = ONE_HOUR*24; 

const WAIT_PERIOD = ONE_MINUTE*3;
const MAX_COUNT = 100;
const WATCHLIST_PATH = 'data/stocks.json';
const CSV_PATH = 'data/tweets.csv';

var stockerBot = new StockerBot(config);

var watchlist = []
if (poll || search_poll) { get_user_watchlist(); }

var influencers = ['MarketWatch', 'business', 'YahooFinance', 'TechCrunch', 
					'WSJ', 'Forbes', 'FT', 'TheEconomist', 'nytimes', 'Reuters', 'GerberKawasaki', 
					 'jimcramer', 'TheStreet', 'TheStalwart', 'TruthGundlach',
					'Carl_C_Icahn', 'ReformedBroker', 'benbernanke', 'bespokeinvest', 'BespokeCrypto',
					'stlouisfed', 'federalreserve', 'GoldmanSachs', 'ianbremmer', 'MorganStanley', 'AswathDamodaran',
					'mcuban', 'muddywatersre', 'StockTwits', 'SeanaNSmith'];


function get_user_watchlist() {
 	/*
 	 *
 	 *	This function would get a user's watch list, but for testing & developing reasons
 	 *	it will just load NYSE top 100, SNP500, and a list of other stocks that I am 
 	 * 	curious about
 	 *
 	 */
 	 var obj = JSON.parse(fs.readFileSync(WATCHLIST_PATH, 'utf8'));
 	 var symbol, name;
 	 for (var key in obj) {
 	 	symbol = key;
 	 	name = obj[key];
 	 	watchlist.push([symbol, name]);

 	 }
 	 console.log("Number of Companies on watchlist: ", watchlist.length);
}

function write_to_firebase(tweet, child) {
	/*
	 *
	 *	Writes the tweet to the user's firebase realtime DB at the root
	 *	of the DB using the tweet's ID as the key 
	 *
	 */
	var id = tweet.id;
	delete tweet.id;

	if (typeof(tweet.url) == 'undefined') {tweet.url = ''}
	ref.child(child).child(id).set({ 
		text: tweet.text,
		timestamp: tweet.created_at,
		source: tweet.source,
		symbols: tweet.symbols,
		company_names: tweet.company_names,
		url: tweet.url,
		verified: tweet.verified
	});

	console.log('updated Firebase w new tweet ', '(', id ,') ', '\x1b[42m successfully!\x1b[0m');
}

function save(tweet, child) {
	/*
	 *	
	 *	This function saves the tweet to a file called tweets.csv which is 
	 *	located at the path stored in the DATA_WRITE_PATH variable. If this file does
	 *	not exist, then this function will create it at the designated path.
	 *
	 */
	if (csvExport) {
		if (!fs.existsSync(CSV_PATH)) {
			var header = 'id,text,timestamp,source,symbols,company_names,url,verified\n'
			fs.writeFile(CSV_PATH, header, function(err) {
			    if(err) {
			        return console.log(err);
			    }
			    console.log(CSV_PATH, " file was created!");
			}); 
		}
	}

	var words = tweet.text.replace(/,/g , '').split(' ');
	for (var i = 0; i < words.length; i++) {
		words[i] = words[i].replace(/^\s+|\s+$/g, '');
	}
	var text = words.join(' ');
	text = text.replace(/\r?\n|\r/g, ' ');
	tweet.text = text;
	
	if (csvExport) {
		var line = tweet.id + ',' + text + ',' + tweet.created_at + ',' + tweet.source + ',' + tweet.symbols + ',' + tweet.company_names + ','+ tweet.url + tweet.verified +'\n';
		
		fs.appendFile(CSV_PATH, line, function (err) {
		  if (err) { console.log('error saving data (append)', err); }
		  console.log('Tweet ', tweet.id, ' was saved \x1b[42m successfully! \x1b[0m');
		});
	}
	if (firebase) { write_to_firebase(tweet, child); }
}

function uniqueify(a) {
	/*
	 *	Taken from https://stackoverflow.com/questions/1960473/get-all-unique-values-in-an-array-remove-duplicates
	 *
	 */
    var seen = {};
    return a.filter(function(item) {
        return seen.hasOwnProperty(item) ? false : (seen[item] = true);
    });
}

function find_companies(screen_name, text) {
	/*
	 *
	 *	Aims to see if the tweet is pertaining to any one of the
	 *  stocks in the user's watch list -- if so, then save to disk and tag them 
	 *	with associated symbols
	 *
	 */
	var companies = [];
	var symbol, name, $symbol, $S, S, N, words
	if (watchlist) {
		for (var i=0; i < watchlist.length; i++) {
			symbol = ' ' + watchlist[i][0] + ' ';
			$symbol = ' ' + '$' + watchlist[i][0] + ' ';
			name = watchlist[i][1];

			$S = text.toLowerCase().includes($symbol.toLowerCase());
			N = text.toLowerCase().includes(name.toLowerCase());
			S = text.toLowerCase().split(' ').indexOf(symbol) > -1;

			if ($S || S || N) { companies.push(watchlist[i]); }
		}
	}
	return uniqueify(companies);
}

/*
 *	Attach event emitters
 *
 */

stockerBot.on('newTweet', function(screen_name, tweet) {
	/*
	 * Twitter's Tweet API (https://developer.twitter.com/en/docs/tweets/data-dictionary/overview/intro-to-tweet-json)
	 * 
	 */

	console.log('tweet from: ', screen_name, '|', tweet.id, '|', '(', tweet.created_at, ')', ' ---> ', tweet.text);

	var urls
	if (tweet.entities.urls) {
		urls = tweet.entities.urls.map(url => url.expanded_url);
		tweet.url = urls[0];
	} else {
		tweet.url = '';
	}
	
	var companies = find_companies(screen_name, tweet.text);
	var classification = classify(screen_name, tweet.text);
	tweet.source = screen_name;

	if (companies.length > 0) {
		var symbols = companies.map(c => c[0]);
		var names = companies.map(c => c[1]);
		tweet.symbols = symbols.join('-');
		tweet.company_names = names.join('*');
		tweet.verified = tweet.user.verified;

		save(tweet, 'poll');
	}
});

stockerBot.on('symbolTweets', function(symbol, tweets) {
	console.log('Found ', tweets.length, ' tweets');

	if (verified) {
		tweets = tweets.filter(t => t.user.verified);
		console.log('Found ', tweets.length, ' verified tweets');
	}
	
	var tweet;
	for (var i=0; i<tweets.length; i++) {
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
		save(tweet, 'search');
	}
});


/*
 *	
 *	StockerBot Methods
 *
 */
if (search) {
	if (!symbol) { throw new Error('Must provide a publicly traded stock ticker for the search API\n EXAMPLE: > `npm run search -- -s AAPL`'); }
	count = typeof(count) == "undefined" ? 10 : count;
	stockerBot.searchSymbol(symbol, count);
}

if (poll) {
	stockerBot.pollAccounts(influencers, WAIT_PERIOD);
}

if (search_poll) {
	console.log('search_poll starting..');
	
	/*
	 *	Run once immediately, then start the interval to run every day
	 *	after
	 */
	for (var i=0; i < watchlist.length; i++) {
			stockerBot.searchSymbol(watchlist[i][0], MAX_COUNT);
	} 
	setInterval(function() {
		for (var i=0; i < watchlist.length; i++) {
			stockerBot.searchSymbol(watchlist[i][0], MAX_COUNT);
		} 
	}, ONE_DAY);
}
