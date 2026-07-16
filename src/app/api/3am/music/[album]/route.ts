import { NextResponse } from "next/server";
import { MUSIC } from "@/threeam/content/music";
import { chooseTrack, isAllowedStreamUrl, toStreamProxyUrl } from "@/threeam/audio/logic";

type ITunesTrack = {
  wrapperType?: string;
  kind?: string;
  trackName?: string;
  previewUrl?: string;
  trackViewUrl?: string;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ album: string }> }
) {
  const { album } = await params;
  const entry = MUSIC.find((m) => m.key === album);
  if (!entry) return NextResponse.json({ error: "unknown album" }, { status: 404 });

  const res = await fetch(
    `https://itunes.apple.com/lookup?id=${entry.itunesId}&entity=song&limit=200`,
    { next: { revalidate: 86400 } }
  );
  if (!res.ok) return NextResponse.json({ error: "lookup failed" }, { status: 502 });

  const data = (await res.json()) as { results?: ITunesTrack[] };
  const tracks = (data.results ?? []).filter(
    (t) => t.wrapperType === "track" && t.previewUrl && isAllowedStreamUrl(t.previewUrl)
  );
  const track = chooseTrack(tracks, Math.random);
  if (!track) return NextResponse.json({ error: "no previews available" }, { status: 502 });

  return NextResponse.json({
    artist: entry.artist,
    album: entry.title,
    title: track.trackName ?? entry.title,
    previewProxyUrl: toStreamProxyUrl(track.previewUrl!),
    storeUrl: track.trackViewUrl ?? null,
  });
}
