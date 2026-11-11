import type { APIRoute } from 'astro';
import { renderLlms } from '../lib/llm';

/**
 * The agent map, at the address the convention uses.
 *
 * `/llm.txt` is the same file under its older name; see `llm.txt.ts`.
 */
export const GET: APIRoute = async (context) => {
  const body = await renderLlms(context, '/llms.txt');
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
