import { addAsset, getAssets } from "../../../lib/db";

export const runtime = "nodejs";

export async function GET() {
  return Response.json(getAssets());
}

export async function POST(request) {
  try {
    addAsset(await request.json());
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    const status = String(error.message).includes("UNIQUE") ? 409 : 400;
    return Response.json({ error: status === 409 ? "That asset tag already exists." : error.message }, { status });
  }
}
