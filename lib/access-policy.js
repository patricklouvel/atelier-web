export const ROLES = ['admin', 'participant', 'guest'];
export const ROLE_LABELS = {admin:'Administrateur', participant:'Participant fabrication', guest:'Invité client'};
export const AUDIENCES = ['private', 'team', 'client'];

export function requireRole(member, allowed) {
  if (!ROLES.includes(member?.role) || !allowed.includes(member.role)) {
    throw Object.assign(new Error('Vous n’avez pas les droits nécessaires.'), {status:403});
  }
  return member;
}

export function canReadProject(member, token) {
  return ROLES.includes(member?.role) && (member.role === 'admin' || member.projectTokens?.includes(token));
}

export function visibleProjectFiles(manifest, member) {
  return manifest.files.map((file,index)=>({...file,id:String(index),audience:file.audience || 'team'})).filter(file=>
    member.role === 'admin' || (member.role === 'participant' && ['team','client'].includes(file.audience)) || (member.role === 'guest' && file.audience === 'client')
  );
}
