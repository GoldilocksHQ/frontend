import { readValues, updateValues } from '@/connectors/google-sheets/connector';
import { getUser } from '@/services/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { UUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const spreadsheetId = searchParams.get('spreadsheetId');
    const range = searchParams.get('range');

    if (!spreadsheetId || !range) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const { success, result, error } = await readValues(
      user.id as UUID,
      spreadsheetId,
      range
    );

    if (!success) {
      return NextResponse.json(
        { error: error || 'Failed to read values' },
        { status: 500 }
      );
    }

    return NextResponse.json({ values: result });
  } catch (error) {
    console.error('Sheet read error:', error);
    return NextResponse.json(
      { error: 'Failed to read sheet values' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { spreadsheetId, range, values } = await req.json();

    if (!spreadsheetId || !range || !values) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const { success, result, error } = await updateValues(
      user.id as UUID,
      spreadsheetId,
      range,
      values
    );

    if (!success) {
      return NextResponse.json(
        { error: error || 'Failed to update values' },
        { status: 500 }
      );
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Sheet update error:', error);
    return NextResponse.json(
      { error: 'Failed to update sheet values' },
      { status: 500 }
    );
  }
}