export function devApiMiddleware(handlers) {
 return async(req,res,next)=>{
  const url=new URL(req.url,'http://localhost');
  const handler=handlers[url.pathname];
  if(!handler){
   if(url.pathname.startsWith('/api/')){res.writeHead(404,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'Service local inconnu.'}));}
   return next();
  }
  res.status=code=>{res.statusCode=code;return res;};
  res.json=data=>{res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));};
  req.query=Object.fromEntries(url.searchParams);
  try{
   if(['POST','PUT','PATCH'].includes(req.method)){
    let size=0;const chunks=[];
    for await(const chunk of req){size+=chunk.length;if(size>128*1024)return res.status(413).json({error:'Requête trop volumineuse.'});chunks.push(chunk);}
    const body=Buffer.concat(chunks).toString('utf8');
    try{req.body=body?JSON.parse(body):{};}catch{return res.status(400).json({error:'Requête JSON invalide.'});}
   }
   await handler(req,res);
  }catch{if(!res.writableEnded)res.status(503).json({error:'Service indisponible. Vérifiez la configuration locale.'});}
 };
}
