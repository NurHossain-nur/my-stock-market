import { NextResponse } from 'next/server';
import clientPromise from '../../../../../lib/mongodb'; // Adjust path to lib/mongodb if needed
import { ObjectId } from 'mongodb';

export async function GET(req, { params }) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'svg'; // 'svg' or 'jpeg'
    const { id } = params;

    const client = await clientPromise;
    const db = client.db('stock_hub');
    
    // Fetch ONLY the specific file data needed for this one asset
    const asset = await db.collection('assets').findOne(
      { _id: new ObjectId(id) },
      { projection: { svgData: 1, jpegData: 1, svgFilename: 1, jpegFilename: 1 } }
    );

    if (!asset) return new NextResponse('Asset not found', { status: 404 });

    const base64Data = type === 'svg' ? asset.svgData : asset.jpegData;
    if (!base64Data) return new NextResponse('File data not found', { status: 404 });

    // Convert Base64 back to an actual downloadable file buffer
    const base64String = base64Data.split(',')[1];
    const buffer = Buffer.from(base64String, 'base64');
    
    const contentType = type === 'svg' ? 'image/svg+xml' : 'image/jpeg';
    const filename = type === 'svg' ? (asset.svgFilename || 'vector.svg') : (asset.jpegFilename || 'preview.jpg');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}