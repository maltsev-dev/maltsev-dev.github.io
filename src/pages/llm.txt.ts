import type { APIRoute } from 'astro';
import { renderLlms } from '../lib/llm';

/**
 * The agent map, under the name it was published under before the convention
 * settled on `/llms.txt`.
 *
 * The header link and a handful of outside links point here, so the address
 * keeps working — but the file says plainly which address is canonical, and
 * the two are generated from one function so they cannot drift apart.
 */
export const GET: APIRoute = async (context) => {
  const body = await renderLlms(context, '/llm.txt');
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
