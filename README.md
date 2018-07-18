# StockerBot

This API uses the [Twit API](https://github.com/ttezel/twit) to monitor and search Twitter for tweets about publicly traded companies that you are interested in. To set up the project on your local machine, just run the following code

```
> git clone https://github.com/dwallach1/StockerBot.git
> npm install
```

The core functionality of this project is to be run on a remote server (Google/Amazon cloud instance, or in my case a RaspberryPi) and to update a database (in my case a Firebase Realtime Database). This is achieved using the `polling` API. To successfully run this, you need to set the variable (type: 2-D array) `watchlist` to contain a list of arrays in the format ['symbol', 'name']. Next you need to set the variable (type: 1-D array) `influencers` to contain a list of strings that represent the usernames of all the accounts you want to use as your information source (leave out the `@` symbol). 

Next, you can make a free Firebase account (follow quickstart guide [here](https://github.com/firebase/quickstart-nodejs)) and then replace the `var serviceAccount = require(path_to_firebase_secrets)` with the appropiate path to the file Firebase gives you and `admin.initializeApp` lines to point to the correct credentials and databaseURL. 


In the `main.js` file, set the following variables 
```javascript
var watchlist = [['UAA', 'Under Armour'], ['TSLA', 'Tesla'], ['AAPL', 'Apple']];
var influencers = ['MarketWatch', 'business', 'YahooFinance', 'TechCrunch'];
```

Then in your terminal console, run 

```
> npm run poll 
```

This will run Twitter searches for all tweets made by the twitter accounts in the influencer array. If any of them contain tweets about any company in the watchlist, StockerBot will save the tweet to a .csv file indicated by the csv_path parameter and to your Firebase Realtime Database instance at the root with each tweet's ID used as the keys. By default the code will run every minute and not stop until you manually stop execution or your server stops. To configure the frequency StockerBot polls twitter, change the `WAIT_PERIOD` variable. 


If you would like to gather tweets based on just the companies stock ticker, without care for who authored the tweet, you can use the `search` API. To get the `x` most recent tweets about a stock from the past 7 days (Twitter API constraint), there is a `searchSymbol` API. This API does not look at the watchlist or the influencer lists and exits after running. Simply run

```
> npm run search -- -s AAPL 
```

You must provide the symbol flag (`-s` or `--symbol`). You can also pass a count flag (`-c` or `--count`) to get `x` amount of tweets, this value defaults to 10 if no value is provided. Passing a value of -1 for the count will get as many as possible. You can also provide a verified flag (`-v` or `--verified`) to ensure that each tweet is from a verified account, this flag defaults to 1 (true). 


