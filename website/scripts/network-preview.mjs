// Local-only QA proxy: lose one upload acknowledgement, then allow its retry.
import http from 'node:http';
let dropAcknowledgement = true;
http.createServer((request,response)=>{
 const upstream=http.request({hostname:'::1',port:5177,path:request.url,method:request.method,headers:request.headers}, incoming=>{
  if(dropAcknowledgement && request.method==='POST' && /^\/api\/attempts\/[^/]+$/.test(request.url) && incoming.statusCode===201) {
   dropAcknowledgement=false; incoming.resume(); incoming.on('end',()=>{response.destroy();console.log('Dropped one completed upload acknowledgement. Retries now pass through.');});return;
  }
  response.writeHead(incoming.statusCode,incoming.headers);incoming.pipe(response);
 });
 upstream.on('error',()=>{if(!response.headersSent)response.writeHead(502);response.end('Local preview unavailable');});
 request.pipe(upstream);
}).listen(5179,'::1',()=>console.log('Local network-loss check: http://localhost:5179/c/prosepreview'));
