import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SHA_RE = /^[a-f0-9]{40}$/i;
const RELEASE_ID_RE = /^[a-zA-Z0-9._-]{1,120}$/;

function releaseMetadata() {
  const commitSha = String(process.env.RELEASE_SHA ?? "").trim();
  const releaseId = String(process.env.RELEASE_ID ?? "").trim();
  const builtAt = String(process.env.RELEASE_BUILT_AT ?? "").trim();

  return {
    commitSha: SHA_RE.test(commitSha) ? commitSha.toLowerCase() : null,
    releaseId: RELEASE_ID_RE.test(releaseId) ? releaseId : null,
    builtAt: builtAt && !Number.isNaN(Date.parse(builtAt)) ? new Date(builtAt).toISOString() : null,
  };
}

export async function GET() {
  const release = releaseMetadata();
  const configured = Boolean(release.commitSha && release.releaseId && release.builtAt);

  return NextResponse.json(
    {
      service: "auditsystems",
      configured,
      release,
    },
    {
      status: configured ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export async function HEAD() {
  const response = await GET();
  return new NextResponse(null, { status: response.status, headers: response.headers });
}
