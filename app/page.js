'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true); // Initial load fetching state
  const [copiedId, setCopiedId] = useState(null);

  // Form State
  const [title, setTitle] = useState('');
  const [keywords, setKeywords] = useState('');
  const [svgFile, setSvgFile] = useState(null);
  const [jpegFile, setJpegFile] = useState(null);

  // Fetch assets on load
  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    setIsFetching(true);
    try {
      const res = await fetch('/api/assets');
      const result = await res.json();
      if (result.success) setAssets(result.data);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsFetching(false);
    }
  };

  // Compress JPEG in browser canvas before encoding to Base64
  const compressAndConvertToBase64 = (file, maxWidth = 1200, quality = 0.7) => {
    return new Promise((resolve, reject) => {
      // If it's an SVG, read directly as Base64 without canvas compression
      if (file.type.includes('svg') || file.name.endsWith('.svg')) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        return;
      }

      // Canvas compression for JPEGs
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to lightweight compressed JPEG Base64
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Updated handleUpload function
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!title || !keywords) return alert('Please enter Title and Keywords!');
    setLoading(true);

    try {
      let svgData = null;
      let jpegData = null;

      // Compress JPEG preview & convert SVG to base64
      if (svgFile) svgData = await compressAndConvertToBase64(svgFile);
      if (jpegFile) jpegData = await compressAndConvertToBase64(jpegFile);

      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          keywords,
          svgData,
          jpegData,
          svgFilename: svgFile ? svgFile.name : null,
          jpegFilename: jpegFile ? jpegFile.name : null,
        }),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      // Reset Form
      setTitle('');
      setKeywords('');
      setSvgFile(null);
      setJpegFile(null);
      e.target.reset();

      fetchAssets();
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete Item from MongoDB Atlas
  const handleDelete = async (id) => {
    if (!confirm('Mark as done and delete from MongoDB?')) return;

    try {
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        setAssets(assets.filter((item) => item._id !== id));
      } else {
        alert('Delete failed: ' + result.error);
      }
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  // Copy Title / Keywords
  const copyToClipboard = (text, id, field) => {
    navigator.clipboard.writeText(text);
    setCopiedId(`${id}-${field}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export Adobe Stock CSV
  const downloadAdobeCSV = () => {
    const headers = 'Filename,Title,Keywords\n';
    const rows = assets
      .map((a) => {
        const filename = a.svgFilename || a.jpegFilename || 'vector.eps';
        const cleanTitle = `"${a.title.replace(/"/g, '""')}"`;
        const cleanKeywords = `"${a.keywords.replace(/"/g, '""')}"`;
        return `${filename},${cleanTitle},${cleanKeywords}`;
      })
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `AdobeStock_Batch_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-slate-50 min-h-screen text-slate-800">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-4 border-b gap-4">
        <div>
          <h1 className="text-3xl font-bold">Adobe Stock Asset Hub (MongoDB Atlas)</h1>
          <p className="text-sm text-slate-500">
            Pending Assets: {isFetching ? 'Loading...' : assets.length}
          </p>
        </div>

        {assets.length > 0 && !isFetching && (
          <button
            onClick={downloadAdobeCSV}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg shadow transition"
          >
            📥 Export Adobe Stock CSV
          </button>
        )}
      </header>

      {/* Upload Form */}
      <div className="bg-white p-6 rounded-xl border shadow-sm mb-10">
        <h2 className="text-xl font-semibold mb-4">Upload New Stock Asset</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <input
            type="text"
            placeholder="Asset Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            required
          />

          <textarea
            placeholder="Keywords (comma separated)"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            rows={2}
            className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                SVG / Vector File
              </label>
              <input
                type="file"
                accept=".svg,.eps"
                onChange={(e) => setSvgFile(e.target.files[0])}
                className="w-full border p-2 rounded-lg text-sm bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                JPEG Preview / Image
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={(e) => setJpegFile(e.target.files[0])}
                className="w-full border p-2 rounded-lg text-sm bg-slate-50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-black text-white font-semibold py-2.5 rounded-lg transition disabled:bg-slate-400 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing & Uploading to MongoDB...
              </>
            ) : (
              'Upload Asset'
            )}
          </button>
        </form>
      </div>

      {/* Cards Grid / Skeletons */}
      {isFetching ? (
        /* Loading Skeleton Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white border rounded-xl p-4 shadow-sm animate-pulse flex flex-col justify-between">
              <div>
                <div className="h-44 w-full bg-slate-200 rounded-lg mb-4" />
                <div className="h-4 bg-slate-200 rounded w-1/4 mb-2" />
                <div className="h-8 bg-slate-100 rounded mb-4" />
                <div className="h-4 bg-slate-200 rounded w-1/4 mb-2" />
                <div className="h-16 bg-slate-100 rounded mb-4" />
              </div>
              <div className="pt-3 border-t space-y-2">
                <div className="h-8 bg-slate-200 rounded" />
                <div className="h-8 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : assets.length > 0 ? (
        /* Actual Data Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map((asset) => (
            <div key={asset._id} className="bg-white border rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <div>
                {/* Image Preview */}
                {asset.jpegData ? (
                  <div className="h-44 w-full bg-slate-100 rounded-lg overflow-hidden mb-4 border">
                    <img src={asset.jpegData} alt={asset.title} className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="h-44 w-full bg-slate-100 rounded-lg mb-4 border flex items-center justify-center text-slate-400 text-xs">
                    No Preview
                  </div>
                )}

                {/* Title Copy */}
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Title</span>
                    <button
                      onClick={() => copyToClipboard(asset.title, asset._id, 'title')}
                      className="text-xs text-indigo-600 font-medium hover:underline"
                    >
                      {copiedId === `${asset._id}-title` ? '✓ Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-sm font-medium text-slate-700 bg-slate-50 p-2 rounded border">{asset.title}</p>
                </div>

                {/* Keywords Copy */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Keywords</span>
                    <button
                      onClick={() => copyToClipboard(asset.keywords, asset._id, 'keywords')}
                      className="text-xs text-indigo-600 font-medium hover:underline"
                    >
                      {copiedId === `${asset._id}-keywords` ? '✓ Copied!' : 'Copy All'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded border h-20 overflow-y-auto leading-relaxed">
                    {asset.keywords}
                  </p>
                </div>
              </div>

              {/* Downloads & Actions */}
              <div className="pt-3 border-t flex flex-col gap-2">
                <div className="flex gap-2">
                  {asset.svgData && (
                    <a
                      href={asset.svgData}
                      download={asset.svgFilename || 'vector.svg'}
                      className="flex-1 text-center bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-medium text-xs py-2 rounded-md transition"
                    >
                      ⬇️ SVG File
                    </a>
                  )}
                  {asset.jpegData && (
                    <a
                      href={asset.jpegData}
                      download={asset.jpegFilename || 'preview.jpg'}
                      className="flex-1 text-center bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-medium text-xs py-2 rounded-md transition"
                    >
                      ⬇️ JPEG Image
                    </a>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(asset._id)}
                  className="w-full bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 text-xs font-medium py-2 rounded-md transition border"
                >
                  ✓ Done (Delete)
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 text-slate-400">
          <p>No assets pending. Upload one above!</p>
        </div>
      )}
    </div>
  );
}