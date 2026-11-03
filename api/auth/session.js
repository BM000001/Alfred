import { authConfigurationReady, hasValidSession, jsonError, noStore } from '../_lib/security.js';

export default function session(req, res) {
  noStore(res);
  if (req.method !== 'GET') return jsonError(res, 405, 'Método não permitido.');
  if (!authConfigurationReady()) return res.status(200).json({ authenticated: false, configured: false });
  return res.status(200).json({
    authenticated: hasValidSession(req),
    configured: true,
    aiEnabled: process.env.ALFRED_AI_ENABLED === 'true'
      && Boolean(process.env.AI_GATEWAY_MODEL)
      && Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN),
  });
}
