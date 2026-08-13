import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function DELETE(req, context) {
  try {
    // Next.js 15 requires awaiting context.params
    const params = await context.params;
    const { id } = params;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing Asset ID' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('stock_hub');

    const result = await db.collection('assets').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Document not found in MongoDB' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Deleted successfully from MongoDB' });
  } catch (error) {
    console.error('DELETE Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}