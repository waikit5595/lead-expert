import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  defaultFollowUpSettings,
  type FollowUpSettings,
} from '@/lib/followup-rules';

const SETTINGS_DOC_ID = 'global';

export async function GET() {
  try {
    const snap = await getDoc(doc(db, 'settings', SETTINGS_DOC_ID));

    if (!snap.exists()) {
      return NextResponse.json({
        success: true,
        settings: defaultFollowUpSettings,
      });
    }

    return NextResponse.json({
      success: true,
      settings: {
        ...defaultFollowUpSettings,
        ...(snap.data() as Partial<FollowUpSettings>),
      },
    });
  } catch (error) {
    console.error('Load follow-up settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load settings' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const payload: FollowUpSettings = {
      firstReminderDays: Number(body.firstReminderDays ?? defaultFollowUpSettings.firstReminderDays),
      highPriorityDays: Number(body.highPriorityDays ?? defaultFollowUpSettings.highPriorityDays),
      autoDraftEnabled: Boolean(body.autoDraftEnabled),
    };

    await setDoc(doc(db, 'settings', SETTINGS_DOC_ID), payload, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save follow-up settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}