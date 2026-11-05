const WebSocket = require('ws');

function testWs(name, url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const timeout = setTimeout(() => {
      ws.terminate();
      reject(new Error(`Timeout ao conectar em ${url}`));
    }, 4000);

    ws.on('open', () => {
      clearTimeout(timeout);
      console.log(`[OK] ${name} conectado com sucesso na rota single-port: ${url}`);
      ws.close();
      resolve(true);
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`[ERRO] ${name} falhou em ${url}: ${err.message}`));
    });
  });
}

(async () => {
  try {
    await testWs('Legacy (5173)', 'ws://127.0.0.1:5173/pty');
    await testWs('Casa Nova (5174)', 'ws://127.0.0.1:5174/pty');
    console.log('TODAS AS CONEXÕES WS DE PORTA ÚNICA FUNCIONANDO 100%!');
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();
