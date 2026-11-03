import { authConfigurationReady, hasValidSession, jsonError } from '../_lib/security.js';

export default function session(req, res) {
  if (req.method !== 'GET') return jsonError(res, 405, 'Método não permitido.');
  if (!authConfigurationReady()) return res.status(200).json({ authenticated: false, configured: false });
  return res.status(200).json({ authenticated: hasValidSession(req), configured: true });
}
