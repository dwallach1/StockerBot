"""
Use raw input to show each tweet as sentence and then classify the sentence as 

	- 'N' for negative
	- 'P' for positive
	- 'X' for netural 
"""
from textblob import TextBlob
import sys
import os
import json

# read in JSON files here 
dir_path, file_path = os.path.split(os.path.abspath(__file__))
data_path = '/'.join(dir_path.split('/')[:-1]) + '/data/stockerbot-export-test.json'
vocab_path ='/'.join(dir_path.split('/')[:-1]) + '/data/vocabulary.json'

with open(data_path, 'r') as f:
    data = json.load(f)


sentences = {}
db = data['poll']

def save():
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


def exit():
	"""
	save the updated JSON object of DB to disk and then quit
	"""
	save()
	sys.exit()




# iterate over json objects in the polling subsection
for key in db.keys():
	text = db[key]['text']
	
	if not ('analyzed' in db[key].keys()):

		blob = TextBlob(text)
		db[key]['analyzed'] = True


		# add tagged sentence to the vocabulary
		for sentence in blob.sentences:
			tag = input(sentence + '\n' + '>').strip().lower()
			if tag == 'exit': exit()
			elif tag == 'save': save()
			elif tag == 'g': continue
			else: sentences[str(sentence)] = tag



		# write the sentences to the vocabulary.json







