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
	ambiente.volumetric_fog_density = 0.008
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
	ui.mostrar_jogo("%s — %s · %s%s\nClique numa peça para escolher, clique no chão para mover · botão direito gira · roda aproxima · F foca" % [
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


func _peca(k: String, o: Dictionary, mesa: Dictionary) -> void:
	var tam := float(o.get("tamanho", 1))
	var x := int(o.x)
	var y := int(o.y)
	var destino := Vector3(x + tam / 2, ConstrutorMapa.altura(mesa, x, y), y + tam / 2)
	var p: Node3D = pecas.get(k)
	if p == null:
		p = Node3D.new()
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
		var tw := create_tween()
		tw.tween_property(p, "position", destino, clampf(p.position.distance_to(destino) * 0.12, 0.15, 1.2))


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
	var de := camera.project_ray_origin(tela)
	var ate := de + camera.project_ray_normal(tela) * 500.0
	var acerto := get_world_3d().direct_space_state.intersect_ray(PhysicsRayQueryParameters3D.create(de, ate))
	if acerto.is_empty():
		return
	var ponto: Vector3 = acerto.position - acerto.normal * 0.01
	var casa := Vector2i(floori(ponto.x), floori(ponto.z))
	# clicou numa peça? escolhe (o servidor decide se você pode movê-la)
	for k in pecas:
		var o: Dictionary = estado[("pcs" if k.begins_with("pc:") else "npcs")][k.get_slice(":", 1)]
		var tam := int(o.get("tamanho", 1))
		if Rect2i(int(o.x), int(o.y), tam, tam).has_point(casa):
			selecionada = k
			_estado(estado)
			return
	if selecionada != "":
		rede.enviar({"tipo": "mover", "k": selecionada, "x": casa.x, "y": casa.y})
