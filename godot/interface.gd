class_name Interface
extends CanvasLayer
## Tela de entrada do piloto e linha de informações durante o jogo. Lembra os campos em user://entrada.cfg.

signal pediu_entrar(servidor: String, apelido: String, token: String, codigo: String, senha: String)
signal pediu_mover

const CAMPOS := [
	["servidor", "Servidor", "http://127.0.0.1:8787", false],
	["apelido", "Apelido (se não colar o token)", "", false],
	["token", "Token do site (opcional: para usar o seu personagem)", "", true],
	["codigo", "Código da Sessão", "", false],
	["senha", "Senha da Sessão", "", true],
]

var fundo: CenterContainer
var campos := {}
var aviso: Label
var info: Label
var mover: Button   # 👣 Mover: liga a escolha da casa de destino
var dica: Label     # contador de casas ao lado do mouse


func _ready() -> void:
	var cfg := ConfigFile.new()
	cfg.load("user://entrada.cfg")

	fundo = CenterContainer.new()
	fundo.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	fundo.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(fundo)
	var painel := PanelContainer.new()
	fundo.add_child(painel)
	var m := MarginContainer.new()
	for lado in ["left", "right", "top", "bottom"]:
		m.add_theme_constant_override("margin_" + lado, 18)
	painel.add_child(m)
	var v := VBoxContainer.new()
	v.custom_minimum_size = Vector2(440, 0)
	m.add_child(v)
	var titulo := Label.new()
	titulo.text = "Mesa de Arkahad — piloto Godot"
	titulo.add_theme_font_size_override("font_size", 22)
	v.add_child(titulo)
	for c in CAMPOS:
		var l := Label.new()
		l.text = c[1]
		v.add_child(l)
		var e := LineEdit.new()
		e.text = cfg.get_value("entrada", c[0], c[2]) if c[0] != "senha" else ""
		e.secret = c[3]
		v.add_child(e)
		campos[c[0]] = e
	var b := Button.new()
	b.text = "Entrar"
	b.pressed.connect(_entrar)
	v.add_child(b)
	aviso = Label.new()
	aviso.autowrap_mode = TextServer.AUTOWRAP_WORD
	aviso.modulate = Color(1, .8, .5)
	v.add_child(aviso)

	info = Label.new()
	info.position = Vector2(12, 10)
	info.add_theme_color_override("font_shadow_color", Color.BLACK)
	info.visible = false
	add_child(info)

	mover = Button.new()
	mover.text = "👣 Mover"
	mover.toggle_mode = true
	mover.focus_mode = Control.FOCUS_NONE
	mover.custom_minimum_size = Vector2(130, 44)
	mover.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM)
	mover.position.y -= 16
	mover.visible = false
	mover.pressed.connect(func(): pediu_mover.emit())
	add_child(mover)

	dica = Label.new()
	dica.add_theme_color_override("font_shadow_color", Color.BLACK)
	dica.add_theme_font_size_override("font_size", 18)
	dica.visible = false
	add_child(dica)


func _entrar() -> void:
	var cfg := ConfigFile.new()
	for k in ["servidor", "apelido", "token", "codigo"]:
		cfg.set_value("entrada", k, campos[k].text)
	cfg.save("user://entrada.cfg")
	pediu_entrar.emit(campos.servidor.text, campos.apelido.text, campos.token.text, campos.codigo.text, campos.senha.text)


func mostrar_entrada(texto: String) -> void:
	fundo.visible = true
	info.visible = false
	mover.visible = false
	dica.visible = false
	aviso.text = texto


func mostrar_jogo(texto: String) -> void:
	fundo.visible = false
	info.visible = true
	mover.visible = true
	info.text = texto


func mostrar_dica(texto: String, onde: Vector2) -> void:
	dica.text = texto
	dica.position = onde + Vector2(18, -8)
	dica.visible = texto != ""


func avisar(texto: String) -> void:
	if fundo.visible:
		aviso.text = texto
	else:
		info.text = info.text.get_slice("\n", 0) + "\n" + texto
