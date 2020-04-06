import _ from 'lodash';
import fs from 'fs';
import Twit from 'twit';
import { EventEmitter } from 'events';

/*
 *
 *	This function would get a user's watch list, but for testing & developing reasons
 *	it will just load NYSE top 100, SNP500, and a list of other stocks that I am
 * 	curious about
 *
 */
export interface Stock {
	Name: string
	Symbol: string
}

export interface StockerBotConfig {
  ConsumerKey: string;
  ConsumerSecret: string;
  AccessToken: string;
  AccessTokenSecret: string;
  RestrictToAppAuth: boolean;
  timeout: number;
  watchList: Stock[];

  logger?: any;
  batchSize?: number;
  filePath?: string;
}

export enum Event {
	NewTweet = 'NewTweet'
}

enum LogLevel {
	DEBUG,
	INFO,
	WARNING,
	ERROR
}

interface TwitterHistory {
  [username: string]: number;
}

/*
Example Tweet
 id: 1246937667574673400,
    id_str: '1246937667574673408',
    text:
     'What Walmart\'s COVID-19 Policies Mean for the Grocery Store Industry https://t.co/qygIsOrXWC',
    truncated: false,
    entities:
     { hashtags: [], symbols: [], user_mentions: [], urls: [Array] },
    source: '<a href="https://buffer.com" rel="nofollow">Buffer</a>',
    in_reply_to_status_id: null,
    in_reply_to_status_id_str: null,
    in_reply_to_user_id: null,
    in_reply_to_user_id_str: null,
    in_reply_to_screen_name: null,
    user:
     { id: 15281391,
       id_str: '15281391',
       name: 'TheStreet',
       screen_name: 'TheStreet',
       location: 'New York, NY',
       description:
        'TheStreet brings you the best business news and premium investing ideas and stock analysis around. We want to help you make money, lots of it.',
       url: 'https://t.co/VwgoRjzYvy',
       entities: [Object],
       protected: false,
       followers_count: 699530,
       friends_count: 1242,
       listed_count: 6213,
       created_at: 'Mon Jun 30 19:12:38 +0000 2008',
       favourites_count: 8652,
       utc_offset: null,
       time_zone: null,
       geo_enabled: true,
       verified: true,
       statuses_count: 182650,
       lang: null,
       contributors_enabled: false,
       is_translator: false,
       is_translation_enabled: false,
       profile_background_color: 'FFFFFF',
       profile_background_image_url: 'http://abs.twimg.com/images/themes/theme1/bg.png',
       profile_background_image_url_https: 'https://abs.twimg.com/images/themes/theme1/bg.png',
       profile_background_tile: false,
       profile_image_url:
        'http://pbs.twimg.com/profile_images/948204500904488960/clELcfZ7_normal.jpg',
       profile_image_url_https:
        'https://pbs.twimg.com/profile_images/948204500904488960/clELcfZ7_normal.jpg',
       profile_banner_url: 'https://pbs.twimg.com/profile_banners/15281391/1560276280',
       profile_link_color: '3B94D9',
       profile_sidebar_border_color: 'FFFFFF',
       profile_sidebar_fill_color: 'C2C2C2',
       profile_text_color: '0F0E0F',
       profile_use_background_image: false,
       has_extended_profile: false,
       default_profile: false,
       default_profile_image: false,
       following: null,
       follow_request_sent: null,
       notifications: null,
       translator_type: 'none' },
    geo: null,
    coordinates: null,
    place: null,
    contributors: null,
    is_quote_status: false,
    retweet_count: 4,
    favorite_count: 5,
    favorited: false,
    retweeted: false,
    possibly_sensitive: false,
    lang: 'en' } ]
*/
interface Tweet {
  id: number;
  screen_name: string;
  text: string;
  created_at: any;
  user: any;

  source?: any;
  companyNames?: any;
  url?: any;
  verified?: boolean;
  symbols?: any;
}

export default class StockerBot extends EventEmitter {
  private TwitClient: any;
  private history: TwitterHistory;
  private logger: any;
  private batchSize: number;
  private tweetBuffer: Tweet[] = [];
  private watchList: Stock[] = [];
  private saveToFile: boolean;
  private filePath: string;

  constructor (config: StockerBotConfig) {
    super();
    this.TwitClient = new Twit({
      consumer_key: config.ConsumerKey,
      consumer_secret: config.ConsumerSecret,
      access_token: config.AccessToken,
      access_token_secret: config.AccessTokenSecret,
      app_only_auth: config.RestrictToAppAuth,
      timeout_ms: config.timeout
    });
	this.history = {};
	this.watchList = config.watchList;

	this.logger = _.get(config, 'logger');
	this.batchSize = _.get(config, 'batchSize', 10);

	if (!_.isUndefined(config.filePath)) {
		this.saveToFile = true;
		this.filePath = config.filePath;
		const thisInstance = this;
		// filepath provided, check if file exists, if not create it
		if (!fs.existsSync(config.filePath)) {
			const header = 'id,text,timestamp,source,symbols,company_names,url,verified\n';
			fs.writeFile(config.filePath, header, function (err) {
			  if (err) {
				console.log(err);
				thisInstance.log(LogLevel.ERROR, err.message);
			  } else {
				thisInstance.log(LogLevel.INFO, 
					`FilePath initalized in config, no file existed. Created ${config.filePath}`);
			  }
			});
		} else {
			thisInstance.log(LogLevel.INFO, `Set filePath to an existing file: ${config.filePath}`)
		}
	}
  }

  /*
   *	if count is set to -1 and the since date parameter is
   *	provided, this API will accumulate the tweets in batches ~ if very
   *	large, it can take a while
   *
   *	Keep in mind that the search index has a 7-day limit.
   *
   */
  public searchSymbol (symbol: string, count: number) {
    /*
     * Twitter uses the '$' to signify tweets linked to stock tickers.
     *
     * https://www.wired.com/2009/02/on-twitter-is-t/
     *
     */
    if (symbol.charAt(0) !== '$') {
      symbol = '$' + symbol;
    }
    symbol = symbol.trim();
    console.log('searching for symbol: ', symbol);
    const path = 'search/tweets';
    const options = {
      q: symbol,
      count: count
    };
    this.TwitClient.get(path, options, function (err, data, response) {
      if (err) {
      	this.log(LogLevel.ERROR, err);
      }

      const tweets = _.get(data, 'statuses', []);
      this.emit('symbolTweets', symbol, tweets);
    });
  }

  public pollAccounts (usernames: string[], interval: number): void {
    this.log(LogLevel.INFO, 'Polling accounts ...');
    setInterval(() => this.pollSpawner(usernames), interval);
  }

  private pollSpawner (usernames: string[]): void {
    _.forEach(usernames, (username: string) => {
      this.pollWorker(username);
    });
  }

  private pollWorker (username: string) {
    const path = 'statuses/user_timeline';
    const options: any = {
      screen_name: username,
      exclude_replies: true
    };
    const usersLastTweetId = this.getHistory(username);
    if (!_.isUndefined(usersLastTweetId)) {
      options.since_id = usersLastTweetId;
    }

	const thisInstance = this;
    this.TwitClient.get(path, options, function (err: Error, data: any, response) {
		if (err) {
			this.log(LogLevel.ERROR, err.message);
		}
		if (data.length) {
			// analyze and store the tweet
			thisInstance.analyzeTweet(username, data[0]);
			//update last tweet
			const tweetId = _.get(data, '0.id', undefined);
			if (!_.isUndefined(tweetId)) {
				thisInstance.setUserTweet(username, tweetId);
			}
		}
    });
  }

  private analyzeTweet (username: string, tweet: Tweet) {
    const currentId = this.getHistory(username) ? this.getHistory(username) : 0;
    if (tweet.id > currentId) {
      //emit the event that a new tweet was analyzed
      this.setUserTweet(username, tweet.id);
	  tweet.screen_name = username;
	  this.log(LogLevel.DEBUG, `Tweet from ${username} | ${tweet.id} | (${tweet.created_at}) :: ${tweet.text}`)
	  this.save(tweet, username);
	  this.emit(Event.NewTweet, username, tweet);
    }
  }

  /*
   *
   *	This function saves the tweet to a file called tweets.csv which is
   *	located at the path stored in the DATA_WRITE_PATH variable. If this file does
   *	not exist, then this function will create it at the designated path.
   *
  */
  public save(tweet: Tweet, username: string): void {
	if (!this.saveToFile) {
		return;
	}
	if (this.tweetBuffer.length >= this.batchSize) {
		this.flushBuffer(username);
	} else {
		this.tweetBuffer.push(tweet)
	}
  }

  private flushBuffer(username: string): void {
	let tweetStringToAppend = '';

	_.forEach(this.tweetBuffer, (tweet: Tweet) => {
		const tweetText = this.cleanTweet(tweet.text);
		const companyNames = this.associateCompanies(tweetText);
		if (companyNames.length) {
			tweet.companyNames = companyNames.join('*');
		}
		tweet.url = this.getURL(tweet);
		tweet.verified = tweet.user.verified;
		tweet.source = username;
		const params = [tweet.id, tweetText, tweet.created_at, tweet.source, tweet.symbols, tweet.companyNames, tweet.url, tweet.verified];
		const line = `${params.join(',')}\n`;
		tweetStringToAppend += line
	});
	const thisInstance = this;
	fs.appendFile(this.filePath, tweetStringToAppend, function (err) {
		if (err) {
			console.log('error saving data (append)', err);
			thisInstance.log(LogLevel.ERROR, `error saving data (append): ${err.message}`);
		}
		thisInstance.log(LogLevel.INFO, `\x1b[42m Successfully saved batch (size: ${thisInstance.batchSize}) of tweets to ${thisInstance.filePath} \x1b[0m`);
	});
  }

  private cleanTweet(text: string): string {
	const words = _.map(text.replace(/,/g, '').split(' '), (word: string) => {
		return word.replace(/^\s+|\s+$/g, '');
	});
	const cleanedTweet = words.join(' ');
	return cleanedTweet.replace(/\r?\n|\r/g, ' ');
  }

  /*
	*
	*	Aims to see if the tweet is pertaining to any one of the
	*  stocks in the user's watch list -- if so, then save to disk and tag them
	*	with associated symbols
	*
 	*/
  private associateCompanies(tweetText: string): string[] {
	const text = tweetText.toLowerCase();
	const stockTickers = [];
	_.forEach(this.watchList, (stock: Stock) => {
		const symbol = ' ' + stock.Symbol + ' ';
		const specialSymbol = ' $' + stock.Symbol + ' '; 
		const name = stock.Name.toLowerCase();

		const mentionsName = text.includes(name);
		const mentionsSybmol = text.includes(symbol);
		const mentionsSpecialSymbol = text.includes(specialSymbol);

		if (mentionsName || mentionsSybmol || mentionsSpecialSymbol) {
			stockTickers.push(stock.Symbol);
		}
	}); 
	return _.union(stockTickers); // dont return duplicate companies
  }

  private getURL(tweet: Tweet) {
	  return _.get(tweet, 'entities.urls.0.expanded_url', '');
  }
  
  /*
   * History methods used for ensuring that we do not parse
   * and save duplicate tweets while polling.
   *
   */
  private getHistory (username: string): number | undefined {
    return _.get(this.history, username);
  }

  private setUserTweet (username: string, tweetId: number): void {
    this.history[username] = tweetId;
  }

  /*
   * Optional Logger methods if a logger is configured
   *
   * 
   */
  private log(lvl: LogLevel, msg: string): void {
	if (_.isUndefined(this.logger)) {
		return;
	}
	switch (lvl) {
		case LogLevel.DEBUG:
			_.invoke(this.logger, 'debug', msg);
			break;
		case LogLevel.INFO:
			_.invoke(this.logger, 'info', msg);
			break;
		case LogLevel.WARNING:
			_.invoke(this.logger, 'warning', msg);
			break;
		case LogLevel.ERROR:
			_.invoke(this.logger, 'error', msg);
			break;
		default: 
			_.invoke(this.logger, 'debug', msg);
	} 
  }
}
