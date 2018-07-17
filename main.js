'use strict';
var fs = require('fs');
var StockerBot = require('./index.js');
var config = require('./config');
var parse = require('csv-parse');
var async = require('async');

var csv = require('csv');


const WAIT_PERIOD = 30*1000;	// 30 seconds
const BATCH_SIZE = 3;
const DATA_READ_PATH = 'data/stocks_cleaned.csv';
const DATA_WRITE_PATH = 'data/tweets.csv';

var stockerBot = new StockerBot(config);


console.log("StockerBot initalized");
var watchlist = []
get_user_watchlist()
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
 	 // var watchlist = []
 	 var unpacked_row;
 	 fs.createReadStream(DATA_READ_PATH)
   	   .pipe(parse({delimiter: ':'}))
       .on('data', function(csvrow) {
	        // console.log(csvrow);
	        unpacked_row = csvrow[0].split(',');
	        watchlist.push(unpacked_row);
	    })
       .on('end',function() {
	    	console.log('finished parsing stock list.');
	    	var bitcoin = ['BTC', 'Bitcoin'];
	    	watchlist.push(bitcoin);
	    	console.log("Number of Companies on watchlist: ", watchlist.length);	    	
	    	return watchlist
    	});
 //   	var obj = csv();
	// obj.from.path(DATA_READ_PATH).to.array(function (data) {
	//     for (var index = 1; index < data.length; index++) {
	//         watchlist.push([data[index][0], data[index][1]]);
	//     }
	// });
	// return watchlist; 
 }

// var watchlist = get_user_watchlist();
var tweets_to_write = [];

function save(tweet) {
	if (!fs.existsSync(DATA_WRITE_PATH)) {
		var header = 'id,text,timestamp,source,companies,url\n'
		fs.writeFile(DATA_WRITE_PATH, header, function(err) {
		    if(err) {
		        return console.log(err);
		    }
		    console.log("data/tweets.csv file was created!");
		}); 
	}
	var line = tweet.id + ',' + tweet.text.replace(/,/g , '') + ',' + tweet.created_at + ',' + tweet.source + ',' + tweet.companies + ',' + tweet.url + '\n';
	fs.appendFile(DATA_WRITE_PATH, line, function (err) {
	  if (err) 
	  	return console.log('error saving data (append)', err);

	  console.log('Tweet ', tweet.id, ' was saved successfully!');
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
			symbol = watchlist[i][0]
			$symbol = '$' + symbol
			name = watchlist[i][1]

			$S = text.toLowerCase().includes($symbol.toLowerCase());
			N = text.toLowerCase().includes(name.toLowerCase());
			S = text.toLowerCase().split(' ').indexOf(symbol) > -1;

			if ($S || S || N) { companies.push(symbol); }
		}
	}
	console.log('watchlist is: ', watchlist);
	return companies;
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
	 return 1;
}

function uniqueify(tweets) {
    var seen = {};
    return tweets.filter(function(tweet) {
        return seen.hasOwnProperty(tweet.id) ? false : (seen[tweet.id] = true);
    });
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

	console.log('tweet from: ', screen_name, '(', tweet.created_at, ')', ' ---> ', tweet.text);

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

	tweet['status'] = 0

	if (companies.length > 0) {
		tweet.companies = companies.join('-');
		save(tweet);
	}
});



stockerBot.on('symbolTweet', function(symbol, tweet) {

	console.log('tweet about: ', symbol, '(', tweet.created_at, ')', ' ---> ', tweet.text)
	tweet.source = symbol

	tweets_to_write.push(tweet)

	batch_save()
	tweets_to_write = tweets_to_write.filter(t => t.status == 0)
}); 



// start the loop
var screen_names = ['MarketWatch', 'business', 'YahooFinance', 'TechCrunch', 
					'WSJ', 'Forbes', 'FT', 'TheEconomist', 'nytimes', 'Reuters', 'GerberKawasaki', 'derv_wallach'];

stockerBot.pollAccounts(screen_names, WAIT_PERIOD);
