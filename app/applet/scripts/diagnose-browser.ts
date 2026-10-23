async function run() {
  const newTabRes = await fetch('http://localhost:9222/json/new?http://localhost:3000/', { method: 'PUT' });
  const tab = await newTabRes.json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);

  let reqId = 1;
  const send = (method: string, params: any = {}) => {
    ws.send(JSON.stringify({ id: reqId++, method, params }));
  };

  ws.onopen = () => {
    send('Runtime.enable');
    send('Console.enable');
    send('Page.enable');
    send('Network.enable');
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data.toString());
    if (msg.method === 'Console.messageAdded') {
      console.log('[BROWSER CONSOLE]', msg.params.message.level, msg.params.message.text);
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      console.log('[BROWSER CONSOLE.' + msg.params.type + ']', ...msg.params.args.map((a: any) => a.value ?? a.description ?? a));
    } else if (msg.method === 'Runtime.exceptionThrown') {
      console.error('[BROWSER UNCAUGHT EXCEPTION]', JSON.stringify(msg.params.exceptionDetails, null, 2));
    } else if (msg.method === 'Network.requestWillBeSent') {
      console.log('[NET REQ]', msg.params.request.url);
    } else if (msg.method === 'Network.responseReceived') {
      console.log('[NET RESP]', msg.params.response.status, msg.params.response.url);
    } else if (msg.method === 'Network.loadingFailed') {
      console.error('[NET FAIL]', msg.params.errorText, msg.params.requestId);
    } else if (msg.result && msg.result.result) {
      console.log('[BROWSER EVAL RESULT]', msg.result.result);
    }
  };

  // Wait 4 seconds
  await new Promise(r => setTimeout(r, 4000));
  send('Runtime.evaluate', {
    expression: 'document.getElementById("root") ? document.getElementById("root").innerHTML : "NO ROOT"',
    returnByValue: true
  });

  await new Promise(r => setTimeout(r, 1500));
  ws.close();
  await fetch(`http://localhost:9222/json/close/${tab.id}`);
  process.exit(0);
}
run();
