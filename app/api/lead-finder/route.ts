import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

    if (!GOOGLE_MAPS_API_KEY) {
      return NextResponse.json(
        { error: "Missing GOOGLE_MAPS_API_KEY" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { category, keyword, location } = body;

    const query = [category, keyword, location].filter(Boolean).join(" ");

    const searchRes = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.rating",
        },
        body: JSON.stringify({
          textQuery: query,
          maxResultCount: 10,
        }),
      }
    );

    const searchData = await searchRes.json();
    const places = searchData.places || [];

    const results = await Promise.all(
      places.map(async (place: any) => {
        try {
          const placeId = place.id;

          const detailRes = await fetch(
            `https://places.googleapis.com/v1/places/${placeId}`,
            {
              headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
                "X-Goog-FieldMask":
                  "id,nationalPhoneNumber,websiteUri",
              },
            }
          );

          const detailData = await detailRes.json();

          return {
            id: place.id,
            name: place.displayName?.text || "",
            address: place.formattedAddress || "",
            rating: place.rating || null,
            phone: detailData.nationalPhoneNumber || "",
            website: detailData.websiteUri || "",
          };
        } catch {
          return {
            id: place.id,
            name: place.displayName?.text || "",
            address: place.formattedAddress || "",
            rating: place.rating || null,
            phone: "",
            website: "",
          };
        }
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Lead finder error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}