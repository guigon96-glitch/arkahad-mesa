extends Node3D
## Piloto: entra numa Sessão do servidor atual, desenha o mapa e move personagens com o clique.
## Câmera: botão direito gira, roda aproxima, WASD/setas andam, F volta para o seu personagem.

var rede := Rede.new()
var ui := Interface.new()
var sol := DirectionalLight3D.new()
var ambiente := Environment.new()
var camera := Camera3D.new()
var mapa_raiz: Node3D
var assinatura_mapa := ""
var pecas := {}          # "pc:id" / "npc:id" -> Node3D
var estado := {}
var meu_id := ""
var selecionada := ""
var movendo := ""          # peça escolhendo a casa de destino (botão Mover)
var alcance := {}          # Vector2i -> custo, casas onde ela chega
var malha_alcance := MeshInstance3D.new()
var malha_rastro := MeshInstance3D.new()

# câmera em órbita
var foco := Vector3.ZERO
var giro := 0.6
var inclinacao := 0.95
var distancia := 14.0
var girando := false


func _ready() -> void:
	add_child(rede)
	add_child(ui)
	rede.mensagem.connect(_mensagem)
	rede.status.connect(ui.avisar)
	ui.pediu_entrar.connect(rede.entrar)
	ui.pediu_mover.connect(_alternar_mover)
	add_child(malha_alcance)
	add_child(malha_rastro)

	# ---- visual Forward+: é aqui que o Godot ganha do navegador ----
	var ceu := ProceduralSkyMaterial.new()
	var sky := Sky.new()
	sky.sky_material = ceu
	ambiente.background_mode = Environment.BG_SKY
	ambiente.sky = sky
	ambiente.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	ambiente.tonemap_mode = Environment.TONE_MAPPER_ACES
	ambiente.tonemap_exposure = 1.0
	ambiente.ssao_enabled = true
	ambiente.ssil_enabled = true
	ambiente.ssr_enabled = true
	ambiente.sdfgi_enabled = true          # luz global em tempo real
	ambiente.glow_enabled = true
	ambiente.volumetric_fog_enabled = true # neblina que a luz atravessa
	ambiente.volumetric_fog_density = 0.003
	var we := WorldEnvironment.new()
	we.environment = ambiente
	add_child(we)

	sol.shadow_enabled = true
	sol.directional_shadow_max_distance = 60.0
	sol.rotation_degrees = Vector3(-50, -35, 0)
	add_child(sol)
	add_child(camera)
	_atualizar_camera()


func _mensagem(msg: Dictionary) -> void:
	match msg.get("tipo"):
		"estado":
			_estado(msg)
		"senha":
			ui.mostrar_entrada("Senha da Sessão incorreta." if msg.has("erro") else "Digite a senha da Sessão e entre de novo.")
		"erro", "aviso":
			ui.avisar(str(msg.get("texto", "")))
		"removida":
			ui.mostrar_entrada("A Sessão foi apagada.")


func _estado(msg: Dictionary) -> void:
	var primeira := estado.is_empty()
	estado = msg
	meu_id = msg.voce.id
	var mesa: Dictionary = msg.mesa
	ui.mostrar_jogo("%s — %s · %s%s\nClique numa peça para escolher, 👣 Mover e clique no chão para andar · botão direito gira · roda aproxima · F foca" % [
		msg.sala.nome, mesa.nome, msg.voce.nome, " (Mestre)" if msg.voce.mestre else ""])

	var assinatura := JSON.stringify([mesa.id, mesa.cols, mesa.rows, mesa.get("grid"), mesa.get("alt"), mesa.get("par")])
	if assinatura != assinatura_mapa:
		assinatura_mapa = assinatura
		if mapa_raiz:
			mapa_raiz.queue_free()
		mapa_raiz = ConstrutorMapa.construir(mesa)
		add_child(mapa_raiz)
		_luz(str(mesa.get("luz", "dia")))
		foco = Vector3(float(mesa.cols) / 2, 0, float(mesa.rows) / 2)

	# peças deste mapa
	var vistos := {}
	for tipo in ["pc", "npc"]:
		var lista: Dictionary = msg.get(tipo + "s", {})
		for id in lista:
			var o: Dictionary = lista[id]
			if o.get("mapa") != mesa.id or o.get("x") == null:
				continue
			var k: String = tipo + ":" + id
			vistos[k] = true
			_peca(k, o, mesa)
	for k in pecas.keys():
		if not vistos.has(k):
			pecas[k].queue_free()
			pecas.erase(k)

	if selecionada == "" or not pecas.has(selecionada):
		selecionada = "pc:" + meu_id if pecas.has("pc:" + meu_id) else ""
	if primeira and selecionada != "":
		foco = pecas[selecionada].position
	_atualizar_camera()
	if movendo != "" and not _posso_mover(movendo):
		_parar_mover()
	elif movendo != "":
		_calcular_alcance()
	ui.mover.set_pressed_no_signal(movendo != "")


func _peca(k: String, o: Dictionary, mesa: Dictionary) -> void:
	var tam := float(o.get("tamanho", 1))
	var x := int(o.x)
	var y := int(o.y)
	var destino := Vector3(x + tam / 2, ConstrutorMapa.altura(mesa, x, y), y + tam / 2)
	var p: Node3D = pecas.get(k)
	if p == null:
		p = Node3D.new()
		var montado := Modelos.personagem(o)
		if montado[0]:
			p.add_child(montado[0])
			p.set_meta("anim", montado[1])
			p.set_meta("nomes", montado[2])
			_animar(p, "parado")
		else:  # reserva: cápsula na cor do personagem
			var corpo := MeshInstance3D.new()
			var capsula := CapsuleMesh.new()
			capsula.radius = 0.28
			capsula.height = 1.02  # pessoa de 1,85 m
			var mat := StandardMaterial3D.new()
			mat.albedo_color = Color.from_string(str(o.get("cor", "#e2b04a")), Color(0.89, 0.69, 0.29))
			mat.roughness = 0.6
			capsula.material = mat
			corpo.mesh = capsula
			corpo.position.y = 0.51
			p.add_child(corpo)
		var nome := Label3D.new()
		nome.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		nome.position.y = 1.35
		nome.font_size = 48
		nome.pixel_size = 0.004
		nome.outline_size = 12
		nome.name = "Nome"
		p.add_child(nome)
		p.position = destino
		add_child(p)
		pecas[k] = p
	p.scale = Vector3.ONE * tam
	(p.get_node("Nome") as Label3D).text = str(o.get("nome", "?")) + ("  ◆" if k == selecionada else "")
	if p.position.distance_to(destino) > 0.01:
		var plano := Vector2(destino.x - p.position.x, destino.z - p.position.z)
		if plano.length() > 0.01:
			p.rotation.y = atan2(plano.x, plano.y)  # vira para onde vai
		_animar(p, "andar")
		var tw := create_tween()
		tw.tween_property(p, "position", destino, clampf(plano.length() * 0.35, 0.25, 3.0))
		tw.tween_callback(_animar.bind(p, "parado"))


func _animar(p: Node3D, qual: String) -> void:
	var ap: AnimationPlayer = p.get_meta("anim", null)
	var nome: String = p.get_meta("nomes", {}).get(qual, "")
	if ap and nome != "" and ap.current_animation != nome:
		ap.play(nome, 0.2)


func _luz(luz: String) -> void:
	match luz:
		"noite":
			sol.light_color = Color(0.45, 0.5, 0.75)
			sol.light_energy = 0.25
			ambiente.background_energy_multiplier = 0.08
		"azul":
			sol.light_color = Color(0.4, 0.55, 1.0)
			sol.light_energy = 0.45
			ambiente.background_energy_multiplier = 0.2
		"conjuncao":
			sol.light_color = Color(1.0, 0.55, 0.45)
			sol.light_energy = 0.8
			ambiente.background_energy_multiplier = 0.5
		_:
			sol.light_color = Color(1.0, 0.95, 0.85)
			sol.light_energy = 1.3
			ambiente.background_energy_multiplier = 1.0


# ---------- entrada: câmera e clique ----------
func _unhandled_input(e: InputEvent) -> void:
	if e is InputEventMouseButton:
		if e.button_index == MOUSE_BUTTON_RIGHT:
			girando = e.pressed
		elif e.pressed and e.button_index == MOUSE_BUTTON_WHEEL_UP:
			distancia = maxf(4.0, distancia * 0.9)
		elif e.pressed and e.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			distancia = minf(60.0, distancia * 1.1)
		elif e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
			_clique(e.position)
		_atualizar_camera()
	elif e is InputEventMouseMotion and girando:
		giro -= e.relative.x * 0.006
		inclinacao = clampf(inclinacao + e.relative.y * 0.006, 0.25, 1.45)
		_atualizar_camera()
	elif e is InputEventMouseMotion and movendo != "":
		_tracar(e.position)
	elif e is InputEventKey and e.pressed and e.keycode == KEY_ESCAPE and movendo != "":
		_parar_mover()
	elif e is InputEventKey and e.pressed and e.keycode == KEY_F and pecas.has(selecionada):
		foco = pecas[selecionada].position
		_atualizar_camera()


func _process(dt: float) -> void:
	var mov := Vector2(
		Input.get_action_strength("ui_right") - Input.get_action_strength("ui_left") + float(Input.is_key_pressed(KEY_D)) - float(Input.is_key_pressed(KEY_A)),
		Input.get_action_strength("ui_down") - Input.get_action_strength("ui_up") + float(Input.is_key_pressed(KEY_S)) - float(Input.is_key_pressed(KEY_W)))
	if mov != Vector2.ZERO:
		foco += Vector3(mov.x, 0, mov.y).rotated(Vector3.UP, giro) * dt * distancia * 0.8
		_atualizar_camera()


func _atualizar_camera() -> void:
	var dir := Vector3(sin(giro) * cos(inclinacao), sin(inclinacao), cos(giro) * cos(inclinacao))
	camera.position = foco + dir * distancia
	camera.look_at(foco, Vector3.UP)


func _clique(tela: Vector2) -> void:
	if estado.is_empty():
		return
	var achada = _casa_na_tela(tela)
	if achada == null:
		return
	var casa: Vector2i = achada
	# clicou numa peça? escolhe (o servidor decide se você pode movê-la)
	for k in pecas:
		var o: Dictionary = estado[("pcs" if k.begins_with("pc:") else "npcs")][k.get_slice(":", 1)]
		var tam := int(o.get("tamanho", 1))
		if Rect2i(int(o.x), int(o.y), tam, tam).has_point(casa):
			if movendo != "":
				_parar_mover()
			selecionada = k
			_estado(estado)
			return
	if movendo != "":
		if not alcance.has(casa):
			ui.avisar("Fora do seu Deslocamento.")
			return
		rede.enviar({"tipo": "mover", "k": movendo, "x": casa.x, "y": casa.y})
		_parar_mover()
	elif selecionada != "":
		if _em_combate():
			ui.avisar("Para andar, aperte 👣 Mover.")
		else:
			rede.enviar({"tipo": "mover", "k": selecionada, "x": casa.x, "y": casa.y})


func _casa_na_tela(tela: Vector2):
	var de := camera.project_ray_origin(tela)
	var ate := de + camera.project_ray_normal(tela) * 500.0
	var acerto := get_world_3d().direct_space_state.intersect_ray(PhysicsRayQueryParameters3D.create(de, ate))
	if acerto.is_empty():
		return null
	var ponto: Vector3 = acerto.position - acerto.normal * 0.01
	return Vector2i(floori(ponto.x), floori(ponto.z))


# ---------- Mover: 1 ação = Deslocamento inteiro, dividido no turno; passar do que resta gasta outra ação ----------
func _objeto(k: String) -> Dictionary:
	return estado.get("pcs" if k.begins_with("pc:") else "npcs", {}).get(k.get_slice(":", 1), {})


func _em_combate() -> bool:
	return bool(estado.get("mesa", {}).get("combate", {}).get("ativo", false))


func _chave_turno() -> String:
	var cb: Dictionary = estado.mesa.get("combate", {})
	return "%d:%d" % [int(cb.get("rodada", 1)), int(cb.get("turno", 0))]


func _vez(k: String) -> bool:
	var cb: Dictionary = estado.mesa.get("combate", {})
	var ordem: Array = cb.get("ordem", [])
	var t := int(cb.get("turno", 0))
	return t < ordem.size() and ordem[t].get("k") == k


func _resta(o: Dictionary) -> float:
	var m = o.get("mov")
	return float(m.resta) if m is Dictionary and m.get("chave") == _chave_turno() else 0.0


func _acoes_livres(o: Dictionary) -> int:
	var a = o.get("acoes")
	return 3 - (int(a.usadas) if a is Dictionary and a.get("chave") == _chave_turno() else 0)


func _desloc(o: Dictionary) -> float:
	return maxf(1.0, float(o.get("desloc", 6)))  # shortcut: ignora condições (lento etc.); o servidor corrige


func _posso_mover(k: String) -> bool:
	var o := _objeto(k)
	if o.is_empty() or not pecas.has(k):
		return false
	if not estado.voce.mestre and k != "pc:" + meu_id:
		return false
	if not _em_combate():
		return true
	return _vez(k) and (_resta(o) > 0.0 or _acoes_livres(o) > 0)


func _alternar_mover() -> void:
	if movendo != "":
		_parar_mover()
		return
	if selecionada == "" or not _posso_mover(selecionada):
		ui.mover.set_pressed_no_signal(false)
		ui.avisar("Aguarde o turno (ou acabaram as ações)." if _em_combate() else "Escolha uma peça sua.")
		return
	movendo = selecionada
	ui.mover.set_pressed_no_signal(true)
	ui.mover.text = "✖ Parar de mover"
	_calcular_alcance()


func _parar_mover() -> void:
	movendo = ""
	alcance = {}
	malha_alcance.mesh = null
	malha_rastro.mesh = null
	ui.mover.set_pressed_no_signal(false)
	ui.mover.text = "👣 Mover"
	ui.mostrar_dica("", Vector2.ZERO)


func _calcular_alcance() -> void:
	var o := _objeto(movendo)
	var ocupadas := {}
	for k in pecas:
		if k == movendo:
			continue
		var p := _objeto(k)
		var tam := int(p.get("tamanho", 1))
		for i in tam:
			for j in tam:
				ocupadas[Vector2i(int(p.x) + i, int(p.y) + j)] = true
	var limite := 9999.0
	if _em_combate():
		limite = _resta(o) + maxi(0, _acoes_livres(o)) * _desloc(o)
	alcance = Movimento.dijkstra(estado.mesa, ocupadas, int(o.x), int(o.y), limite)
	alcance.erase(Vector2i(int(o.x), int(o.y)))
	malha_alcance.mesh = _casas(alcance.keys(), Color(1.0, 0.8, 0.2, 0.35), 0.03)
	malha_rastro.mesh = null


## caminho até a casa sob o mouse + contador de casas (e de ações que o passo gasta)
func _tracar(tela: Vector2) -> void:
	var achada = _casa_na_tela(tela)
	if achada == null or not alcance.has(achada):
		malha_rastro.mesh = null
		ui.mostrar_dica("Fora do alcance" if achada != null else "", tela)
		return
	var casa: Vector2i = achada
	var o := _objeto(movendo)
	var dist := alcance.duplicate()
	dist[Vector2i(int(o.x), int(o.y))] = 0.0
	malha_rastro.mesh = _casas(Movimento.caminho(estado.mesa, dist, casa), Color(1, 1, 1, 0.6), 0.045)
	var custo: float = alcance[casa]
	var texto := "%s %s" % [str(snappedf(custo, 0.1)).replace(".", ","), "casa" if custo == 1.0 else "casas"]
	if _em_combate():
		var resta := _resta(o)
		var n := 0 if custo <= resta else ceili((custo - resta) / _desloc(o))
		texto += "\n" + ("sem gastar ação" if n == 0 else "gasta %d %s" % [n, "ação" if n == 1 else "ações"])
	ui.mostrar_dica(texto, tela)


## quadrados translúcidos sobre as casas, na altura do chão
func _casas(lista: Array, cor: Color, sobe: float) -> ArrayMesh:
	if lista.is_empty():
		return null
	var mesa: Dictionary = estado.mesa
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var borda := Color(cor.r, cor.g, cor.b, minf(1.0, cor.a * 2.6))
	for c in lista:
		var h := ConstrutorMapa.altura(mesa, c.x, c.y) + sobe
		# miolo translúcido + moldura forte, como o alcance das habilidades no site
		_retangulo(st, c.x + 0.1, c.y + 0.1, c.x + 0.9, c.y + 0.9, h, cor)
		_retangulo(st, c.x + 0.04, c.y + 0.04, c.x + 0.96, c.y + 0.1, h, borda)
		_retangulo(st, c.x + 0.04, c.y + 0.9, c.x + 0.96, c.y + 0.96, h, borda)
		_retangulo(st, c.x + 0.04, c.y + 0.1, c.x + 0.1, c.y + 0.9, h, borda)
		_retangulo(st, c.x + 0.9, c.y + 0.1, c.x + 0.96, c.y + 0.9, h, borda)
	var malha := st.commit()
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	mat.vertex_color_use_as_albedo = true
	mat.render_priority = 1
	malha.surface_set_material(0, mat)
	return malha


func _retangulo(st: SurfaceTool, x0: float, z0: float, x1: float, z1: float, h: float, cor: Color) -> void:
	st.set_color(cor)
	for v in [Vector3(x0, h, z0), Vector3(x1, h, z0), Vector3(x1, h, z1), Vector3(x0, h, z0), Vector3(x1, h, z1), Vector3(x0, h, z1)]:
		st.add_vertex(v)

