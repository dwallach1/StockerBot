'use strict';
var fs = require('fs');
var StockerBot = require('./index.js');
var config = require('./config');
var Papa = require('papaparse')


const WAIT_PERIOD = 30*1000;	// 30 seconds
const BATCH_SIZE = 10

var stockerBot = new StockerBot(config);

console.log("StockerBot initalized")

/*
 *  Load stock data to identify if a tweet is pertaning to a user's stock
 *	list
 */

 function get_user_watchlist() {
 	/*
 	 *
 	 *	This function would get a user's watch list, but for testing & developing reasons
 	 *	it will just load NYSE top 100, SNP500, and a list of other stocks that I am 
 	 * 	curious about
 	 *
 	 */

 	 // var csv_data = readFileSync('../data/stocks.csv')
 	 
 	 // Papa.parse(csv_data, {
 	 // 	complete: function(results) {
 	 // 		console.log("Finished:", results.data)
 	 // 	}
 	 // });

 	 
 }

var watchlist = get_user_watchlist()
var tweets_to_write = []

function batch_save() {
	if (tweets_to_write.length > BATCH_SIZE) {
		// write all tweets to disk and clear

		tweets_to_write = []
	}
	// otherwise do nothing
	return
}


function is_relevant(screen_name, text) {
	/*
	 *
	 *	Aims to see if the tweet is pertaining to any one of the
	 *  stocks in the user's watch list -- if so, then save to disk and tag them 
	 *	with associated symbols
	 *
	 */
	var companies = []
	// var symbol, name 
	// for (var i=0; i < watchlist.length; i++) {
	// 	symbol = watchlist[i][0]
	// 	name = watchlist[i][1]

	// 	S = regex.search(text, symbol)
	// 	N = regex.search(text, name)

	// 	if (S || N) { companies.push(symbol) }
	// }
	return companies
}

function classify(screen_name, text) {
	/*
	 *
	 *  Aims to classify the tweet into one of the following categories:
	 *	
	 *  	0 - competitor
	 *		1 - the company itself
	 *		2 - general industry of the company
	 */
	 return 1
}


/*
 *	Attach event emitters
 *
 */

stockerBot.on('newTweet', function(screen_name, tweet) {
	/*
	 * TWITTER TWEET API PARAMETERS (https://developer.twitter.com/en/docs/tweets/data-dictionary/overview/intro-to-tweet-json)
	 * 
	 */

	console.log('tweet from: ', screen_name, '(', tweet.created_at, ')', ' ---> ', tweet.text)

	var urls
	if (tweet.entities.urls) {
		urls = tweet.entities.urls.map(url => url.expanded_url)
	} else {
		urls = []
	}
	console.log(urls)

	var is_relevant = is_relevant(screen_name, tweet.text)
	var classification = classify(screen_name, tweet.text)
	tweet.source = screen_name

	tweets_to_write.push(tweet)

	batch_save()
});



stockerBot.on('symbolTweet', function(symbol, tweet) {

	console.log('tweet about: ', symbol, '(', tweet.created_at, ')', ' ---> ', tweet.text)
	tweet.source = symbol

	tweets_to_write.push(tweet)

	batch_save()

}); 



// start the loop
var screen_names = ['MarketWatch', 'business', 'YahooFinance', 'TechCrunch', 'WSJ', 'Forbes', 'FT', 'TheEconomist', 'nytimes', 'Reuters', 'GerberKawasaki']
stockerBot.pollAccounts(screen_names, WAIT_PERIOD)

console.log("StockerBot started ...")

