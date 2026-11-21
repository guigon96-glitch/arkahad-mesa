class_name Movimento
## Mesma conta de movimento do site (public/regras.js: custoCel, custoSubida, dijkstra), só para a prévia.
## Quem decide de verdade é o servidor.

# custo de andar por casa; letras fora daqui custam 1 (igual a TERRENOS['.']). Igual a TERRENOS em regras.js.
const CUSTO := {",": 2.0, "\"": 2.0, "~": 3.0, "v": 2.0, "h": 3.0, "k": 2.0, "t": 2.0, "C": 2.0, "U": 2.0, "q": 2.0, "V": 2.0, "D": 3.0, "r": 3.0, "W": 3.0}
const BLOQUEIA := "#mfdPQT^*bcsnaowlMYLuAERBOZKGjIJXFHSegipz!%"
const PAREDES := "#mfh+dgipz!%"


static func custo_cel(mesa: Dictionary, x: int, y: int) -> float:
	if x < 0 or y < 0 or x >= int(mesa.cols) or y >= int(mesa.rows):
		return INF
	var c := ConstrutorMapa.letra(mesa.get("par", []), x, y)
	if not PAREDES.contains(c) or c == "":
		c = ConstrutorMapa.letra(mesa.grid, x, y)
	if BLOQUEIA.contains(c):
		return INF
	return CUSTO.get(c, 1.0)


static func custo_subida(mesa: Dictionary, x: int, y: int, nx: int, ny: int) -> float:
	var d := ConstrutorMapa.nivel(mesa, nx, ny) - ConstrutorMapa.nivel(mesa, x, y)
	var o := ConstrutorMapa.letra(mesa.grid, x, y)
	var n := ConstrutorMapa.letra(mesa.grid, nx, ny)
	# a rampa/escada é a casa mais alta do par
	if (n == "/" and d > 0) or (o == "/" and d < 0):
		return INF if absi(d) >= 2 else 0.0
	if (n == "|" and d > 0) or (o == "|" and d < 0):
		return INF if absi(d) >= 3 else (1.0 if d > 0 else 0.0)
	if absi(d) >= 2:
		return INF
	return 1.0 if d == 1 else 0.0


## Vector2i -> custo até lá, sem passar de `limite`
static func dijkstra(mesa: Dictionary, ocupadas: Dictionary, sx: int, sy: int, limite: float) -> Dictionary:
	var dist := {Vector2i(sx, sy): 0.0}
	var fila := [[0.0, Vector2i(sx, sy)]]
	while not fila.is_empty():
		fila.sort_custom(func(a, b): return a[0] < b[0])
		var atual: Array = fila.pop_front()
		var d: float = atual[0]
		var p: Vector2i = atual[1]
		if d > dist.get(p, INF):
			continue
		for dx in [-1, 0, 1]:
			for dy in [-1, 0, 1]:
				if dx == 0 and dy == 0:
					continue
				var q := Vector2i(p.x + dx, p.y + dy)
				var c := custo_cel(mesa, q.x, q.y)
				if is_inf(c):
					continue  # fora do mapa ou bloqueada (antes de olhar a altura, que não aceita índice negativo)
				c += custo_subida(mesa, p.x, p.y, q.x, q.y)
				if is_inf(c):
					continue
				if dx != 0 and dy != 0 and (is_inf(custo_cel(mesa, p.x + dx, p.y)) or is_inf(custo_cel(mesa, p.x, p.y + dy))):
					continue
				var nd := d + c * (1.5 if dx != 0 and dy != 0 else 1.0)
				if nd > limite or ocupadas.has(q) or nd >= dist.get(q, INF):
					continue
				dist[q] = nd
				fila.append([nd, q])
	return dist


## casas do caminho (destino até a saída) refeito a partir das distâncias
static func caminho(mesa: Dictionary, dist: Dictionary, destino: Vector2i) -> Array:
	if not dist.has(destino):
		return []
	var casas := [destino]
	var p := destino
	while dist[p] > 0.0:
		var achou := false
		for dx in [-1, 0, 1]:
			for dy in [-1, 0, 1]:
				var q := Vector2i(p.x + dx, p.y + dy)
				if achou or (dx == 0 and dy == 0) or not dist.has(q):
					continue
				var passo := (custo_cel(mesa, p.x, p.y) + custo_subida(mesa, q.x, q.y, p.x, p.y)) * (1.5 if dx != 0 and dy != 0 else 1.0)
				if absf(dist[q] + passo - dist[p]) < 0.001:
					p = q
					achou = true
		if not achou:
			break
		casas.append(p)
	return casas
