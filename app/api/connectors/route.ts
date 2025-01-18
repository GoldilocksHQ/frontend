import { readValues, updateValues } from '@/connectors/google-sheets/connector';
import { getUser } from '@/services/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { UUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    let userId = searchParams.get('userId');

    if (!userId) {
      const user = await getUser();
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      } else {
        userId = user.id;
      }
    }

    const spreadsheetId = searchParams.get('spreadsheetId');
    const range = searchParams.get('range');

    if (!spreadsheetId || !range) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const { success, result, error } = await readValues(
      userId as UUID,
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
    // Get the body of the request
    const { spreadsheetId, range, values, userId: passedUserId} = await req.json();
    let userId = passedUserId;

    if (!userId) {
      const user = await getUser();
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      } else {
        userId = user.id;
      }
    }

    if (!spreadsheetId || !range || !values) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const { success, result, error } = await updateValues(
      userId as UUID,
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