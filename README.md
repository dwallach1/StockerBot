# StockerBot

This API uses the [Twit API](https://github.com/ttezel/twit) to gather tweets and associated urls about stocks that are in the watchlist array. 


###Input
There are two input parameters
	* **watchlist** is a 2-dimensional array with each entry following the format of ['symbol', 'name'] for each company you wish to collect data about. 
	* **influencers** is a 1-dimensional array with the usernames of all the accounts you want to use as your information source (leave out the `@` symbol).