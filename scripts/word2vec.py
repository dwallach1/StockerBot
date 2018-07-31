"""
Append all tweets to a file written in consecutive sentences.
Open all links associated with verified tweets and write it to the file as well.
"""

import sys
import os
import re
import json
from gensim.models import Word2Vec
from gensim.test.utils import datapath

# import the web scraping API 
sys.path.insert(0, '/Users/david/Desktop/Projects/Stocker/src')
from webparser import scrape


# import and define a sentence & word parser 
from nltk.tokenize import RegexpTokenizer, sent_tokenize
tokenizer = RegexpTokenizer(r'\w+')

from nltk.corpus import stopwords
stop_words = set(stopwords.words('english'))


# read in JSON files here 
dir_path, file_path = os.path.split(os.path.abspath(__file__))
base_path = '/'.join(dir_path.split('/')[:-1])
data_path = '/'.join(dir_path.split('/')[:-1]) + '/data/stockerbot-export-test.json'
document_path = '/'.join(dir_path.split('/')[:-1]) + '/data/document.txt'

with open(data_path, 'r') as f:
    data = json.load(f)

objects = data['poll']

sentences = []

def save(text):
	if not os.path.exists(document_path):
		with open(document_path, 'w') as text_file:
			text_file.write(text)
	else:
		with open(document_path, 'a') as text_file:
			text_file.write(text)

			

def main():
	for key in objects.keys():
		text = objects[key]['text']
		# if not ('analyzed' in objects[key].keys()):
		print ('Analyzing object: ' + key + '                    ', end='\r')
		# print()
		# if objects[key]['url']:
		# 	result = scrape(objects[key]['url'], '', '')
			# if result:
			# 	text += (result.article)
		text = re.sub(r'http\S+', '', text)		# remove urls 
		total = sent_tokenize(text)
		for sent in total:
			word_vec = [w.lower() for w in tokenizer.tokenize(sent) if not w in stop_words]
			sentences.append(word_vec)
		# for sent in sent_tokenize(text):
		# 	word_vec = tokenizer.tokenize(sent)
		# 	document.append(word_vec)
	print ('\nbeginning to trail model with {} sentences'.format(len(sentences)))
	model = Word2Vec( 	sentences,
				        size=150,
				        window=10,
				        min_count=2,
				        workers=10)
	model.train(sentences, total_examples=len(sentences), epochs=10)

	model.save(base_path + '/model')

	while True:
		inp = input('-----> ')
		w1 = [inp]
		try:
			print(model.wv.most_similar(positive=w1, topn=6))
		except KeyError:
			print ('key {} doesnt exist'.format(inp))




if __name__ == '__main__':
	main()