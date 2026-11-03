import { clearSessionCookie, jsonError, noStore, requestOriginIsValid } from '../_lib/security.js';

export default function logout(req, res) {
  noStore(res);
  if (req.method !== 'POST') return jsonError(res, 405, 'Método não permitido.');
  if (!requestOriginIsValid(req)) return jsonError(res, 403, 'Origem não autorizada.');
  clearSessionCookie(res);
  return res.status(200).json({ authenticated: false });
}
