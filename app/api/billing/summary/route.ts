import { NextResponse } from 'next/server';
import { getWorkspaceBillingSummary } from '@/lib/billing';

export async function GET() {
  try {
    const summary = await getWorkspaceBillingSummary();

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error('Billing summary error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load billing summary' },
      { status: 500 }
    );
  }
}