class_name ConstrutorMapa
## Transforma o mapa do servidor (grid, alt, par) em 3D: chão em degraus com colisão, água, paredes e objetos.
## Chão com as texturas do site (uma camada por tipo de terreno, sem a mistura suave das bordas que o site faz).
## shortcut: bordas entre terrenos são retas e as paredes são caixas texturizadas; o site mistura por shader e tem paredes modeladas.

const NIVEL_H := 0.6  # igual a public/terreno.js

# igual a public/terreno.js
const CAMADAS := ["grama", "terra", "areia", "rocha", "calcada", "tabuas", "vidro", "floresta"]
const ASPEREZA := [1.0, 1.0, .95, .92, .9, .85, .45, 1.0]
const ESCALA := [.55, .5, .45, .32, .5, .5, .4, .5]  # repetições por casa
const CAMADA_DE := {"\"": 0, "T": 0, "k": 0, "n": 0, "o": 0, "t": 0, "y": 0, ".": 1, "Q": 1, "m": 1, "h": 1, "*": 1, "b": 1, "c": 1, "s": 1, "w": 1,
	",": 2, "~": 2, "l": 2, "^": 3, "_": 4, "#": 4, "a": 4, "=": 5, "+": 5, "v": 6, "P": 7}
const LEITO := -0.42  # fundo da água abaixo do nível da casa
const PAREDE := {  # altura, espessura, textura
	"#": [1.6, 1.0, "calcada"], "m": [1.4, 0.8, "tabuas"], "h": [0.5, 1.0, "rocha"], "f": [0.6, 0.15, "tabuas"], "d": [1.4, 0.3, "tabuas"],
}

static var _texturas := {}
static var _mats := {}


static func textura(nome: String) -> Texture2D:
	if not _texturas.has(nome):
		var img := Image.load_from_file(ProjectSettings.globalize_path("res://modelos/texturas/%s.jpg" % nome))
		if img:
			img.generate_mipmaps()
		_texturas[nome] = ImageTexture.create_from_image(img) if img else null
	return _texturas[nome]


## Material com textura projetada no mundo (triplanar): serve para o chão, as laterais dos degraus e as paredes.
static func material(camada: String) -> StandardMaterial3D:
	if _mats.has(camada):
		return _mats[camada]
	var i := CAMADAS.find(camada)
	var m := StandardMaterial3D.new()
	m.albedo_texture = textura(camada + "_cor")
	var nrm := textura(camada + "_nrm")
	if nrm:
		m.normal_enabled = true
		m.normal_texture = nrm
	m.vertex_color_use_as_albedo = true
	m.uv1_triplanar = true
	m.uv1_world_triplanar = true
	m.uv1_scale = Vector3.ONE * ESCALA[i]
	m.roughness = ASPEREZA[i]
	m.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	m.cull_mode = BaseMaterial3D.CULL_DISABLED  # os quads do chão são montados à mão, sem garantir o sentido
	_mats[camada] = m
	return m


static func camada_em(grid: Array, x: int, y: int) -> int:
	var g := letra(grid, x, y)
	if CAMADA_DE.has(g):
		return CAMADA_DE[g]
	# mobília não tem chão próprio: usa o piso de uma casa vizinha
	for d in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1), Vector2i(1, 1), Vector2i(-1, -1), Vector2i(1, -1), Vector2i(-1, 1)]:
		var v := letra(grid, x + d.x, y + d.y)
		if CAMADA_DE.has(v):
			return CAMADA_DE[v]
	return 4


static func altura_chao(mesa: Dictionary, grid: Array, x: int, y: int) -> float:
	return altura(mesa, x, y) + (LEITO if letra(grid, x, y) == "~" else 0.0)


static func nivel(mesa: Dictionary, x: int, y: int) -> int:
	var alt: Array = mesa.get("alt", [])
	var linha: String = alt[y] if y < alt.size() else ""
	var c: String = linha[x] if x < linha.length() else "1"
	return clampi(c.unicode_at(0) - 49, -1, 3) if c >= "0" and c <= "4" else 0


static func altura(mesa: Dictionary, x: int, y: int) -> float:
	if x < 0 or y < 0 or x >= int(mesa.cols) or y >= int(mesa.rows):
		return -1.5
	return nivel(mesa, x, y) * NIVEL_H


static func letra(linhas: Array, x: int, y: int) -> String:
	var l: String = linhas[y] if y < linhas.size() else ""
	return l[x] if x < l.length() else " "


static func construir(mesa: Dictionary) -> Node3D:
	var raiz := Node3D.new()
	var cols := int(mesa.cols)
	var rows := int(mesa.rows)
	var grid: Array = mesa.get("grid", [])
	var par: Array = mesa.get("par", [])
	var rot: Array = mesa.get("rot", [])

	var chao := []
	for i in CAMADAS.size():
		var st := SurfaceTool.new()
		st.begin(Mesh.PRIMITIVE_TRIANGLES)
		chao.append(st)
	var usadas := {}
	var agua := SurfaceTool.new()
	agua.begin(Mesh.PRIMITIVE_TRIANGLES)
	var tem_agua := false
	var lados := [[Vector2i(1, 0), Vector3(1, 0, 0)], [Vector2i(-1, 0), Vector3(-1, 0, 0)], [Vector2i(0, 1), Vector3(0, 0, 1)], [Vector2i(0, -1), Vector3(0, 0, -1)]]

	for y in rows:
		for x in cols:
			var g := letra(grid, x, y)
			var h := altura(mesa, x, y)
			var hc := altura_chao(mesa, grid, x, y)
			var cam := camada_em(grid, x, y)
			usadas[cam] = true
			var st: SurfaceTool = chao[cam]
			var cor := Color.WHITE.darkened((absi(hash(Vector2i(x, y))) % 100) / 100.0 * 0.12)  # leve variação entre casas
			_quad(st, Vector3(x, hc, y), Vector3(x + 1, hc, y), Vector3(x + 1, hc, y + 1), Vector3(x, hc, y + 1), Vector3.UP, cor)
			for l in lados:
				var hn := altura_chao(mesa, grid, x + l[0].x, y + l[0].y) if x + l[0].x >= 0 and y + l[0].y >= 0 and x + l[0].x < cols and y + l[0].y < rows else -1.5
				if hn >= hc:
					continue
				var n: Vector3 = l[1]
				var c := Vector3(x + 0.5, 0, y + 0.5) + n * 0.5
				var t := Vector3(-n.z, 0, n.x) * 0.5
				_quad(st, Vector3(c.x - t.x, hc, c.z - t.z), Vector3(c.x + t.x, hc, c.z + t.z), Vector3(c.x + t.x, hn, c.z + t.z), Vector3(c.x - t.x, hn, c.z - t.z), n, cor.darkened(0.25))
			if g == "~":
				tem_agua = true
				var ha := h - 0.12
				_quad(agua, Vector3(x, ha, y), Vector3(x + 1, ha, y), Vector3(x + 1, ha, y + 1), Vector3(x, ha, y + 1), Vector3.UP, Color.WHITE)
			var obj := _objeto(g, Vector3(x + 0.5, h, y + 0.5), x, y, letra(rot, x, y))
			if obj:
				raiz.add_child(obj)
			var p := letra(par, x, y)
			if PAREDE.has(p):
				raiz.add_child(_parede(p, Vector3(x + 0.5, h, y + 0.5), par, x, y))

	var malha := ArrayMesh.new()
	for i in CAMADAS.size():
		if usadas.has(i):
			chao[i].set_material(material(CAMADAS[i]))
			chao[i].commit(malha)
	var mi := MeshInstance3D.new()
	mi.mesh = malha
	raiz.add_child(mi)
	# colisão do chão para o clique virar casa
	var corpo := StaticBody3D.new()
	var forma := CollisionShape3D.new()
	var tri: ConcavePolygonShape3D = malha.create_trimesh_shape()
	tri.backface_collision = true
	forma.shape = tri
	corpo.add_child(forma)
	raiz.add_child(corpo)

	if tem_agua:
		var mat_agua := StandardMaterial3D.new()
		mat_agua.albedo_color = Color(0.10, 0.28, 0.40, 0.72)
		mat_agua.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		mat_agua.metallic = 0.2
		mat_agua.roughness = 0.04
		agua.set_material(mat_agua)
		var ma := MeshInstance3D.new()
		ma.mesh = agua.commit()
		raiz.add_child(ma)
	return raiz


static func _quad(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, d: Vector3, n: Vector3, cor: Color) -> void:
	for v in [a, b, c, a, c, d]:
		st.set_normal(n)
		st.set_color(cor)
		st.add_vertex(v)


static func _material(cor: Color, emissao := 0.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = cor
	m.roughness = 0.85
	if emissao > 0:
		m.emission_enabled = true
		m.emission = cor
		m.emission_energy_multiplier = emissao
	return m


static func _peca(malha: PrimitiveMesh, cor: Color, pos: Vector3, emissao := 0.0) -> MeshInstance3D:
	malha.material = _material(cor, emissao)
	var mi := MeshInstance3D.new()
	mi.mesh = malha
	mi.position = pos
	return mi


const SEM_OBJETO := "\".,_=v~+ "


static func _objeto(g: String, base: Vector3, x: int, y: int, giro: String) -> Node3D:
	if g in SEM_OBJETO:
		return null
	var n := Node3D.new()
	n.position = base
	n.rotation.y = (absi(hash(Vector2i(y, x))) % 628) / 100.0
	if giro >= "0" and giro <= "3":  # o Mestre girou a peça (ferramenta Girar)
		n.rotation.y = -int(giro) * PI / 2
	# modelos do site; as formas simples abaixo ficam de reserva
	var sorteio := (absi(hash(Vector3i(x, y, 7))) % 1000) / 1000.0
	var modelo: Node3D = null
	if Modelos.PLANTAS.has(g):
		var d: Array = Modelos.PLANTAS[g]
		modelo = Modelos.natureza(d[0][int(sorteio * d[0].size()) % d[0].size()], d[1] * (0.85 + sorteio * 0.35), d[2])
	elif g == "^":
		modelo = Modelos.natureza("rock_%d" % (1 + int(sorteio * 5)), 0.55 + sorteio * 0.35)
	else:
		modelo = Modelos.objeto_da_letra(g, sorteio)
	if modelo:
		n.add_child(modelo)
		if g == "X" or g == "V":
			n.add_child(_luz(g, 0.3))
		return n
	match g:
		"T", "P", "Q", "l":
			var tronco := CylinderMesh.new()
			tronco.top_radius = 0.07
			tronco.bottom_radius = 0.11
			tronco.height = 1.2
			n.add_child(_peca(tronco, Color(0.33, 0.22, 0.13), Vector3(0, 0.6, 0)))
			if g == "P":
				var cone := CylinderMesh.new()
				cone.top_radius = 0.0
				cone.bottom_radius = 0.55
				cone.height = 1.7
				n.add_child(_peca(cone, Color(0.13, 0.30, 0.16), Vector3(0, 1.6, 0)))
			elif g != "Q":
				var copa := SphereMesh.new()
				copa.radius = 0.6
				copa.height = 1.0
				n.add_child(_peca(copa, Color(0.20, 0.42, 0.15) if g == "T" else Color(0.28, 0.50, 0.20), Vector3(0, 1.45, 0)))
		"^":
			var pedra := SphereMesh.new()
			pedra.radius = 0.45
			pedra.height = 0.6
			n.add_child(_peca(pedra, Color(0.45, 0.44, 0.42), Vector3(0, 0.2, 0)))
		"k", "t":
			var moita := SphereMesh.new()
			moita.radius = 0.35
			moita.height = 0.45
			n.add_child(_peca(moita, Color(0.22, 0.40, 0.15), Vector3(0, 0.18, 0)))
		"*", "X", "V":
			var chama := SphereMesh.new()
			chama.radius = 0.12 if g == "*" else 0.06
			chama.height = chama.radius * 2
			var alt := 0.15 if g != "X" else 1.2
			n.add_child(_peca(chama, Color(1.0, 0.55, 0.15), Vector3(0, alt, 0), 6.0))
			n.add_child(_luz(g, alt + 0.3))
		"C", "U", "q", "W", "N", "$", "y":
			n.free()
			return null
		_:
			var caixa := BoxMesh.new()
			caixa.size = Vector3(0.7, 0.6, 0.7)
			n.add_child(_peca(caixa, Color(0.48, 0.35, 0.22), Vector3(0, 0.3, 0)))
	return n


static func _parede(p: String, base: Vector3, par: Array, x: int, y: int) -> Node3D:
	var d: Array = PAREDE[p]
	var caixa := BoxMesh.new()
	# paredes finas se esticam na direção dos vizinhos que também são parede
	var horiz := PAREDE.has(letra(par, x - 1, y)) or PAREDE.has(letra(par, x + 1, y))
	var esp: float = d[1]
	caixa.size = Vector3(1.0 if horiz or esp >= 1.0 else esp, d[0], esp if horiz else 1.0)
	caixa.material = material(d[2])
	var mi := MeshInstance3D.new()
	mi.mesh = caixa
	mi.position = base + Vector3(0, d[0] / 2.0, 0)
	return mi


static func _luz(g: String, alt: float) -> OmniLight3D:
	var luz := OmniLight3D.new()
	luz.light_color = Color(1.0, 0.6, 0.3)
	luz.light_energy = 2.5 if g == "*" else 1.2
	luz.omni_range = 6.0 if g == "*" else 3.5
	luz.shadow_enabled = g == "*"
	luz.position = Vector3(0, alt, 0)
	return luz
