import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

// Allows route execution up to 60 seconds for larger payloads
export const maxDuration = 60; 

// // GET: Fetch assets with pagination
// export async function GET(req) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
//     const limit = 10;
//     const skip = (page - 1) * limit;

//     const client = await clientPromise;
//     const db = client.db('stock_hub');
//     const collection = db.collection('assets');

//     const [assets, totalAssets] = await Promise.all([
//       collection
//         .find({}, { allowDiskUse: true })
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         // .allowDiskUse()
//         .toArray(),
//       collection.countDocuments({}),
//     ]);

//     const totalPages = Math.ceil(totalAssets / limit);

//     return NextResponse.json({
//       success: true,
//       data: assets,
//       pagination: {
//         page,
//         limit,
//         totalAssets,
//         totalPages,
//       },
//     });
//   } catch (error) {
//     console.error('GET /api/assets error:', error);
//     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
//   }
// }


// GET: Fetch assets with pagination
// GET: Fetch assets with pagination
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = 20;
    const skip = (page - 1) * limit;

    const client = await clientPromise;
    const db = client.db('stock_hub');
    const collection = db.collection('assets');

    const [assets, totalAssets] = await Promise.all([
      collection
        .find({}, { allowDiskUse: true }) // 1. FIXES MEMORY CRASH
        .project({ svgData: 0 })          // 2. FIXES SLOW LOADING & PAYLOAD LIMITS
        .sort({ createdAt: -1, _id: -1 }) // 3. FIXES PAGINATION BUGS
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments({}),
    ]);

    const totalPages = Math.ceil(totalAssets / limit);

    return NextResponse.json({
      success: true,
      data: assets,
      pagination: { page, limit, totalAssets, totalPages },
    });
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
    console.error('POST /api/assets error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}