export function readAuthCallback({pathname='',hash='',search=''}={}) {
  const fragment=new URLSearchParams(hash.replace(/^#/,''));
  const query=new URLSearchParams(search.replace(/^\?/,''));
  const error=fragment.get('error_code') || query.get('error_code') || fragment.get('error') || query.get('error');
  return {
    privateEntry: pathname==='/atelier' || pathname.startsWith('/atelier/') || fragment.has('access_token') || fragment.has('refresh_token') || query.has('code') || Boolean(error) || /^[a-f0-9]{48}$/.test(hash.slice(1)),
    passwordSetup: ['invite','recovery'].includes(fragment.get('type')) || pathname==='/atelier/activer' || pathname==='/atelier/reinitialiser',
    errorMessage: error ? error==='otp_expired' ? 'Ce lien a expiré ou a déjà été utilisé. Connectez-vous avec votre mot de passe, ou demandez sa réinitialisation.' : 'Le lien d’activation n’a pas pu être validé. Demandez une nouvelle invitation ou connectez-vous avec votre mot de passe.' : '',
  };
}
