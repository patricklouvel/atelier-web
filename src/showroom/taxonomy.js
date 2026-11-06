export const categories=[
 {id:'bagues',name:'Bagues',description:'Des lignes qui accompagnent la main.'},
 {id:'bracelets',name:'Bracelets',description:'Joncs et liens souples, au plus près de soi.'},
 {id:'colliers-pendentifs',name:'Colliers & pendentifs',description:'Un fragment de paysage à porter près du cœur.'},
 {id:'boucles-oreilles',name:'Boucles d’oreilles',description:'Des éclats de lumière autour du visage.'},
];
export function classifyProducts(products,{collection='',type=''}={}){return products.filter(p=>(!collection||p.universe===collection)&&(!type||p.category===type));}
