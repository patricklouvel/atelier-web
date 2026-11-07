// Only media explicitly attached to the public catalogue belong here.
// Workshop files and signed private URLs must never be used as public media.
export function productImages(product) {
 const configured=product.gallery?.length?product.gallery:[
  {src:product.image,alt:product.name,caption:'Le bijou'},
  {src:product.detail,alt:`Univers de ${product.name}`,caption:'L’univers de la collection'},
 ];
 const seen=new Set();
 return configured.flatMap((image,index)=>{
  const entry=typeof image==='string'?{src:image}:image;
  if(!entry?.src||seen.has(entry.src))return [];
  seen.add(entry.src);
  return [{...entry,alt:entry.alt||`${product.name} — vue ${index+1}`,caption:entry.caption||`Vue ${index+1}`}];
 });
}

export function productModel(product) {
 if(!product.model?.url)return null;
 return {...product.model,name:product.model.name||product.model.url.split('?')[0].split('/').pop()};
}
