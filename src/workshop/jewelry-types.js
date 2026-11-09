export const JEWELRY_TYPES=[
 {id:'ring',name:'Bague',category:'Bagues'},
 {id:'bracelet',name:'Bracelet',category:'Bracelets'},
 {id:'necklace',name:'Collier',category:'Colliers & pendentifs'},
 {id:'pendant',name:'Pendentif',category:'Colliers & pendentifs'},
 {id:'earrings',name:'Boucles d’oreilles',category:'Boucles d’oreilles'},
 {id:'other',name:'Autre bijou',category:''},
];
const common=[['width','Largeur (mm)'],['thickness','Épaisseur (mm)'],['tolerance','Tolérances (mm / consigne)']];
const specific={
 ring:[['ringSize','Taille de bague FR'],['innerDiameter','Diamètre intérieur (mm)']],
 bracelet:[['circumference','Tour de poignet (mm)'],['innerDiameter','Diamètre intérieur (mm)'],['length','Longueur du bracelet (mm)'],['opening','Ouverture / réglage (mm)'],['fastening','Fermoir / système de fermeture']],
 necklace:[['length','Longueur du collier / chaîne (mm)'],['extension','Longueur de rallonge (mm)'],['height','Hauteur du motif (mm)'],['fastening','Fermoir / système de fermeture']],
 pendant:[['height','Hauteur du pendentif (mm)'],['bailOpening','Passage intérieur de la bélière (mm)'],['length','Longueur de chaîne (mm)']],
 earrings:[['height','Hauteur de la boucle (mm)'],['innerDiameter','Diamètre intérieur / créole (mm)'],['postLength','Longueur de tige (mm)'],['postDiameter','Diamètre de tige (mm)'],['fastening','Attache / fermoir'],['pairing','Paire / unité / symétrie']],
};
export function jewelryTypeOf(piece){
 const type=piece.production?.header?.jewelryType;
 if(JEWELRY_TYPES.some(item=>item.id===type))return type;
 // Existing ring measurements are evidence; a name alone is not.
 return piece.production?.dimensions?.ringSize?'ring':'';
}
export function dimensionFields(type){return [...(specific[type]||[['length','Longueur (mm)'],['height','Hauteur (mm)'],['innerDiameter','Diamètre intérieur (mm)']]),...common];}
