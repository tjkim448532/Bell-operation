import { NextResponse } from 'next/server';
import { admin, db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  let evalResult;
  let evalError;
  try {
    evalResult = eval("require('firebase-admin')");
  } catch (e: any) {
    evalError = e.message;
  }

  return NextResponse.json({
    adminKeys: admin ? Object.keys(admin) : null,
    appsLength: admin && admin.apps ? admin.apps.length : -1,
    appNames: admin && admin.apps ? admin.apps.map((a: any) => a.name) : [],
    dbExists: !!db,
    typeofWindow: typeof window,
    evalResultExists: !!evalResult,
    evalError: evalError || null
  });
}
