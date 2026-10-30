import { journalFeedResponse } from "@/lib/journal";

export const dynamic = "force-static";

export function GET() {
  return journalFeedResponse();
}
