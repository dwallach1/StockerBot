"""
Use raw input to show each tweet as sentence and then classify the sentence as 

	- 'N' for negative
	- 'P' for positive
	- 'X' for netural 
"""
from textblob import TextBlob
import sys
import os
import re
import json
sys.path.insert(0, '/Users/david/Desktop/Projects/Stocker/src')
from webparser import scrape


# read in JSON files here 
dir_path, file_path = os.path.split(os.path.abspath(__file__))
data_path = '/'.join(dir_path.split('/')[:-1]) + '/data/stockerbot-export-test.json'
vocab_path ='/'.join(dir_path.split('/')[:-1]) + '/data/vocabulary.json'
stocks_path = '/'.join(dir_path.split('/')[:-1]) + '/data/stocks.json'


with open(stocks_path, 'r') as f:
	names = json.load(f)

with open(data_path, 'r') as f:
    data = json.load(f)


sentences = {}
db = data['poll']

def save():
	"""
	"""
	if not os.path.exists(vocab_path):
		with open(vocab_path, 'w') as f:
			json.dump(sentences, f, indent = 4)
	else:
		with open(vocab_path, 'r') as f:
			old_sentences = json.load(f)

		combine = {**old_sentences, **sentences}
		
		with open(vocab_path, 'w') as f:
			json.dump(combine, f, indent = 4)

	# save the updated data w/ 'analyzed fields marked'
	with open(data_path, 'w') as f:
		data['poll'] = db
		json.dump(data, f, indent = 4)
	print ('saved!')


def exit():
	"""
	save the updated JSON object of DB to disk and then quit
	"""
	save()
	sys.exit()




# iterate over json objects in the polling subsection
for key in db.keys():
	text = db[key]['text']
	valid_responses = ['exit', 'save', 'skip', 'g', 'n', 'p', 'x']
	
	if not ('analyzed' in db[key].keys()):
		if db[key]['url']:
			text += (scrape(db[key]['url'], '', '').article)
		blob = TextBlob(text)
		db[key]['analyzed'] = True

		skip = False
		# add tagged sentence to the vocabulary
		for sentence in blob.sentences:
			print (sentence)
			tmp = []
			for stock in db[key]['symbols'].split('-'):
				while True:
					tag = input(stock + ' (' + names[stock] + ')' + ' > ')
					if not tag in valid_responses:
						print ('invalid entry, try again.')
						continue
					if tag == 'exit': exit()
					elif tag == 'save': 
						save()
					elif tag == 'g': 
						break
					elif tag == 'skip':
						skip = True
						break
					else: 
						tmp.append([stock, tag])
						break
				if skip:
					break

			obj = {}
			for s in tmp:
				obj[s[0]] = s[1]
			if obj:
				sentence = re.sub(r'^https?:\/\/.*[\r\n]*', '', str(sentence), flags=re.MULTILINE)
				sentences[sentence] = obj
			tmp = []

			if skip:
				skip = False
				break





