// Aceita a fila, bane e trava campeão por prioridade, pela API local do cliente do LoL (LCU).
// Uso: node autopick.js   |   teste: node autopick.js --teste
const fs = require('fs'), https = require('https'), path = require('path'), assert = require('assert');

const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

// Escolhe o que fazer na seleção. Retorna { acao, campeao } ou null.
function decidir(s, picks, bans, disponiveis) {
  const eu = s.localPlayerCellId;
  const acoes = (s.actions || []).flat();
  const minha = acoes.find(a => a.actorCellId === eu && a.isInProgress && !a.completed && (a.type === 'pick' || a.type === 'ban'));
  if (!minha) return null;
  const usados = new Set([
    ...acoes.filter(a => a.completed).map(a => a.championId),
    ...(s.bans?.myTeamBans || []), ...(s.bans?.theirTeamBans || []),
    ...(s.theirTeam || []).map(p => p.championId),
  ]);
  // Na hora do ban, não bane o que algum aliado marcou ou declarou que quer.
  const aliados = new Set((s.myTeam || []).filter(p => p.cellId !== eu).flatMap(p => [p.championId, p.championPickIntent]));
  const lista = minha.type === 'pick' ? picks : bans;
  const campeao = lista.find(c => !usados.has(c) && disponiveis.has(c) && (minha.type === 'pick' || !aliados.has(c)));
  return campeao ? { acao: minha, campeao } : null;
}

function lcu(con, metodo, rota, corpo) {
  return new Promise((ok, erro) => {
    const req = https.request({
      host: '127.0.0.1', port: con.porta, path: rota, method: metodo,
      headers: { Authorization: con.auth, 'Content-Type': 'application/json' },
      rejectUnauthorized: false, // o cliente usa certificado autoassinado; só falamos com 127.0.0.1
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { let dados = null; try { dados = JSON.parse(d); } catch {} ok({ status: res.statusCode, dados }); });
    });
    req.on('error', erro);
    req.end(corpo ? JSON.stringify(corpo) : undefined);
  });
}

async function principal() {
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
  let con = null, picks = [], bans = [], ultimo = '';
  const falhas = new Set();
  const status = t => { if (t !== ultimo) console.log(new Date().toLocaleTimeString(), t); ultimo = t; };

  for (;;) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      if (!con) {
        const [, , porta, senha] = fs.readFileSync(path.join(cfg.pastaLol, 'lockfile'), 'utf8').split(':');
        con = { porta, auth: 'Basic ' + Buffer.from('riot:' + senha).toString('base64') };
        const lista = (await lcu(con, 'GET', '/lol-game-data/assets/v1/champion-summary.json')).dados || [];
        const ids = new Map(lista.flatMap(c => [[norm(c.name), c.id], [norm(c.alias), c.id]]));
        const converter = nomes => nomes.map(n => ids.get(norm(n)) ?? (console.log('Campeão desconhecido no config:', n), 0)).filter(Boolean);
        picks = converter(cfg.picks); bans = converter(cfg.bans);
        status('Conectado ao cliente.');
      }
      const fase = (await lcu(con, 'GET', '/lol-gameflow/v1/gameflow-phase')).dados;
      if (fase === 'ReadyCheck' && cfg.aceitar) { await lcu(con, 'POST', '/lol-matchmaking/v1/ready-check/accept'); status('Partida aceita.'); continue; }
      if (fase !== 'ChampSelect') { status('Fase: ' + fase); continue; }

      const s = (await lcu(con, 'GET', '/lol-champ-select/v1/session')).dados;
      if (!s) continue;
      const tipo = (s.actions || []).flat().find(a => a.actorCellId === s.localPlayerCellId && a.isInProgress && !a.completed)?.type;
      const rota = tipo === 'ban' ? '/lol-champ-select/v1/bannable-champion-ids' : '/lol-champ-select/v1/pickable-champion-ids';
      const disp = new Set((await lcu(con, 'GET', rota)).dados || []);
      const d = decidir(s, picks, bans.filter(b => !falhas.has(b)), disp);
      if (!d) { status('Seleção de campeões: esperando a vez.'); continue; }
      const r = await lcu(con, 'PATCH', '/lol-champ-select/v1/session/actions/' + d.acao.id, { championId: d.campeao, completed: true });
      if (r.status >= 400) { falhas.add(d.campeao); console.log('Falhou', d.acao.type, d.campeao, r.status); }
      else status((d.acao.type === 'ban' ? 'Banido: ' : 'Travado: ') + d.campeao);
    } catch {
      con = null; // cliente fechou ou reiniciou: relê o lockfile (porta e senha mudam)
      status('Esperando o cliente do LoL abrir...');
    }
  }
}

if (process.argv.includes('--teste')) {
  const todos = new Set([1, 2, 3, 4, 5]);
  const base = { localPlayerCellId: 0, myTeam: [{ cellId: 0 }, { cellId: 1, championPickIntent: 3 }], theirTeam: [], bans: {} };
  const ban = { ...base, actions: [[{ id: 7, actorCellId: 0, type: 'ban', isInProgress: true, completed: false }]] };
  assert.strictEqual(decidir(ban, [], [3, 4], todos).campeao, 4, 'pula o que o aliado quer');
  const pick = { ...base, bans: { theirTeamBans: [1] }, actions: [[{ actorCellId: 1, type: 'pick', completed: true, championId: 2 }], [{ id: 9, actorCellId: 0, type: 'pick', isInProgress: true, completed: false }]] };
  assert.strictEqual(decidir(pick, [1, 2, 3], [], todos).campeao, 3, 'pula banido e já escolhido');
  assert.strictEqual(decidir(pick, [1, 2, 3], [], new Set([1, 2])), null, 'só campeões que você tem');
  assert.strictEqual(decidir({ ...pick, actions: [] }, [3], [], todos), null, 'não age fora da vez');
  console.log('ok');
} else principal();
