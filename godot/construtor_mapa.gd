class_name ConstrutorMapa
## Transforma o mapa do servidor (grid, alt, par) em 3D: chão em degraus com colisão, água, paredes e objetos.
## shortcut: objetos são formas simples coloridas; a próxima etapa é trocar pelos .glb (Quaternius/KayKit).

const NIVEL_H := 0.6  # igual a public/terreno.js

const COR_CHAO := {
	"\"": Color(0.30, 0.47, 0.18), ".": Color(0.42, 0.32, 0.20), ",": Color(0.80, 0.71, 0.48),
	"_": Color(0.52, 0.52, 0.55), "=": Color(0.47, 0.31, 0.17), "v": Color(0.07, 0.07, 0.10),
	"~": Color(0.55, 0.48, 0.32), "y": Color(0.34, 0.50, 0.20), "t": Color(0.27, 0.43, 0.16),
	"N": Color(0.35, 0.35, 0.38), "$": Color(0.42, 0.32, 0.20),
}
const PAREDE := {  # altura, espessura, cor
	"#": [1.6, 1.0, Color(0.46, 0.45, 0.43)], "m": [1.4, 0.8, Color(0.40, 0.27, 0.14)],
	"h": [0.5, 1.0, Color(0.50, 0.48, 0.45)], "f": [0.6, 0.15, Color(0.45, 0.31, 0.17)],
	"d": [1.4, 0.3, Color(0.35, 0.22, 0.11)],
}


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

	var chao := SurfaceTool.new()
	chao.begin(Mesh.PRIMITIVE_TRIANGLES)
	var agua := SurfaceTool.new()
	agua.begin(Mesh.PRIMITIVE_TRIANGLES)
	var tem_agua := false
	var lados := [[Vector2i(1, 0), Vector3(1, 0, 0)], [Vector2i(-1, 0), Vector3(-1, 0, 0)], [Vector2i(0, 1), Vector3(0, 0, 1)], [Vector2i(0, -1), Vector3(0, 0, -1)]]

	for y in rows:
		for x in cols:
			var g := letra(grid, x, y)
			var h := altura(mesa, x, y)
			var ruido := (absi(hash(Vector2i(x, y))) % 100) / 100.0 * 0.08 - 0.04
			var cor: Color = COR_CHAO.get(g, COR_CHAO["."]).lightened(ruido) if ruido > 0 else COR_CHAO.get(g, COR_CHAO["."]).darkened(-ruido)
			_quad(chao, Vector3(x, h, y), Vector3(x + 1, h, y), Vector3(x + 1, h, y + 1), Vector3(x, h, y + 1), Vector3.UP, cor)
			for l in lados:
				var hn := altura(mesa, x + l[0].x, y + l[0].y)
				if hn >= h:
					continue
				var n: Vector3 = l[1]
				var c := Vector3(x + 0.5, 0, y + 0.5) + n * 0.5
				var t := Vector3(-n.z, 0, n.x) * 0.5
				_quad(chao, Vector3(c.x - t.x, h, c.z - t.z), Vector3(c.x + t.x, h, c.z + t.z), Vector3(c.x + t.x, hn, c.z + t.z), Vector3(c.x - t.x, hn, c.z - t.z), n, cor.darkened(0.35))
			if g == "~":
				tem_agua = true
				var ha := h - 0.12
				_quad(agua, Vector3(x, ha, y), Vector3(x + 1, ha, y), Vector3(x + 1, ha, y + 1), Vector3(x, ha, y + 1), Vector3.UP, Color.WHITE)
			var obj := _objeto(g, Vector3(x + 0.5, h, y + 0.5), x, y)
			if obj:
				raiz.add_child(obj)
			var p := letra(par, x, y)
			if PAREDE.has(p):
				raiz.add_child(_parede(p, Vector3(x + 0.5, h, y + 0.5), par, x, y))

	var mat_chao := StandardMaterial3D.new()
	mat_chao.vertex_color_use_as_albedo = true
	mat_chao.roughness = 0.9
	mat_chao.cull_mode = BaseMaterial3D.CULL_DISABLED
	chao.set_material(mat_chao)
	var malha := chao.commit()
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


const SEM_OBJETO := "\".,_=v~+yN$ CUqW"


static func _objeto(g: String, base: Vector3, x: int, y: int) -> Node3D:
	if g in SEM_OBJETO:
		return null
	var n := Node3D.new()
	n.position = base
	n.rotation.y = (absi(hash(Vector2i(y, x))) % 628) / 100.0
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
			var luz := OmniLight3D.new()
			luz.light_color = Color(1.0, 0.6, 0.3)
			luz.light_energy = 2.5 if g == "*" else 1.2
			luz.omni_range = 6.0 if g == "*" else 3.5
			luz.shadow_enabled = g == "*"
			luz.position = Vector3(0, alt + 0.3, 0)
			n.add_child(luz)
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
	return _peca(caixa, d[2], base + Vector3(0, d[0] / 2.0, 0))
