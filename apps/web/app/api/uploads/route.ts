import { getApiUrl, getAuthHeaders } from '../../lib/api-server';

export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');
  const orgEmployeeId = url.searchParams.get('orgEmployeeId');
  if (!projectId && !orgEmployeeId) {
    return Response.json({ error: 'projectId or orgEmployeeId is required' }, { status: 400 });
  }

  const incoming = await request.formData();
  const file = incoming.get('file');
  if (!file || typeof file === 'string') {
    return Response.json({ error: 'No file provided' }, { status: 400 });
  }

  // `file` may be a native Blob/File or a FileLike from undici's multipart
  // parser.  Normalise it to a proper Blob so FormData.append accepts it in
  // all environments (jsdom, Node, Next.js edge runtime).
  const blob = file instanceof Blob
    ? file
    : new Blob(
        [await (file as unknown as { arrayBuffer(): Promise<ArrayBuffer> }).arrayBuffer()],
        { type: (file as unknown as { type: string }).type },
      );
  const fileName =
    file instanceof File
      ? file.name
      : ((file as unknown as { name?: string }).name ?? 'upload');

  const forward = new FormData();
  forward.append('file', blob, fileName);

  const qs = projectId
    ? `projectId=${encodeURIComponent(projectId)}`
    : `orgEmployeeId=${encodeURIComponent(orgEmployeeId!)}`;

  const authHeaders = await getAuthHeaders();
  const res = await fetch(
    `${getApiUrl()}/api/uploads?${qs}`,
    { method: 'POST', headers: authHeaders, body: forward },
  );

  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'application/json',
    },
  });
}
