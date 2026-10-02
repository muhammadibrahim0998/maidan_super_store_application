import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { Printer, Barcode as BarcodeIcon, Copy, Check, QrCode as QrIcon, ExternalLink, Share2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

export function BarcodeRenderer({
  value,
  productName = '',
  price = 0,
  shopName = 'Hyasire Super Store',
  currency = 'Rs.',
  showPrint = true,
  showValue = true,
  height = 42,
  width = 1.8,
  fontSize = 12,
  className = ''
}) {
  const svgRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [activeTab, setActiveTab] = useState('both'); // 'both' | 'barcode' | 'qr'

  const cleanBarcode = String(value || '').trim();
  const directProductUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/shop/1?scan=${encodeURIComponent(cleanBarcode)}`
    : '';

  // Generate 1D Barcode
  useEffect(() => {
    if (!svgRef.current || !cleanBarcode) return;
    try {
      JsBarcode(svgRef.current, cleanBarcode, {
        format: cleanBarcode.length === 12 || cleanBarcode.length === 13 ? "EAN13" : "CODE128",
        width: width,
        height: height,
        displayValue: showValue,
        fontSize: fontSize,
        font: "monospace",
        fontOptions: "bold",
        margin: 4,
        background: "#ffffff",
        lineColor: "#000000"
      });
    } catch (e) {
      try {
        JsBarcode(svgRef.current, cleanBarcode, {
          format: "CODE128",
          width: width,
          height: height,
          displayValue: showValue,
          fontSize: fontSize,
          font: "monospace",
          fontOptions: "bold",
          margin: 4,
          background: "#ffffff",
          lineColor: "#000000"
        });
      } catch (err) {
        console.error("Barcode generation error:", err);
      }
    }
  }, [cleanBarcode, height, width, fontSize, showValue]);

  // Generate 2D QR Code with direct URL
  useEffect(() => {
    if (!cleanBarcode || !directProductUrl) return;
    QRCode.toDataURL(directProductUrl, {
      margin: 1,
      width: 140,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
    .then(url => setQrDataUrl(url))
    .catch(err => console.error("QR generation error:", err));
  }, [cleanBarcode, directProductUrl]);

  if (!cleanBarcode) {
    return (
      <div className={`flex items-center gap-1.5 text-slate-400 text-xs italic ${className}`}>
        <BarcodeIcon className="w-4 h-4 opacity-50" />
        <span>No barcode assigned</span>
      </div>
    );
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(cleanBarcode);
    setCopied(true);
    toast.success(`Barcode ${cleanBarcode} copied!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(directProductUrl);
    toast.success("Direct Product Link copied! Anyone who opens it lands on this perfume.");
  };

  const handlePrint = (e) => {
    e?.stopPropagation();
    const printWindow = window.open('', '_blank', 'width=500,height=420');
    if (!printWindow) {
      toast.error("Please allow popups to print barcode labels");
      return;
    }

    const svgHtml = svgRef.current ? svgRef.current.outerHTML : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Smart Label - ${productName || cleanBarcode}</title>
          <style>
            @page {
              size: 55mm 35mm;
              margin: 0;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 4px 6px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              background: #fff;
              color: #000;
              height: 100vh;
            }
            .shop-title {
              font-size: 8px;
              font-weight: 900;
              letter-spacing: 0.5px;
              text-transform: uppercase;
              color: #15803d;
              margin-bottom: 1px;
            }
            .product-title {
              font-size: 10.5px;
              font-weight: 800;
              text-transform: uppercase;
              max-width: 190px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              margin-bottom: 2px;
            }
            .codes-row {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              width: 100%;
              max-width: 195px;
            }
            .barcode-col {
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .barcode-col svg {
              max-width: 120px;
              max-height: 42px;
            }
            .qr-col {
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .qr-col img {
              width: 44px;
              height: 44px;
            }
            .qr-label {
              font-size: 5.5px;
              font-weight: 800;
              text-transform: uppercase;
              color: #475569;
              margin-top: 1px;
            }
            .footer-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              width: 100%;
              max-width: 195px;
              margin-top: 2px;
              border-top: 1px dashed #cbd5e1;
              padding-top: 2px;
            }
            .price-tag {
              font-size: 11px;
              font-weight: 900;
              color: #000;
            }
            .scan-tip {
              font-size: 6.5px;
              font-weight: 800;
              color: #0284c7;
              text-transform: uppercase;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="shop-title">${shopName}</div>
          <div class="product-title">${productName || 'PERFUME'}</div>
          
          <div class="codes-row">
            <div class="barcode-col">
              ${svgHtml}
            </div>
            ${qrDataUrl ? `
            <div class="qr-col">
              <img src="${qrDataUrl}" alt="QR" />
              <span class="qr-label">Scan Phone</span>
            </div>` : ''}
          </div>

          <div class="footer-row">
            <span class="scan-tip">📱 Scan To View Online</span>
            ${price ? `<span class="price-tag">${currency} ${Number(price).toLocaleString()}</span>` : ''}
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className={`flex flex-col items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm ${className}`}>
      
      {/* Header bar */}
      <div className="w-full flex items-center justify-between gap-2 mb-1.5 px-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider flex items-center gap-1">
            <BarcodeIcon className="w-3.5 h-3.5 text-emerald-600" />
            <span>Smart Product Label</span>
          </span>
          <span className="text-[8px] font-bold px-1.5 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-full flex items-center gap-0.5">
            <Smartphone className="w-2.5 h-2.5" />
            <span>Phone Scannable</span>
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopyLink}
            title="Copy Direct Product URL"
            className="p-1 px-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Share2 className="w-3 h-3 text-sky-600" />
            <span>Link</span>
          </button>

          <button
            type="button"
            onClick={handleCopyCode}
            title="Copy barcode number"
            className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
          </button>

          {showPrint && (
            <button
              type="button"
              onClick={handlePrint}
              title="Print Smart Sticker Label"
              className="p-1 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Printer className="w-3 h-3" />
              <span>Print Sticker</span>
            </button>
          )}
        </div>
      </div>

      {/* Dual Codes Display (1D Barcode + 2D Phone QR Code) */}
      <div className="flex items-center justify-between gap-3 p-2 bg-slate-50/80 rounded-xl border border-slate-200 w-full overflow-hidden">
        
        {/* 1D Barcode Column */}
        <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
          <svg ref={svgRef} className="max-w-full h-auto" />
          <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">
            POS Gun Scanner Code
          </span>
        </div>

        {/* 2D QR Code Column (For Phone Camera) */}
        {qrDataUrl && (
          <div className="flex flex-col items-center justify-center pl-2.5 border-l border-slate-200 shrink-0">
            <img src={qrDataUrl} alt="Product QR" className="w-14 h-14 rounded-md border border-slate-200 bg-white p-0.5 shadow-2xs" />
            <span className="text-[7.5px] font-black text-sky-700 uppercase mt-1 flex items-center gap-0.5">
              <Smartphone className="w-2.5 h-2.5" />
              <span>Phone Camera</span>
            </span>
          </div>
        )}
      </div>

      {/* Direct Link Banner */}
      <div className="w-full flex items-center justify-between px-2 py-1 mt-1.5 bg-emerald-50/60 border border-emerald-200/80 rounded-lg text-[9px]">
        <span className="text-emerald-800 font-bold truncate">
          🔗 Anyone scanning this bottle opens: <span className="font-mono text-emerald-950 font-black">/shop/1?scan={cleanBarcode}</span>
        </span>
        <button
          type="button"
          onClick={handleCopyLink}
          className="text-emerald-700 hover:text-emerald-900 font-black uppercase text-[8.5px] shrink-0 ml-1 cursor-pointer"
        >
          Copy
        </button>
      </div>

    </div>
  );
}

export default BarcodeRenderer;
