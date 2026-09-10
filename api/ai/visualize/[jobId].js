import { protectAI } from '../../../lib/ai/request.js';

// Generation currently completes in the POST response. There is no persistent
// asynchronous job store, so an invented timestamp must never report success.
export default protectAI(async (_req, res) => res.status(404).json({
  error: 'No asynchronous job found. Use the result returned by the try-on request.',
}), { endpoint: 'visualize-status', method: 'GET', limit: 30 });
