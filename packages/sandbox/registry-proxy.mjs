import http from "node:http";
import net from "node:net";

const allowedHosts = new Set(["registry.npmjs.org"]);
const port = 3128;

function allowed(hostname) { return allowedHosts.has(hostname.toLowerCase().replace(/\.$/, "")); }

const server = http.createServer((request, response) => {
  let target;
  try { target = new URL(request.url ?? ""); } catch { response.writeHead(400); response.end("Bad proxy request"); return; }
  if (target.protocol !== "http:" || !allowed(target.hostname)) { response.writeHead(403); response.end("Registry host is not allowed"); return; }
  const headers = { ...request.headers };
  delete headers["proxy-connection"];
  const upstream = http.request({ hostname: target.hostname, port: Number(target.port || 80), path: `${target.pathname}${target.search}`, method: request.method, headers }, (upstreamResponse) => {
    response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
    upstreamResponse.pipe(response);
  });
  upstream.on("error", () => { if (!response.headersSent) response.writeHead(502); response.end(); });
  request.pipe(upstream);
});

server.on("connect", (request, clientSocket, head) => {
  const [hostname, rawPort] = (request.url ?? "").split(":");
  const targetPort = Number(rawPort || 443);
  if (!hostname || !allowed(hostname) || targetPort !== 443) {
    clientSocket.write(`HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n`);
    clientSocket.destroy();
    return;
  }
  const upstream = net.connect(targetPort, hostname, () => {
    clientSocket.write(`HTTP/1.1 200 Connection Established\r\nProxy-Agent: ARQEN-Registry-Proxy\r\n\r\n`);
    if (head.length) upstream.write(head);
    clientSocket.pipe(upstream);
    upstream.pipe(clientSocket);
  });
  upstream.on("error", () => clientSocket.destroy());
  clientSocket.on("error", () => upstream.destroy());
});

server.listen(port, "0.0.0.0", () => console.log(`ARQEN registry proxy listening on ${port}`));
