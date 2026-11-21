class_name Rede
extends Node
## Conversa com o mesmo servidor do site (src/worker.js): login por apelido ou token, WebSocket da Sessão.

signal mensagem(msg: Dictionary)
signal status(texto: String)

var servidor := "http://localhost:8787"
var token := ""
var senha := ""
var ws := WebSocketPeer.new()
var aberto := false


func entrar(url: String, apelido: String, token_colado: String, codigo: String, senha_sessao: String) -> void:
	# o Godot tenta localhost pelo IPv6 e o wrangler dev só responde no IPv4: a conexão ficaria parada em "conectando"
	servidor = url.strip_edges().trim_suffix("/").replace("://localhost", "://127.0.0.1")
	senha = senha_sessao
	token = token_colado.strip_edges()
	if token == "":
		status.emit("Entrando…")
		var http := HTTPRequest.new()
		add_child(http)
		var err := http.request(servidor + "/api/login", ["Content-Type: application/json"], HTTPClient.METHOD_POST, JSON.stringify({"apelido": apelido.strip_edges()}))
		if err != OK:
			http.queue_free()
			status.emit("Não consegui falar com o servidor.")
			return
		var r: Array = await http.request_completed
		http.queue_free()
		var dados = JSON.parse_string((r[3] as PackedByteArray).get_string_from_utf8())
		if r[1] != 200 or not (dados is Dictionary) or not dados.has("token"):
			status.emit("Login recusado: %s" % (dados.get("erro", r[1]) if dados is Dictionary else str(r[0], " / ", r[1])))
			return
		token = dados.token
	# http→ws e https→wss
	var url_ws := servidor.replace("http", "ws") + "/api/salas/%s/ws?token=%s" % [codigo.strip_edges().to_upper(), token.uri_encode()]
	ws = WebSocketPeer.new()
	ws.inbound_buffer_size = 16 * 1024 * 1024  # o estado completo de um mapa grande passa do padrão de 64 KB
	ws.max_queued_packets = 4096
	if ws.connect_to_url(url_ws) != OK:
		status.emit("Endereço do servidor inválido.")
		return
	status.emit("Conectando à Sessão…")


func enviar(d: Dictionary) -> void:
	if ws.get_ready_state() == WebSocketPeer.STATE_OPEN:
		ws.send_text(JSON.stringify(d))


func _process(_dt: float) -> void:
	ws.poll()
	var st := ws.get_ready_state()
	if st == WebSocketPeer.STATE_OPEN:
		aberto = true
		while ws.get_available_packet_count() > 0:
			var msg = JSON.parse_string(ws.get_packet().get_string_from_utf8())
			if msg is Dictionary:
				if msg.get("tipo") == "senha" and not msg.has("erro") and senha != "":
					enviar({"tipo": "senha", "senha": senha})
				mensagem.emit(msg)
	elif st == WebSocketPeer.STATE_CLOSED and aberto:
		aberto = false
		status.emit("Conexão fechada (%d %s)." % [ws.get_close_code(), ws.get_close_reason()])
