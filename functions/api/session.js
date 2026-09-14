
import { requireAdmin } from '../_lib/auth.js';
import { json } from '../_lib/response.js';
export async function onRequestGet(context){ return json({authenticated: await requireAdmin(context)}); }
