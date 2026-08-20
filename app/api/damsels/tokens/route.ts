import { fetchDamselsCollection } from "@/lib/damsels/tokens";

export const revalidate = 30;

export async function GET() {
  const data = await fetchDamselsCollection();
  return Response.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
    },
  });
}
