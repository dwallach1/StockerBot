# StockerBot

Some use cases for this API can be found on my Kaggle page: [here](https://www.kaggle.com/davidwallach/financial-tweets)

This API uses the [Twit API](https://github.com/ttezel/twit) to monitor and search Twitter for tweets about publicly traded securities that you are interested in. To set up the project on your local machine, just run the following code

```
> git clone https://github.com/dwallach1/StockerBot.git
> cd StockerBot && npm install
```

The core functionality of this project is to be run on a remote server (Google/Amazon cloud instance, or in my case a RaspberryPi) and to update a database (a Firebase Realtime Database). This is achieved using the `polling` API. To successfully run this, you need to set the variable (type: 2-D array) `watchlist` to contain a list of arrays in the format ['symbol', 'name']. Next you need to set the variable (type: 1-D array) `influencers` to contain a list of strings that represent the usernames of all the accounts you want to use as your information source (leave out the `@` symbol). 

Next, you can make a free Firebase account (follow quickstart guide [here](https://github.com/firebase/quickstart-nodejs)) and then replace the `var serviceAccount = require(path_to_firebase_secrets)` with the appropiate path to the file Firebase gives you containing your private keys and set the `admin.initializeApp` lines to point to the correct credentials and databaseURL. 


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

You must provide the symbol flag (`-s` or `--symbol`). You can also pass an optional count flag (`-c` or `--count`) to get `x` amount of tweets, this value defaults to 10 if no value is provided. Passing a value of -1 for the count will get as many as possible (soon to be implemented). You can also provide a verified flag (`--verified`) to ensure that each tweet is from a verified account, this flag defaults to `false`. 

To get a mix of the two APIs, I developed the search_poll API that runs every 24 hours and searches for each security symbol in your watchlist array. This API expects that you have connected a Firebase account and writes all tweets found to the path `/search/` in your database

```
> npm run search_poll
```
If you want to ensure that all the tweets are from verified accounts then run
```
> npm run search_poll -- --verified
```


### Converting JSON to CSV

Once you have created your Firebase Realtime Database and began running this script with your configurations and your tweets have been accumulating. Log into your Firebase Database dashboard and under the data tab click the 3 vertical dots and select download `Export JSON`. In the scripts folder inside of the file `json2csv.py` update the `infile` variable to point to the file downloaded from Firebase and the `outfile` to point to where you want to write the .csv file. From there, you can use the datasets how you wish. 
