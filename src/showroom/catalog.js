import campaign from './assets/campaign.webp';
import ring from './assets/ring.webp';
import estran from './assets/estran.webp';
import maree from './assets/maree.webp';
import galets from './assets/galets.webp';
import pendentif from './assets/pendentif.webp';
import blainville from './assets/blainville.webp';
import cordon from './assets/cordon.webp';
import landscape from './assets/landscape.webp';
import horizonRing from './assets/horizon-ring.webp';
import horizonCuff from './assets/horizon-cuff.webp';
import miellesBracelet from './assets/mielles-bracelet.webp';
import miellesNecklace from './assets/mielles-necklace.webp';
import miellesDrop from './assets/mielles-drop.webp';
export const images={campaign,ring,estran,maree,galets,pendentif,blainville,cordon,landscape,horizonRing,horizonCuff,miellesBracelet,miellesNecklace,miellesDrop};
export const brand={name:'Cœur de Mielles',joaillier:'JINORIA',signature:'par JINORIA'};
// Public editorial selection only. The complete research audit is internal in research/.
export const universes=[
 {id:'rivages',name:'Rivages',code:'01',theme:'Le mouvement',codes:'Vagues · rubans · entrelacs',line:'Le mouvement devient précieux.',description:'Des vagues d’or, des rubans qui se croisent, des passages de lumière. Rivages suit les mouvements de l’eau, dans des silhouettes souples et entrelacées.',image:campaign},
 {id:'galets',name:'Galets',code:'02',theme:'Les formes libres',codes:'Contours doux · volumes libres · assemblages',line:'La douceur des formes libres.',description:'Des formes arrondies et irrégulières s’assemblent comme des galets recueillis sur la plage. Leurs surfaces polies ou grainées composent un équilibre de matières et de volumes.',image:galets},
 {id:'horizon',name:'Horizon',code:'03',theme:'L’architecture',codes:'Lignes nettes · pierres géométriques · équilibre',line:'Une ligne, un équilibre, un éclat.',description:'Des lignes dessinées, des pierres aux contours géométriques et des compositions structurées. Horizon propose une écriture plus architecturée de la lumière et du paysage.',image:horizonCuff},
 {id:'mielles',name:'Mielles',code:'04',theme:'Les reliefs du paysage',codes:'Sillons · strates · sable et végétation',line:'Le vent dessine la matière.',description:'Des sillons dans l’or, des strates de sable et de lumière, parfois ponctués d’un pavé de pierres. Mielles explore les traces du vent, les reliefs des dunes et les lignes du végétal.',image:miellesBracelet},
];
const catalogue=[
 {id:'bague-rivages',name:'Bague Rivages',category:'Bagues',universe:'rivages',image:ring,detail:campaign,subtitle:'L’or dans le mouvement des vagues.',description:'Des rubans d’or s’entrelacent autour d’une ligne lumineuse. Surfaces polies et grain délicat se répondent, à la manière des traces laissées par la mer.',materials:'Or jaune · pierres bleues et incolores',finish:'Contraste de poli et de texture fine',inspiration:'Les mouvements de l’eau et les lignes de l’estran.'},
 {id:'bracelet-rivages',name:'Bracelet Rivages',category:'Bracelets',subtype:'Bracelet sur cordon',universe:'rivages',image:cordon,detail:campaign,subtitle:'Une vague liée au poignet.',description:'Des lignes d’or se croisent autour d’un ruban de pierres. Le dessin ondulé est prolongé par un lien textile souple.',materials:'Or jaune · pierres bleues et incolores · lien textile',finish:'Rubans polis et surfaces texturées',inspiration:'Le mouvement d’une vague et ses passages de lumière.'},
 {id:'bracelet-galets',name:'Bracelet Galets',category:'Bracelets',subtype:'Bracelet sur cordon',universe:'galets',image:galets,detail:galets,subtitle:'Des formes que le temps a dessinées.',description:'Une succession de formes douces et de textures. Le lien noue les éléments précieux comme autant de fragments de paysage.',materials:'Or jaune · pierres · lien textile',finish:'Poli lumineux et grain de surface',inspiration:'Les galets façonnés par l’eau et le temps.'},
 {id:'bracelet-estran',name:'Bracelet Estran',category:'Bracelets',subtype:'Bracelet sur cordon',universe:'mielles',image:miellesBracelet,detail:estran,subtitle:'Les traces du vent, au poignet.',description:'Un relief fin parcourt l’or, à la rencontre d’un pavé de pierres bleues et lumineuses. La matière raconte les sillons que le vent dessine dans le sable.',materials:'Or jaune · pierres bleues et incolores · lien textile',finish:'Reliefs du sable et pavé de pierres',inspiration:'Les strates de la plage et les reliefs des dunes.'},
 {id:'boucles-maree',name:'Boucles Marée',category:'Boucles d’oreilles',universe:'mielles',image:maree,detail:miellesNecklace,subtitle:'Des strates de lumière.',description:'Une ligne de bleus rencontre des reliefs dorés. Le dessin associe le grain des pierres aux ondulations de la matière, comme un petit paysage en strates.',materials:'Or jaune · pierres bleues et incolores',finish:'Reliefs dorés et pavé de pierres',inspiration:'Le sable sculpté par le vent et la lumière au-dessus des dunes.'},
 {id:'pendentif-ecume',name:'Pendentif Écume',category:'Colliers & pendentifs',universe:'mielles',image:miellesDrop,detail:miellesNecklace,subtitle:'Un fragment de paysage.',description:'Un pavé aux nuances marines rejoint des sillons d’or. La silhouette libre réunit deux matières et deux lumières dans une même création.',materials:'Or jaune · pierres bleues et incolores',finish:'Or poli, sillons et pavé',inspiration:'Les traces du vent et les strates du littoral.'},
 {id:'collier-sillons',name:'Collier Sillons',category:'Colliers & pendentifs',universe:'mielles',image:miellesNecklace,detail:miellesBracelet,subtitle:'Le paysage se déploie.',description:'Des éléments précieux suspendus se succèdent comme les lignes d’une dune. Les reliefs de l’or et les variations du pavé rythment la composition.',materials:'Or jaune · pierres bleues et incolores',finish:'Reliefs du sable, surfaces polies et pavé',inspiration:'Les herbes, les strates et les lignes souples des mielles.'},
 {id:'bague-horizon',name:'Bague Horizon',category:'Bagues',universe:'horizon',image:horizonRing,detail:horizonCuff,subtitle:'L’équilibre d’une ligne.',description:'Des pierres rectangulaires dessinent une composition claire et structurée. Les contours géométriques et l’éclat du métal soulignent une élégance épurée.',materials:'Or jaune · pierres bleues et incolores',finish:'Lignes polies et pierres géométriques',inspiration:'L’équilibre des lignes et les facettes de lumière.'},
 {id:'manchette-horizon',name:'Manchette Horizon',category:'Bracelets',subtype:'Manchette',universe:'horizon',image:horizonCuff,detail:horizonRing,subtitle:'Une architecture de lumière.',description:'Des lignes parallèles encadrent un assemblage de pierres géométriques. Une silhouette ajourée qui met en relation structure, espace et lumière.',materials:'Or jaune · pierres bleues, jaunes et incolores',finish:'Architecture ajourée et poli lumineux',inspiration:'Les lignes, leurs rythmes et les espaces qu’elles dessinent.'},
 {id:'bague-blainville',visibility:'reserve',name:'Bague Blainville',category:'Bagues',universe:null,image:blainville,detail:landscape,subtitle:'La profondeur d’un reflet.',description:'Piste solitaire conservée en réserve, hors des collections définies.',materials:'Métal clair · pierre bleu-vert',finish:'Poli lisse',inspiration:'Recherche solitaire à étudier séparément.'},
];
export const products=catalogue.filter(p=>p.visibility!=='reserve');
export const reservedProducts=catalogue.filter(p=>p.visibility==='reserve');
export const featuredIds=['bague-rivages','bracelet-galets','bracelet-estran','bague-horizon'];
export const featuredProducts=featuredIds.map(id=>products.find(p=>p.id===id));
export function publicProduct(id){return products.find(p=>p.id===id);}
