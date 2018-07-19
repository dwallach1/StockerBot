import json
import csv



infile = '../data/stockerbot-export.json'
outfile = '../data/stockerbot-export.csv'


with open(infile) as f:
    data = json.load(f)

poll_data = data['poll']
search_data = data['search']

stocks = {}

header = 'id,text,timestamp,source,symbols,company_names,url\n'
lines = [header]
for d in poll_data:
	key = d
	d = poll_data[d]
	line = key + ',' + d['text'] + ',' + d['timestamp'] + ',' + d['source'] + ',' + d['symbols'] + ',' + d['company_names'] + ','+ d['url'] + ',' + str(d['verified']) + '\n';
	lines.append(line)

	symbols = d['symbols'].split('-')
	names = d['company_names'].split('*')

	i = 0
	for symbol in symbols:
		if not (symbol in stocks.keys()):
			stocks[symbol] = names[i]
		i += 1


for d in search_data:
	key = d
	d = search_data[d]
	if d['symbols'] in stocks.keys():
		d[company_names] = stocks[d[symbols]]
	line = key + ',' + d['text'] + ',' + d['timestamp'] + ',' + d['source'] + ',' + d['symbols'] + ',' + d['company_names'] + ','+ d['url'] + ',' + str(d['verified']) + '\n';
	lines.append(line)

with open(outfile, 'w') as f:
    for line in lines:
        f.write(line)