# StockerBot

Some use cases for this API can be found on my Kaggle page: [here](https://www.kaggle.com/davidwallach/financial-tweets). The overarching mission of this project is to develop a dataset consisting of sentences with financial sentiment, then tag each sentece and finally use this to build a sentiment analysis model fine-tuned for investing jargon. From there, I would hope to build an API that tracks live sentiment for any publicly traded company. The motivation is that there currently are no free financial models that can accurately classify sentiment with regards to investing. To see a live API using sentiment analysis and see the problems with finanical sentiment, play around with [this](http://text-processing.com/demo/sentiment/).

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

Create a config file at project root with the following keys:
- CONSUMER_KEY
- CONSUMER_SECRET
- ACCESS_TOKEN
- ACCESS_TOKEN_SECRET
- APP_ONLY_AUTH
- TIMEOUT_MS

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

### Sentiment Classification

One main objective of this project is to classify the sentiment of companies based on verified user's tweets as well as articles published by reputable sources. Using current (free) text based sentiment analysis packages such as nltk, textblob, and others, I was unable to achieve decent sentiment analysis with regards to investing. For example, a tweet would say `Amazon is a buy, you must invest now` and these [libraries](http://text-processing.com/demo/sentiment/) would classify it as negative or neutral sentiment. This is due to the training sets these classifiers were built on. For this reason, I decided to write a script (`scripts/classify.py`) that takes in the json representation of the database downloaded from the Firebase console (using export to JSON option) and lets you manually classify each sentence. It works like this:

1. For each tweet parsed and written to the Database, it gets the tweet's text
2. If a url is attached to the tweet, it opens the url and uses the [Stocker](https://github.com/dwallach1/Stocker) API (webparser.py module) to open the url and extract the text. It then appends the text to the tweet's text.
3. Then converts this text into a textblob object (so that it can be split into sentences)
4. For each sentence, it asks you to mark the sentiment as either `p` for positive, `n` for negative or `x` for neutral. If the sentence is garbage or arbitrary, then write `g` and the program will ignore it. 
	* sometimes the webscraper encounters a lot of junk, to skip to the next object in the database, write `skip`
5. To save your work, type in `save` at any time or type in `exit` to save your work and cease execution

When you save your classifications, it writes them to a `vocabulary.json`. If the file already exists, it will update it with the new data every time you save. Every time you save, it will also update the database json file, marking each object that has been classified with an `analyzed` attribute indicating that it has already been seen and handled -- this avoids reclassifying the same data every time. 

An example of this process is provided below:

```
> python classify.py
> Amazon hands goodwill to eBay with move to shut Australians out of overseas sites https://t.co/4g3qAWHO8d https://t.co/I0SXYd4BJu
> EBAY (eBay) > p 	 
> AMZN (Amazon) > n  

# now the script opens the link and begins inlining the text from the link

> He s considering a switch to eBay Inc (EBAY.O), adding that prices for wall mounts were 40 percent higher on Amazon s Australia site if they appeared there at all.
> EBAY (eBay) > p
> AMZN (Amazon) > n
> It is highly likely they will get it right in Australia over the longer term, and prices will be competitive, service will be outstanding, and they will eat eBay s lunch,  Michael Pachter, managing director of equity research at Los Angeles-based Wedbush Securities, said by email.
> EBAY (eBay) > exit
saved!
```
This would yield a `vocabulary.json` that looked like
```
{
	"He s considering a switch to eBay Inc (EBAY.O), adding that prices for wall mounts were 40 percent higher on Amazon s Australia site if they appeared there at all.": { 
				"EBAY": "p", 
				"AMZN": "n"
			}
}
```
and then in the input json file it will mark that node as such:
```
"1019836822401224700": {
            "company_names": "eBay*Amazon",
            "source": "Reuters",
            "symbols": "EBAY-AMZN",
            "text": "Amazon hands goodwill to eBay with move to shut Australians out of overseas sites https://t.co/4g3qAWHO8d https://t.co/I0SXYd4BJu",
            "timestamp": "Thu Jul 19 06:50:20 +0000 2018",
            "url": "https://reut.rs/2NuAeRt",
            "verified": true,
            "analyzed": true
        }
```

### Converting between JSON and CSV

Once you have created your Firebase Realtime Database and began running this script with your configurations and your tweets have been accumulating. Log into your Firebase Database dashboard and under the data tab click the 3 vertical dots and select download `Export JSON`. In the scripts folder inside of the file `json2csv.py` update the `infile` variable to point to the file downloaded from Firebase and the `outfile` to point to where you want to write the .csv file. From there, you can use the datasets how you wish. 
