import json
import csv
import os 



dir_path, file_path = os.path.split(os.path.abspath(__file__))
stocks_read_path = '/'.join(dir_path.split('/')[:-1]) + '/data/stocks_cleaned.csv'
stocks_write_path = '/'.join(dir_path.split('/')[:-1]) + '/data/stocks.json'


stocks_dict = {}

with open(stocks_read_path, 'r') as f:
	reader = csv.reader(f, delimiter=',')
	i = 0
	for row in reader:
		if i == 0: i += 1
		else:
			symbol, name = row[0], row[1]
			stocks_dict[symbol] = name


with open(stocks_write_path, 'w') as f:
    json.dump(stocks_dict, f, sort_keys = True, indent = 4)