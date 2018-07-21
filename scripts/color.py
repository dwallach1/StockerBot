from sty import fg, rs

r, g, b = 255, 0, 0


words = [['a', -1.0], ['a', -0.9], ['a', -0.8], ['a', -0.7], ['a', -0.6], ['a', -0.5], ['a', -0.4],
	['a', -0.3],['a', -0.2],['a', -0.1],['a', 0.0],['a', 0.1],['a', 0.2],['a', 0.3],['a', 0.4],['a', 0.5],['a', 0.6],
	['a', 0.7],['a', 0.8],['a', 0.9],['a', 1.0]]

to_print = []

for word in words:
	if word[1] < 0.0:
		g = 255 * (1 - abs(word[1]))
	if word[1] == 0.0:
		r, g = 255, 255
	if word[1] > 0.0:
		g = 255
		r *= (1 - word[1])
	# print (r, g, b)
	to_print.append(fg(int(r), int(g), int(b)) + word[0] + fg.rs)


print (' '.join(to_print))