import { NextRequest, NextResponse } from 'next/server';

function buildTextQuery(payload: Record<string, string>) {
  return [payload.category, payload.keyword, payload.location].filter(Boolean).join(' in ');
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return NextResponse.json(
        { error: 'Missing GOOGLE_MAPS_API_KEY. Add it to .env.local before using Lead Finder.' },
        { status: 500 },
      );
    }

    const body = await req.json();
    const payload = body.payload ?? {};
    const maxResults = Math.min(Number(payload.maxResults) || 8, 10);
    const textQuery = buildTextQuery(payload);

    if (!textQuery) {
      return NextResponse.json({ error: 'Missing search input.' }, { status: 400 });
    }

    const fieldMask = [
      'places.id',
      'places.displayName',
      'places.formattedAddress',
      'places.rating',
      'places.userRatingCount',
      'places.googleMapsUri',
      'places.businessStatus',
    ].join(',');

    const searchResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify({
        textQuery,
        pageSize: maxResults,
        languageCode: 'en',
      }),
      cache: 'no-store',
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      return NextResponse.json({ error: errorText }, { status: 500 });
    }

    const searchData = await searchResponse.json();
    const places = Array.isArray(searchData.places) ? searchData.places : [];

    const results = await Promise.all(
      places.map(async (place: any) => {
        const fallback = {
          sourceId: place.id ?? '',
          name: place.displayName?.text ?? 'Unknown business',
          address: place.formattedAddress ?? '',
          phone: '',
          website: '',
          rating: place.rating ?? null,
          reviewCount: place.userRatingCount ?? null,
          mapsUrl: place.googleMapsUri ?? '',
          businessStatus: place.businessStatus ?? '',
        };

        if (!place.id) return fallback;

        try {
          const detailRes = await fetch(`https://places.googleapis.com/v1/places/${place.id}`, {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
              'X-Goog-FieldMask': 'id,nationalPhoneNumber,websiteUri',
            },
            cache: 'no-store',
          });

          if (!detailRes.ok) return fallback;
          const details = await detailRes.json();
          return {
            ...fallback,
            phone: details.nationalPhoneNumber ?? '',
            website: details.websiteUri ?? '',
          };
        } catch {
          return fallback;
        }
      }),
    );

    return NextResponse.json({
      query: textQuery,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
