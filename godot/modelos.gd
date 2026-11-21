class_name Modelos
## Carrega os .glb do site (cópias sem quantização em res://modelos, geradas por preparar_modelos.mjs) e monta peças prontas.
## Mesma escolha de modelos e escalas do site (public/cena3d.js e public/modelos.js).

const ALTURA_PECA := {
	"arvore": 1.7, "arvores": 1.3, "rocha": .45, "lirio": .06, "planta": .35, "caixotes": .5, "saco": .4, "tenda": 1.1, "suporte_armas": .8, "alvo": .9, "carrinho": .55,
	"coluna": 2.2, "coluna_entalhada": 2.2, "entulho": .45, "estandarte_vermelho": 1.6, "estandarte_azul": 1.6, "moedas": .2, "espinhos": 1, "grade": 1, "barreira": .7,
	"barril": .6, "caixote": .45, "caixas": .6, "balde": .25, "lanterna": .16, "velas": .25, "escudo": .65, "escada": 1.7, "cesto": .3,
}
const OBJETOS := {
	"b": ["barril"], "c": ["caixote", "caixas"], "s": ["saco"], "n": ["tenda"], "a": ["suporte_armas"], "o": ["alvo"], "w": ["carrinho", "balde"],
	"M": ["mesa"], "Y": ["mesa_redonda+garrafas", "mesa_redonda+velas", "mesa_redonda+prato", "mesa_redonda+tacas"], "L": ["mesa_longa+tacas", "mesa_longa+prato"],
	"u": ["trono"], "C": ["cadeira"], "U": ["banco"], "A": ["cama"], "E": ["estante"], "R": ["prateleira"], "B": ["bau"], "O": ["bau+moedas"], "Z": ["armario"],
	"K": ["barril_grande"], "G": ["pipa"], "j": ["caixas"], "I": ["coluna"], "J": ["coluna_entalhada"], "X": ["lanterna"], "q": ["cesto"], "V": ["velas"],
	"F": ["estandarte_vermelho"], "H": ["estandarte_azul"], "S": ["escudo"], "$": ["moedas"], "D": ["entulho"], "r": ["barreira"], "W": ["espinhos"], "N": ["grade"], "e": ["escada"],
}
const PLANTAS := {  # letra: [nomes, altura, caber]
	"T": [["normaltree_1", "normaltree_2", "normaltree_3", "normaltree_4", "normaltree_5", "mapletree_1", "birchtree_1"], 2.3, 1.5],
	"P": [["pinetree_1", "pinetree_2", "pinetree_3", "pinetree_5"], 2.6, 1.3],
	"Q": [["deadtree_1", "deadtree_2", "deadtree_3"], 2.0, 1.4],
	"k": [["bush", "bush_flowers", "bush_large", "bush_small"], .6, 1.0],
	"l": [["palmtree_1", "palmtree_2"], 2.5, 1.4],
	"t": [["plant_1", "plant_2"], .55, 1.0],
	"y": [["flower_3_clump", "flower_4_clump", "bush_flowers"], .28, .8],
}
const CRIATURAS := {  # aparencia.criatura → arquivo, altura em metros
	"orc": ["orc", 1.9], "tribal": ["tribal", 1.7], "esqueleto": ["skeleton_warrior", 1.75], "esqueleto_mago": ["skeleton_mage", 1.75],
	"esqueleto_ladino": ["skeleton_rogue", 1.75], "esqueleto_menor": ["skeleton_minion", 1.5], "lobo": ["wolf", 1.0], "raposa": ["fox", .6],
	"cervo": ["deer", 1.5], "touro": ["bull", 1.6], "gosma": ["yeti", 1.2], "demonio": ["demon", 1.9], "demonio_azul": ["blue_demon", 1.9],
	"dragao": ["dragon_evolved", 2.4], "fantasma": ["ghost", 1.4], "sapo": ["frog", .8], "golem": ["goleling", 1.3], "cogumelo": ["mushroom_king", 1.5],
}
const METRO := 1.02 / 1.85  # uma pessoa de 1,85 m tem ~1,02 unidade

static var _cache := {}       # arquivo -> Node3D (original, nunca vai para a cena)
static var _pecas := {}       # nome -> [Node3D, AABB] de natureza/cenário/masmorra
static var _anims: Dictionary  # nome -> Animation (já apontando para Armature/Skeleton3D)


static func cena(rel: String) -> Node3D:
	if _cache.has(rel):
		return _cache[rel]
	var caminho := ProjectSettings.globalize_path("res://modelos/" + rel)
	var n: Node3D = null
	if FileAccess.file_exists(caminho):
		var doc := GLTFDocument.new()
		var st := GLTFState.new()
		if doc.append_from_file(caminho, st) == OK:
			n = doc.generate_scene(st)
	if n == null:
		push_warning("Modelo indisponível: %s (rode node godot/preparar_modelos.mjs)" % rel)
	_cache[rel] = n
	return n


static func _indexar() -> void:
	if not _pecas.is_empty():
		return
	for arq in ["natureza.glb", "cenario.glb", "masmorra.glb"]:
		var raiz := cena(arq)
		if raiz:
			for f in raiz.get_children():
				if f is Node3D:
					_pecas[str(f.name)] = [f, caixa_pai(f)]


## Caixa das malhas de um nó, no espaço do próprio nó (funciona fora da árvore de cena).
static func caixa(raiz: Node3D) -> AABB:
	var total := AABB()
	var primeiro := true
	var nos: Array = [raiz]
	nos.append_array(raiz.find_children("*", "MeshInstance3D", true, false))
	for m in nos:
		if not (m is MeshInstance3D) or m.mesh == null:
			continue
		var t := Transform3D.IDENTITY
		var p: Node = m
		while p != null and p != raiz:
			t = (p as Node3D).transform * t
			p = p.get_parent()
		var c: AABB = t * (m as MeshInstance3D).mesh.get_aabb()
		total = c if primeiro else total.merge(c)
		primeiro = false
	return total


## Caixa pelos ossos (criaturas): a malha com pele vem com a caixa da quantização, que não é o tamanho real.
static func caixa_ossos(raiz: Node3D) -> AABB:
	var esq: Array = raiz.find_children("*", "Skeleton3D", true, false)
	if esq.is_empty():
		return caixa_pai(raiz)
	var sk: Skeleton3D = esq[0]
	var t := raiz.transform
	var p: Node = sk
	var cadeia := Transform3D.IDENTITY
	while p != null and p != raiz:
		cadeia = (p as Node3D).transform * cadeia
		p = p.get_parent()
	var total := AABB(t * cadeia * sk.get_bone_global_rest(0).origin, Vector3.ZERO)
	for i in sk.get_bone_count():
		total = total.expand(t * cadeia * sk.get_bone_global_rest(i).origin)
	total.size.y *= 1.12  # o osso da cabeça não chega ao topo
	return total


## A mesma caixa, no espaço do pai (inclui a posição/giro/escala do próprio nó).
static func caixa_pai(n: Node3D) -> AABB:
	return n.transform * caixa(n)


## Copia o modelo centrado na casa e com a base no chão; cx vem de caixa_pai(orig).
static func _encaixar(orig: Node3D, cx: AABB, escala: float) -> Node3D:
	var g := Node3D.new()
	var o := orig.duplicate()
	o.transform = orig.transform
	o.position -= Vector3(cx.get_center().x, cx.position.y, cx.get_center().z)
	g.add_child(o)
	g.scale = Vector3.ONE * escala
	return g


static func natureza(nome: String, altura: float, caber := 1.0) -> Node3D:
	_indexar()
	if not _pecas.has(nome):
		return null
	var cx: AABB = _pecas[nome][1]
	var s := minf(altura / maxf(cx.size.y, .001), caber / maxf(maxf(cx.size.x, cx.size.z), .001))
	return _encaixar(_pecas[nome][0], cx, s)


static func objeto(nome: String, caber := 1.0) -> Node3D:
	# Poly Haven (texturas reais, em metros) quando existe; senão KayKit ajustado pela altura
	var ph := cena("objetos/%s.glb" % nome) if FileAccess.file_exists(ProjectSettings.globalize_path("res://modelos/objetos/%s.glb" % nome)) else null
	if ph:
		var c := caixa_pai(ph)
		return _encaixar(ph, c, minf(.55, caber * 1.4 / maxf(maxf(c.size.x, c.size.z), .001)))
	_indexar()
	var chave := nome
	if not _pecas.has(chave):
		for k in _pecas:
			if str(k).begins_with(nome):
				chave = k
				break
	if not _pecas.has(chave):
		return null
	var cx: AABB = _pecas[chave][1]
	var tipo := nome
	if not ALTURA_PECA.has(tipo):
		tipo = "rocha"
		for k in ALTURA_PECA:
			if nome.begins_with(k):
				tipo = k
				break
	var s := minf(ALTURA_PECA[tipo] / maxf(cx.size.y, .001), caber * .95 / maxf(maxf(cx.size.x, cx.size.z), .001))
	return _encaixar(_pecas[chave][0], cx, s)


## Objeto de uma letra do mapa, com o que vai em cima (ex.: mesa_redonda+velas).
static func objeto_da_letra(g: String, sorteio: float) -> Node3D:
	if not OBJETOS.has(g):
		return null
	var nomes: Array = OBJETOS[g]
	var partes: PackedStringArray = str(nomes[int(sorteio * nomes.size()) % nomes.size()]).split("+")
	var base := objeto(partes[0], 1.0)
	if base == null:
		return null
	for i in range(1, partes.size()):
		var t := objeto(partes[i], .5)
		if t:
			var topo := caixa_pai(base.get_child(0)).end.y
			t.scale /= base.scale.x
			t.position.y = topo
			base.add_child(t)
	return base


# ---------- personagens ----------
static func _animacoes() -> Dictionary:
	if _anims != null and not _anims.is_empty():
		return _anims
	_anims = {}
	var raiz := cena("q/anims.glb")
	if raiz == null:
		return _anims
	var ap: AnimationPlayer = raiz.get_node("AnimationPlayer")
	for nome in ap.get_animation_list():
		var a: Animation = ap.get_animation(nome).duplicate()
		# a biblioteca vem sem pele (ossos viram Node3D): reaponta cada trilha para o osso do Skeleton3D do corpo
		for i in range(a.get_track_count() - 1, -1, -1):
			var caminho := str(a.track_get_path(i))
			if not caminho.begins_with("Armature/"):
				a.remove_track(i)
				continue
			a.track_set_path(i, NodePath("Armature/Skeleton3D:" + caminho.get_file()))
		if nome in ["parado", "andar", "correr", "guarda"]:
			a.loop_mode = Animation.LOOP_LINEAR
		_anims[nome] = a
	return _anims


## Personagem pronto para a cena: humano (corpo do site, tingido pela cor) ou criatura. Devolve [Node3D, AnimationPlayer, nomes{parado, andar}].
static func personagem(o: Dictionary) -> Array:
	var ap_dados: Dictionary = o.get("aparencia", {})
	var ficha = o.get("ficha")
	if ficha is Dictionary and ficha.get("aparencia") is Dictionary:
		ap_dados = ficha.aparencia
	var cor := Color.from_string(str(ap_dados.get("base", o.get("cor", "#e2b04a"))), Color(0.89, 0.69, 0.29))
	if str(o.get("raca", "")) == "criatura" and CRIATURAS.has(str(ap_dados.get("criatura", ""))):
		var d: Array = CRIATURAS[str(ap_dados.criatura)]
		var orig := cena("q/criaturas/%s.glb" % d[0])
		if orig:
			var cx := caixa_ossos(orig)
			var no := _encaixar(orig, cx, d[1] * METRO / maxf(cx.size.y, .001))
			var ap: AnimationPlayer = no.find_children("*", "AnimationPlayer", true, false).front() if no.find_children("*", "AnimationPlayer", true, false).size() else null
			var nomes := {"parado": "", "andar": ""}
			if ap:
				for a in ap.get_animation_list():
					if nomes.parado == "" and str(a).ends_with("Idle"):
						nomes.parado = a
					if nomes.andar == "" and str(a).ends_with("Walk"):
						nomes.andar = a
				for k in nomes:
					if nomes[k] != "":
						ap.get_animation(nomes[k]).loop_mode = Animation.LOOP_LINEAR
			return [no, ap, nomes]
	var sexo := "f" if str(ap_dados.get("sexo", "m")) == "f" else "m"
	var corpo := cena("q/corpo_%s.glb" % sexo)
	if corpo == null:
		return [null, null, {}]
	var cx := caixa_pai(corpo)
	var no := _encaixar(corpo, cx, 1.02 / maxf(cx.size.y, .001))
	var boneco: Node3D = no.get_child(0)
	# shortcut: só o corpo tingido; roupas, cabelo e armas do criador (máscaras de cor) ficam para depois
	var pele := Color.from_string(str(ap_dados.get("pele", "#c99a7a")), Color(0.79, 0.6, 0.48))
	for m in boneco.find_children("*", "MeshInstance3D", true, false):
		var mat := StandardMaterial3D.new()
		var nome := str(m.name)
		mat.albedo_color = Color(0.25, 0.17, 0.1) if nome.contains("Eyebrow") else Color(0.92, 0.92, 0.9) if nome.contains("Eye") else cor.lerp(pele, 0.25)
		mat.roughness = 0.7
		(m as MeshInstance3D).material_override = mat
	var ap := AnimationPlayer.new()
	var lib := AnimationLibrary.new()
	var anims := _animacoes()
	for nome in anims:
		lib.add_animation(nome, anims[nome])
	ap.add_animation_library("", lib)
	boneco.add_child(ap)  # root_node ".." = o boneco, onde fica Armature/Skeleton3D
	return [no, ap, {"parado": "parado" if anims.has("parado") else "", "andar": "andar" if anims.has("andar") else ""}]
