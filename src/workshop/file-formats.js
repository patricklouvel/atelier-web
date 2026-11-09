export const FILE_ACCEPT='.png,.jpg,.jpeg,.webp,.fbx,.blend,.stl,.3mf,.obj,.mtl,.glb,.gltf,.ply,.step,.stp,.3dm,.pdf,.zip';
export const FILE_PATTERN=/\.(png|jpe?g|webp|fbx|blend|stl|3mf|obj|mtl|glb|gltf|ply|step|stp|3dm|pdf|zip)$/i;
export const MAX_FILE_SIZE=200*1024*1024;
export function validateFile(file){
 if(!FILE_PATTERN.test(file.name))throw Error('Format non accepté : '+file.name);
 if(!Number.isSafeInteger(file.size)||file.size<1||file.size>MAX_FILE_SIZE)throw Error('Taille maximale : 200 Mo par fichier.');
}
