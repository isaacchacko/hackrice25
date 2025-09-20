import { NextRequest, NextResponse } from 'next/server';
import { get_concepts } from '../../../../../backend/src/services/get_concepts';

export async function POST(request: NextRequest) {
  try {
    const { link } = await request.json();

    if (!link || typeof link !== 'string') {
      return NextResponse.json(
        { error: 'Valid URL is required' }, 
        { status: 400 }
      );
    }

    const result = await get_concepts(link);

    if (result.success) {
      return NextResponse.json({
        success: true,
        concepts: result.concepts
      });
    } else {
      return NextResponse.json(
        { error: result.error }, 
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}