import http from "node:http";
import net from "node:net";

const allowedHosts = new Set(["registry.npmjs.org"]);
const port = 3128;

function allowed(hostname) {
  return allowedHosts.has(hostname.toLowerCase().replace(/\.$/, ""));
}

function reject(socket, status = 403, message = "Host is not allowed by the sandbox registry policy.") {
  socket.write(`HTTP/1.1 ${status} Forbidden\\r\\nConnection: close\\r\\nContent-Length: ${Buffer.byteLength(message)}\\r\\n\\r\\n${message}`);
  socket.destroy();
}

const server = http.createServer((request, response) => {
  let url;
  try { url = new URL(request.url ?? "", request.headers.host ? `http://${request.headers.host}` : undefined); }
  catch { response.writeHead(400); response.end("Bad proxy request"); return; }
  if (!allowed(url.hostname)) { response.writeHead(403); response.end("Registry host is not allowed"); return; }
  const target = net.connect(url.port ? Number(url.port) : 80, url.hostname);
  target.on("connect", () => {
    const headers = { ...request.headers };
    delete headers["proxy-connection"];
    const upstream = http.request({ hostname: url.hostname, port: url.port ? Number(url.port) : 80, path: `${url.pathname}${url.search}`, method: request.method, headers }, (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    });
    upstream.on("error", () => { if (!response.headersSent) response.writeHead(502); response.end(); });
    request.pipe(upstream);
  });
  target.on("error", () => { if (!response.headersSent) response.writeHead(502); response.end(); });
});

server.on("connect", (request, clientSocket, head) => {
  const [hostname, rawPort] = (request.url ?? "").split(":");
  const targetPort = Number(rawPort || 443);
  if (!hostname || !allowed(hostname) || targetPort !== 443) return reject(clientSocket);
  const upstream = net.connect(targetPort, hostname, () => {
    clientSocket.write("HTTP/1.1 200 Connection Established\\r\\nProxy-Agent: ARQEN-Registry-Proxy\\r\\n\\r\\n");
    if (head.length) upstream.write(head);
    clientSocket.pipe(upstream);
    upstream.pipe(clientSocket);
  });
  upstream.on("error", () => clientSocket.destroy());
  clientSocket.on("error", () => upstream.destroy());
});

server.listen(port, "0.0.0.0", () => console.log(`ARQEN registry proxy listening on ${port}`));
