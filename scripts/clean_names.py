import csv

stopwords = ['companies', 'inc.', 'holdings', 'trust', 'corporation', 'incorporated', 'sciences', 
			'biosciences', 'international', 'plc', 'llc', '(publ)', 'bancorp', 'corp.', 'group', 'airways', 'technology']

skippers = ['CA', 'NWSA', 'NWS']

tuples = []
with open('../data/stocks.csv') as csv_file:
	csv_reader = csv.reader(csv_file, delimiter=',')
	i = 0
	for row in csv_reader:
		if i == 0:
			i += 1
		else:
			t = (row[0], row[1].split(',')[0])
			tuples.append(t)


csv_file = open('../data/stocks_cleaned.csv', 'w')
headers = 'ticker, name\n'
csv_file.write(headers)


for t in tuples:

	name = []

	words = t[1].split(' ')
	for w in words:
		if w.lower() in stopwords:
			continue
		name.append(w)

	cleaned_name = ' '.join(name)

	if cleaned_name[-4:] == '.com': cleaned_name = cleaned_name[:-4]
	if t[0] in skippers: continue
	line = t[0] + ',' + cleaned_name + '\n'
	csv_file.write(line)