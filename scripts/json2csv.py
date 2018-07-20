import json
import os
import csv
from emoji import UNICODE_EMOJI

def is_emoji(s):
    return s in UNICODE_EMOJI


# print (is_emoji(🔥))
dir_path, file_path = os.path.split(os.path.abspath(__file__))
infile = '/'.join(dir_path.split('/')[:-1]) + '/data/stockerbot-export.json'
outfile = '/'.join(dir_path.split('/')[:-1]) + '/data/stockerbot-export.csv'

stocks_path = '/'.join(dir_path.split('/')[:-1]) + '/data/stocks.csv'
# infile = '../data/stockerbot-export.json'
# outfile = '../data/stockerbot-export.csv'


with open(infile) as f:
    data = json.load(f)

poll_data = data['poll']
search_data = data['search']

# create hashmap for finding company names of data in search data
stocks = {}
stocks['OMG'] = 'Omisego'
stocks['BTC'] = 'Bitcoin'
stocks['ETH'] = 'Etherium'
with open(stocks_path) as csv_file:
	csv_reader = csv.reader(csv_file, delimiter=',')
	i = 0
	for row in csv_reader:
		if i == 0:
			i += 1
		else:
			stocks[row[0]] = row[1].split(',')[0]


header = 'id,text,timestamp,source,symbols,company_names,url,verified\n'
lines = [header]
for d in poll_data:
	key = d
	d = poll_data[d]
	text = d['text'].replace('\n', ' ').replace('\r', '')
	line = key + ',' + text + ',' + d['timestamp'] + ',' + d['source'] + ',' + d['symbols'] + ',' + d['company_names'] + ','+ d['url'] + ',' + str(d['verified']) + '\n';
	lines.append(line)


for d in search_data:
	key = d
	d = search_data[d]
	if d['symbols'][0] == '$': d['symbols'] = d['symbols'][1:]
	if d['symbols'] in stocks.keys():
		d['company_names'] = stocks[d['symbols']]
	text = d['text'].replace('\n', ' ').replace('\r', ' ')

	line = key + ',' + text + ',' + d['timestamp'] + ',' + d['source'] + ',' + d['symbols'] + ',' + d['company_names'] + ','+ d['url'] + ',' + str(d['verified']) + '\n';
	lines.append(line)

with open(outfile, 'w') as f:
    for line in lines:
        f.write(line)