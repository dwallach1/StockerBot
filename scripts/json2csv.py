import json
import csv



infile = '../data/stockerbot-export.json'
outfile = '../data/stockerbot-export.csv'


with open(infile) as f:
    data = json.load(f)


# print (data.keys())

header = 'id,text,timestamp,source,symbols,company_names,url\n'

lines = [header]
for d in data:
	key = d
	d = data[d]
	line = key + ',' + d['text'] + ',' + d['timestamp'] + ',' + d['soure'] + ',' + d['symbols'] + ',' + d['company_names'] + ','+ d['url'] + '\n';
	lines.append(line)

with open(outfile, 'w') as f:
    for line in lines:
        f.write(line)