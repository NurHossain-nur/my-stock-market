import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

// Allows route execution up to 60 seconds for larger payloads
export const maxDuration = 60; 

// GET: Fetch all assets
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('stock_hub');

    const assets = await db
      .collection('assets')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ success: true, data: assets });
  } catch (error) {
    console.error('GET /api/assets error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Save new asset (including Base64 file data)
export async function POST(req) {
  try {
    const body = await req.json();
    const { title, keywords, svgData, jpegData, svgFilename, jpegFilename } = body;

    if (!title || !keywords) {
      return NextResponse.json({ success: false, error: 'Title and keywords are required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('stock_hub');

    const newAsset = {
      title,
      keywords,
      svgData: svgData || null,
      jpegData: jpegData || null,
      svgFilename: svgFilename || 'vector.svg',
      jpegFilename: jpegFilename || 'preview.jpg',
      createdAt: new Date(),
    };

    const result = await db.collection('assets').insertOne(newAsset);

    return NextResponse.json({ success: true, data: { ...newAsset, _id: result.insertedId } });
  } catch (error) {
    // Print full error log in your terminal for easy debugging
    console.error('POST /api/assets error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}