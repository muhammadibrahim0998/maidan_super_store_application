import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, Share2, CheckCircle2, FileSpreadsheet, Barcode as BarcodeIcon, Smartphone, Copy, Check } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { toast } from 'sonner';

export default function WalkInBillModal({ bill, shop, onClose, currency = 'RS' }) {
  const [showWhatsAppPrompt, setShowWhatsAppPrompt] = useState(false);
  const [targetPhone, setTargetPhone] = useState(bill?.customerPhone || '');
  const [billQrUrl, setBillQrUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const billBarcodeRef = useRef(null);

  useEffect(() => {
    if (bill?.customerPhone) {
      setTargetPhone(bill.customerPhone);
    }
  }, [bill]);

  // Extract clean serial number & formatted invoice number
  const rawSerial = bill?.serialNumber || (bill?.invoiceNumber ? bill.invoiceNumber.replace(/\D/g, '') : '') || String(bill?._id || Date.now()).slice(-6);
  const serialNo = String(rawSerial);
  const invoiceDisplay = bill?.invoiceNumber || (bill ? `INV-${serialNo.padStart(5, '0')}` : '');

  // Determine the best working URL for the QR code:
  // When running on localhost in local dev, replace "localhost" / "127.0.0.1" with the LAN IP (10.48.147.93)
  // so mobile phone cameras scanning the QR code can directly open the project and the bill!
  const getBillVerifyUrl = () => {
    if (typeof window === 'undefined' || !invoiceDisplay) return '';
    let origin = window.location.origin;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      const port = window.location.port ? `:${window.location.port}` : '';
      const lanHost = import.meta.env.VITE_LAN_IP || '10.48.147.93';
      origin = `${window.location.protocol}//${lanHost}${port}`;
    }
    return `${origin}/shop/1?bill=${encodeURIComponent(invoiceDisplay)}`;
  };

  const billVerifyUrl = getBillVerifyUrl();

  // Render barcode for the bill
  useEffect(() => {
    if (!bill || !billBarcodeRef.current || !invoiceDisplay) return;
    try {
      JsBarcode(billBarcodeRef.current, invoiceDisplay, {
        format: "CODE128",
        width: 1.5,
        height: 38,
        displayValue: true,
        fontSize: 10,
        font: "monospace",
        fontOptions: "bold",
        margin: 2,
        background: "#ffffff",
        lineColor: "#000000"
      });
    } catch (e) {
      console.error("Bill barcode render error:", e);
    }
  }, [bill, invoiceDisplay]);

  // Render QR code pointing to direct online digital bill
  useEffect(() => {
    if (!bill || !billVerifyUrl) return;
    QRCode.toDataURL(billVerifyUrl, {
      margin: 1,
      width: 160,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' }
    })
    .then(url => setBillQrUrl(url))
    .catch(err => console.error("Bill QR error:", err));
  }, [bill, billVerifyUrl]);

  const handleCopyBillLink = () => {
    if (!billVerifyUrl) return;
    navigator.clipboard.writeText(billVerifyUrl);
    setCopiedLink(true);
    toast.success("Online digital bill link copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!bill) return null;

  const saleDate = bill.saleDate ? new Date(bill.saleDate).toLocaleString() : new Date().toLocaleString();
  const customerName = bill.customerName || 'Walk-in Customer';
  const customerPhone = bill.customerPhone || '';
  const customerEmail = bill.customerEmail || bill.customer?.email || '';
  const items = bill.items || [];
  const totalAmount = bill.totalAmount || 0;
  const shopName = shop?.name || 'Maidan Perfume Shop';
  const shopAddress = shop?.address || '';
  const shopPhone = shop?.phone || '';

  const getBranchBank = () => {
    const name = String(shopName || '').toLowerCase();
    const address = String(shopAddress || '').toLowerCase();
    if (name.includes('peshawar') || name.includes('peshawer') || address.includes('peshawar')) {
      return { bank: 'Meezan Bank (RIZWAN ULLAH)', accountNo: '07190104740373' };
    }
    if (name.includes('mardan') || address.includes('mardan')) {
      return { bank: 'Bank Al Habib', accountNo: '2013008100773501' };
    }
    if (name.includes('attock') || address.includes('attock') || name.includes('maidan') || address.includes('maidan')) {
      return { bank: 'UBL (Maidan Perfume Shop)', accountNo: 'UBL-0109000306243543' };
    }
    return { bank: 'UBL / Meezan Bank', accountNo: 'UBL-0109000306243543' };
  };
  const branchBank = getBranchBank();

  // Helper to extract clean name and separate Box / Pack / Unit badges
  const getItemBreakdownDetails = (item) => {
    if (!item) return { rawName: 'Product', petis: '1 Box', trays: '1 Pack', eggs: '1 Unit', unit: 'unit', qty: 1 };
    let rawName = item.rawProductName || (item.name ? item.name.replace(/\s*\([^)]*\)/g, '').trim() : 'Product');
    if (!rawName) rawName = 'Product';

    const qty = Number(item.quantity) || 1;
    const nameLower = (item.name || '').toLowerCase();
    const unit = String(item.unit || item.selectedUnit || '').toLowerCase() || 
      (nameLower.includes('box') || nameLower.includes('peti') ? 'box' : nameLower.includes('pack') || nameLower.includes('tray') ? 'pack' : 'unit');

    const tPerPeti = Number(item.traysPerPeti) || 12;
    const ePerTray = Number(item.eggsPerTray) || 30;
    const ePerPeti = tPerPeti * ePerTray;

    let petis = '';
    let trays = '';
    let eggs = '';

    if (unit === 'peti' || unit === 'box') {
      petis = `${qty} Box${qty > 1 ? 'es' : ''}`;
      trays = `${(qty * tPerPeti).toFixed(1).replace(/\.0$/, '')} Packs`;
      eggs = `${Math.round(qty * ePerPeti).toLocaleString()} Units`;
    } else if (unit === 'tray' || unit === 'pack' || unit === 'dozen') {
      petis = `${(qty / tPerPeti).toFixed(2).replace(/\.00$/, '')} Boxes`;
      trays = `${qty} Pack${qty > 1 ? 's' : ''}`;
      eggs = `${Math.round(qty * ePerTray).toLocaleString()} Units`;
    } else {
      petis = `${(qty / ePerPeti).toFixed(2).replace(/\.00$/, '')} Boxes`;
      trays = `${(qty / ePerTray).toFixed(1).replace(/\.0$/, '')} Packs`;
      eggs = `${qty} Unit${qty > 1 ? 's' : ''}`;
    }

    return { rawName, petis, trays, eggs, unit, qty };
  };

  // ── Helper to build High-End Executive PDF Invoice ──
  const createPDFDocument = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    // 1. Top Header Banner (Monochrome Slate)
    doc.setFillColor(30, 41, 59); // Slate #1e293b
    doc.rect(0, 0, 210, 36, 'F');

    // Company Name & Subtitle
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(shopName.toUpperCase(), 14, 16);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text('OFFICIAL SALES INVOICE & TAX BILL RECEIPT', 14, 22);
    if (shopAddress || shopPhone) {
      doc.text(`${shopAddress} • Phone: ${shopPhone || 'N/A'}`, 14, 28);
    }

    // Right Side: Serial Badge
    doc.setFillColor(15, 23, 42); // Dark Slate #0f172a
    doc.roundedRect(148, 8, 48, 20, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`SERIAL: #${serialNo}`, 154, 16);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(invoiceDisplay, 154, 23);

    // 2. Invoice Details Box
    doc.setFillColor(248, 250, 252); // Slate #f8fafc
    doc.setDrawColor(203, 213, 225); // Slate #cbd5e1
    doc.roundedRect(14, 42, 182, 28, 2, 2, 'FD');

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(8.5);

    // Left Column
    doc.setFont('helvetica', 'bold');
    doc.text('BILLED TO (CUSTOMER):', 18, 49);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10.5);
    doc.text(customerName.toUpperCase(), 18, 55);

    doc.setTextColor(71, 85, 105);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    let paymentDesc = 'Paid in Cash';
    if (Number(bill.dueAmount) > 0 && (Number(bill.cashPaid) > 0 || Number(bill.bankPaid) > 0)) {
      paymentDesc = `Split: ${Number(bill.bankPaid) > 0 ? 'Bank' : 'Cash'} Paid (${currency} ${(Number(bill.cashPaid) || Number(bill.bankPaid) || 0).toLocaleString()}) + Due (${currency} ${(Number(bill.dueAmount) || 0).toLocaleString()})`;
    } else if (bill.isCredit || bill.paymentMethod === 'CREDIT' || Number(bill.dueAmount) >= totalAmount) {
      paymentDesc = `Credit Sale (Due: ${currency} ${(Number(bill.dueAmount) || totalAmount).toLocaleString()})`;
    } else if (bill.paymentMethod === 'BANK_TRANSFER' || Number(bill.bankPaid) > 0) {
      paymentDesc = 'Bank Transfer (Approved)';
    }

    const contactParts = [];
    if (customerPhone) contactParts.push(`Phone: ${customerPhone}`);
    if (customerEmail) contactParts.push(`Email: ${customerEmail}`);
    if (contactParts.length > 0) {
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(contactParts.join('  •  '), 18, 60.5);
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Payment: ${paymentDesc}`, 18, 66);
    } else {
      doc.text(`Payment: ${paymentDesc}`, 18, 64);
    }

    // Right Column
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('INVOICE METADATA:', 110, 49);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Date & Time: ${saleDate}`, 110, 55);
    doc.text(`Branch Bank: ${branchBank.bank}`, 110, 61);
    doc.text(`Account No: ${branchBank.accountNo}`, 110, 66);

    // 3. Items Table
    const tableData = items.map((item, index) => {
      const d = getItemBreakdownDetails(item);
      return [
        index + 1,
        `${d.rawName.toUpperCase()}\n[ 📦 ${d.petis}  |  🍱 ${d.trays}  |  🏷️ ${d.eggs} ]`,
        item.quantity,
        `${currency} ${(item.price || 0).toLocaleString()}`,
        `${currency} ${((item.quantity || 1) * (item.price || 0)).toLocaleString()}`
      ];
    });

    autoTable(doc, {
      startY: 75,
      head: [['#', 'ITEM DESCRIPTION', 'QTY', `UNIT PRICE (${currency})`, `SUBTOTAL (${currency})`]],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59], // Slate-800
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 14, fontStyle: 'bold' },
        1: { halign: 'left', fontStyle: 'bold' },
        2: { halign: 'center', cellWidth: 24, fontStyle: 'bold', textColor: [15, 23, 42] },
        3: { halign: 'right', cellWidth: 38 },
        4: { halign: 'right', cellWidth: 42, fontStyle: 'bold', textColor: [15, 23, 42] }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      styles: {
        fontSize: 9,
        cellPadding: 3.5,
        lineColor: [203, 213, 225],
        lineWidth: 0.2
      }
    });

    const finalY = (doc['lastAutoTable']?.finalY || 130) + 6;

    // 4. Grand Total Bar
    doc.setFillColor(241, 245, 249); // Slate #f1f5f9
    doc.setDrawColor(203, 213, 225); // Slate #cbd5e1
    doc.roundedRect(100, finalY, 96, 16, 2, 2, 'FD');

    doc.setTextColor(15, 23, 42); // Black / dark slate #0f172a
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('GRAND TOTAL PAID:', 105, finalY + 10.5);

    doc.setFontSize(13);
    doc.text(`${currency} ${totalAmount.toLocaleString()}`, 190, finalY + 11, { align: 'right' });

    // 5. Signatures & Footer
    const footerY = Math.max(finalY + 36, 255);
    doc.setDrawColor(203, 213, 225);
    doc.line(20, footerY, 75, footerY);
    doc.line(135, footerY, 190, footerY);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('Customer Signature', 47.5, footerY + 5, { align: 'center' });
    doc.text('Authorized Signature & Stamp', 162.5, footerY + 5, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text(`Official Bill Receipt • Generated by ${shopName} • Thank you for your business!`, 105, footerY + 15, { align: 'center' });

    return doc;
  };

  // 1. Download PDF (used internally by WhatsApp share)
  const downloadPDF = () => {
    const doc = createPDFDocument();
    const pdfFileName = `Invoice_${invoiceDisplay}_${customerName.replace(/\s+/g, '_')}.pdf`;
    doc.save(pdfFileName);
    return { doc, pdfFileName };
  };

  // 2. Export / Generate Styled Excel Spreadsheet (.xls / .csv compatible)
  const handleDownloadExcel = () => {
    try {
      const formattedItemsHtml = items.map((item, idx) => {
        const d = getItemBreakdownDetails(item);
        return `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="text-align: center; border: 1px solid #94a3b8; padding: 8px 10px; font-weight: bold; vertical-align: middle;">${idx + 1}</td>
          <td style="text-align: left; border: 1px solid #94a3b8; padding: 8px 12px; vertical-align: middle;">
            <div style="font-weight: 900; font-size: 11pt; color: #0f172a; text-transform: uppercase; margin-bottom: 3px;">${d.rawName}</div>
            <div style="font-size: 9pt; font-weight: bold;">
              <span style="color: #b45309;">📦 ${d.petis}</span> &nbsp;•&nbsp;
              <span style="color: #0284c7;">🍱 ${d.trays}</span> &nbsp;•&nbsp;
              <span style="color: #15803d;">🏷️ ${d.eggs}</span>
            </div>
          </td>
          <td style="text-align: center; border: 1px solid #94a3b8; padding: 8px 10px; font-weight: 900; color: #15803d; vertical-align: middle;">${item.quantity}</td>
          <td style="text-align: right; border: 1px solid #94a3b8; padding: 8px 12px; font-weight: 600; vertical-align: middle;">${currency} ${(item.price || 0).toLocaleString()}</td>
          <td style="text-align: right; border: 1px solid #94a3b8; padding: 8px 12px; font-weight: 900; color: #0f172a; vertical-align: middle;">${currency} ${((item.quantity || 1) * (item.price || 0)).toLocaleString()}</td>
        </tr>
      `;
      }).join('');

      const excelTemplate = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
          <!--[if gte mso 9]>
          <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Official Bill Invoice</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            body, table, td, th { font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 11pt; }
            table { border-collapse: collapse; }
            .header-banner { background-color: #166534; color: #ffffff; font-size: 16pt; font-weight: bold; text-align: center; height: 42px; border: 1px solid #14532d; }
            .sub-banner { background-color: #dcfce7; color: #166534; font-size: 10pt; font-weight: bold; text-align: center; height: 26px; border: 1px solid #86efac; }
            .info-label { background-color: #f1f5f9; font-weight: bold; color: #334155; padding: 6px 12px; border: 1px solid #94a3b8; font-size: 10pt; width: 140px; }
            .info-val { background-color: #ffffff; color: #0f172a; padding: 6px 12px; border: 1px solid #94a3b8; font-size: 10pt; font-weight: 600; }
            .col-header { background-color: #15803d; color: #ffffff; font-weight: bold; font-size: 11pt; padding: 8px 10px; border: 1px solid #166534; text-transform: uppercase; text-align: center; }
            .total-row { background-color: #dcfce7; color: #15803d; font-weight: 900; font-size: 13pt; height: 38px; border: 2px solid #22c55e; }
            .footer-note { font-size: 9pt; color: #64748b; font-style: italic; text-align: center; }
          </style>
        </head>
        <body>
          <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse; width:100%;">
            <tr>
              <td colspan="5" class="header-banner">${shopName.toUpperCase()}</td>
            </tr>
            <tr>
              <td colspan="5" class="sub-banner">OFFICIAL BILL INVOICE &amp; PAYMENT STATEMENT</td>
            </tr>
            <tr style="height: 10px;"><td colspan="5" style="border:none;"></td></tr>
            <tr>
              <td class="info-label">Invoice ID:</td>
              <td class="info-val" style="font-weight: 900; color: #15803d;">${invoiceDisplay}</td>
              <td style="width: 20px; border:none;"></td>
              <td class="info-label">Transaction Date:</td>
              <td class="info-val">${saleDate}</td>
            </tr>
            <tr>
              <td class="info-label">Serial Number:</td>
              <td class="info-val" style="font-weight: 900;">#${serialNo}</td>
              <td style="border:none;"></td>
              <td class="info-label">Payment Status:</td>
              <td class="info-val" style="color: #15803d; font-weight: bold;">${bill.paymentMethod === 'BANK_TRANSFER' ? 'Bank Transfer (Approved)' : 'Paid in Cash'}</td>
            </tr>
            <tr>
              <td class="info-label">Customer Name:</td>
              <td class="info-val" style="font-weight: bold;">${customerName}</td>
              <td style="border:none;"></td>
              <td class="info-label">Customer Phone / Email:</td>
              <td class="info-val" style="mso-number-format:'\\@'; font-weight: bold;">${customerPhone ? `="${customerPhone}"` : ''} ${customerEmail ? `(${customerEmail})` : ''}</td>
            </tr>
            <tr>
              <td class="info-label">Store / Branch:</td>
              <td class="info-val">${shopName}</td>
              <td style="border:none;"></td>
              <td class="info-label">Branch Bank:</td>
              <td class="info-val">${branchBank.bank} (${branchBank.accountNo})</td>
            </tr>
            <tr style="height: 14px;"><td colspan="5" style="border:none;"></td></tr>
            <tr style="height: 32px;">
              <th class="col-header" style="width: 50px;">#</th>
              <th class="col-header" style="width: 260px; text-align: left;">Item Description</th>
              <th class="col-header" style="width: 90px;">Quantity</th>
              <th class="col-header" style="width: 140px; text-align: right;">Unit Price (${currency})</th>
              <th class="col-header" style="width: 150px; text-align: right;">Subtotal (${currency})</th>
            </tr>
            ${formattedItemsHtml}
            <tr style="height: 10px;"><td colspan="5" style="border:none;"></td></tr>
            <tr class="total-row">
              <td colspan="3" style="text-align: right; padding-right: 15px; border: 1px solid #86efac;">GRAND TOTAL AMOUNT PAID:</td>
              <td colspan="2" style="text-align: right; padding-right: 12px; color: #15803d; border: 1px solid #86efac;">${currency} ${totalAmount.toLocaleString()}</td>
            </tr>
            <tr style="height: 16px;"><td colspan="5" style="border:none;"></td></tr>
            <tr>
              <td colspan="5" class="footer-note" style="border:none;">Generated via Maidan Perfume Shop Management System • Verified Official Receipt</td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Bill_${invoiceDisplay}_${customerName.replace(/\s+/g, '_')}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Formatted Excel spreadsheet downloaded successfully!');
    } catch (err) {
      console.error('Excel export error:', err);
      toast.error('Failed to generate Excel file.');
    }
  };

  // Format clean international phone number for Pakistan (e.g. 03069578493 -> 923069578493)
  const formatCleanPhone = (phone) => {
    let clean = String(phone || '').replace(/\D/g, '');
    if (clean.startsWith('0092')) clean = '92' + clean.slice(4);
    else if (clean.startsWith('0')) clean = '92' + clean.slice(1);
    else if (clean.length === 10 && clean.startsWith('3')) clean = '92' + clean;
    return clean;
  };

  // Build clean comprehensive WhatsApp bill invoice text representation
  const getWhatsAppMessageText = () => {
    let text = `🧾 *OFFICIAL BILL INVOICE - ${shopName.toUpperCase()}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🔢 *Invoice:* ${invoiceDisplay} (Serial: #${serialNo})\n`;
    text += `📅 *Date:* ${saleDate}\n`;
    text += `👤 *Customer:* ${customerName}\n`;
    if (targetPhone || customerPhone) text += `📞 *Phone:* ${targetPhone || customerPhone}\n`;
    if (customerEmail) text += `📧 *Email:* ${customerEmail}\n`;
    text += `🏦 *Branch Bank:* ${branchBank.bank}\n`;
    text += `💳 *Account No:* ${branchBank.accountNo}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📦 *ITEMS PURCHASED:*\n`;
    items.forEach((item, idx) => {
      const d = getItemBreakdownDetails(item);
      text += `${idx + 1}. *${d.rawName.toUpperCase()}*\n   📦 *${d.petis}* | 🍱 *${d.trays}* | 🏷️ *${d.eggs}*\n   Qty: ${item.quantity} x ${currency} ${(item.price || 0).toLocaleString()} = *${currency} ${((item.quantity || 1) * (item.price || 0)).toLocaleString()}*\n`;
    });
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💵 *GRAND TOTAL PAID: ${currency} ${totalAmount.toLocaleString()}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📄 *Official A4 PDF Bill Receipt has been issued & saved.*\n`;
    text += `🙏 *Thank you for shopping with ${shopName}!*`;
    return text;
  };

  // 3. WhatsApp: Generate PDF + Open WhatsApp Options
  const handleWhatsAppShare = () => {
    try {
      downloadPDF();
      setShowWhatsAppPrompt(true);
    } catch (err) {
      console.error('WhatsApp PDF download error:', err);
      setShowWhatsAppPrompt(true);
    }
  };

  // Direct Open WhatsApp with Customer & PDF Downloaded + Pre-filled Invoice
  const handleDirectSharePDFFile = () => {
    try {
      downloadPDF();
      const cleanPhone = formatCleanPhone(targetPhone || customerPhone);
      const text = getWhatsAppMessageText();
      const encodedText = encodeURIComponent(text);

      if (cleanPhone) {
        window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`, '_blank');
        toast.success(`PDF downloaded! Opening WhatsApp Web chat with +${cleanPhone}`);
      } else {
        window.open(`https://web.whatsapp.com/send?text=${encodedText}`, '_blank');
        toast.success('PDF downloaded! Opening WhatsApp Web');
      }
      setShowWhatsAppPrompt(false);
    } catch (err) {
      console.error('WhatsApp open error:', err);
      toast.error('Failed to open WhatsApp.');
    }
  };

  // Direct send to entered number via universal wa.me link
  const handleSendToNumber = (phoneToSend) => {
    downloadPDF();
    const cleanPhone = formatCleanPhone(phoneToSend || targetPhone || customerPhone);
    const text = getWhatsAppMessageText();
    const encodedText = encodeURIComponent(text);

    if (cleanPhone) {
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
      window.open(whatsappUrl, '_blank');
      toast.success(`PDF downloaded! Opening WhatsApp chat with +${cleanPhone}`);
    } else {
      window.open(`https://web.whatsapp.com/send?text=${encodedText}`, '_blank');
      toast.success('PDF downloaded! Opening WhatsApp Web');
    }
    setShowWhatsAppPrompt(false);
  };

  // Direct send via web.whatsapp.com directly
  const handleSendViaWhatsAppWeb = (phoneToSend) => {
    downloadPDF();
    const cleanPhone = formatCleanPhone(phoneToSend || targetPhone || customerPhone);
    const text = getWhatsAppMessageText();
    const encodedText = encodeURIComponent(text);

    if (cleanPhone) {
      const whatsappUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
      window.open(whatsappUrl, '_blank');
      toast.success(`PDF downloaded! Opening WhatsApp Web with +${cleanPhone}`);
    } else {
      window.open(`https://web.whatsapp.com/send?text=${encodedText}`, '_blank');
      toast.success('PDF downloaded! Opening WhatsApp Web to choose contact');
    }
    setShowWhatsAppPrompt(false);
  };

  // Open general WhatsApp (works with ANY contact / group without error)
  const handleOpenGeneralWhatsApp = () => {
    downloadPDF();
    const text = getWhatsAppMessageText();
    const encodedText = encodeURIComponent(text);
    window.open(`https://web.whatsapp.com/send?text=${encodedText}`, '_blank');
    toast.success('PDF downloaded! Opening WhatsApp Web with bill message.');
    setShowWhatsAppPrompt(false);
  };

  // Copy bill text to clipboard
  const handleCopyBillText = () => {
    const text = getWhatsAppMessageText();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success('Bill text copied to clipboard!');
    }
  };

  // 4. Print Clean Bill Receipt
  const handlePrint = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    let itemsHtml = items.map((item, idx) => {
      const d = getItemBreakdownDetails(item);
      return `
      <tr>
        <td style="padding:10px; border:1px solid #cbd5e1; text-align:center; vertical-align:middle; color:#0f172a; font-weight:bold;">${idx + 1}</td>
        <td style="padding:10px; border:1px solid #cbd5e1; vertical-align:middle;">
          <div style="font-weight:900; font-size:13px; text-transform:uppercase; color:#0f172a; margin-bottom:4px;">${d.rawName}</div>
          <div style="display:flex; flex-wrap:wrap; gap:6px; font-size:10px; font-weight:800;">
            <span style="background:#f1f5f9; color:#0f172a; padding:2px 7px; border-radius:4px; border:1px solid #cbd5e1;">📦 ${d.petis}</span>
            <span style="background:#f1f5f9; color:#0f172a; padding:2px 7px; border-radius:4px; border:1px solid #cbd5e1;">🍱 ${d.trays}</span>
            <span style="background:#f1f5f9; color:#0f172a; padding:2px 7px; border-radius:4px; border:1px solid #cbd5e1;">🏷️ ${d.eggs}</span>
          </div>
        </td>
        <td style="padding:10px; border:1px solid #cbd5e1; text-align:center; vertical-align:middle; font-weight:900; color:#0f172a;">${item.quantity}</td>
        <td style="padding:10px; border:1px solid #cbd5e1; text-align:right; vertical-align:middle; color:#0f172a;">${currency} ${(item.price || 0).toLocaleString()}</td>
        <td style="padding:10px; border:1px solid #cbd5e1; text-align:right; vertical-align:middle; font-weight:900; color:#0f172a;">${currency} ${((item.quantity || 1) * (item.price || 0)).toLocaleString()}</td>
      </tr>
    `;
    }).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bill Receipt - #${serialNo} (${customerName})</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #0f172a; background: #ffffff; }
            .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
            .header h1 { margin: 0; color: #0f172a; text-transform: uppercase; font-size: 22px; font-weight: 900; }
            .header p { margin: 4px 0 0; color: #475569; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
            .meta { display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; margin-bottom: 16px; background: #f8fafc; padding: 12px 16px; border-radius: 10px; border: 1px solid #cbd5e1; }
            .serial-tag { background: #0f172a; color: #ffffff; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 900; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
            th { background: #f1f5f9; text-transform: uppercase; font-weight: 900; font-size: 10px; color: #0f172a; padding: 8px 10px; border: 1px solid #cbd5e1; text-align: left; }
            .total-bar { margin-top: 16px; padding: 12px 16px; background: #f1f5f9; border: 2px solid #cbd5e1; border-radius: 10px; display: flex; justify-content: space-between; font-weight: 900; font-size: 15px; color: #0f172a; }
            .bank-info { margin-top: 12px; padding: 10px 14px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 10px; color: #0f172a; font-weight: bold; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 10px; font-weight: 800; color: #64748b; }
            .sign { border-top: 2px solid #cbd5e1; width: 180px; text-align: center; padding-top: 6px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${shopName}</h1>
            <p>Official Sales Bill & Tax Receipt</p>
          </div>
          <div class="meta">
            <div>
              <span style="color:#0f172a; text-transform:uppercase; font-weight:800;">Customer:</span> <strong style="font-size:13px; color:#0f172a;">${customerName}</strong><br/>
              ${customerPhone ? `<span>Phone: ${customerPhone}</span><br/>` : ''}
              ${customerEmail ? `<span>Email: ${customerEmail}</span><br/>` : ''}
              <span>Payment: ${bill.paymentMethod === 'CREDIT' || bill.dueAmount > 0 || bill.isCredit ? 'Credit (Due Balance)' : (bill.paymentMethod === 'BANK_TRANSFER' || bill.paymentMethod === 'ONLINE' || bill.paymentMethod === 'BANK' ? 'Bank Transfer' : 'Cash Paid')}</span>
            </div>
            <div style="text-align:right;">
              <span class="serial-tag">SERIAL NO: #${serialNo}</span><br/>
              <span style="display:inline-block; margin-top:5px; color:#64748b;">Invoice: ${invoiceDisplay}</span><br/>
              <span style="color:#64748b;">Date: ${saleDate}</span>
            </div>
          </div>

          <div class="bank-info">
            Official Branch Bank Account: <strong>${branchBank.bank} (${branchBank.accountNo})</strong>
          </div>

          <table>
            <thead>
              <tr>
                <th style="text-align:center;">#</th>
                <th>Item Description</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Unit Price</th>
                <th style="text-align:right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="total-bar">
            <span>GRAND TOTAL AMOUNT PAID:</span>
            <span>${currency} ${totalAmount.toLocaleString('en-PK')}</span>
          </div>

          <!-- Official Smart Bill Verification Barcode & QR Code on printed receipt -->
          <div style="margin-top: 18px; padding: 12px 16px; border: 1.5px dashed #cbd5e1; border-radius: 10px; background: #f8fafc; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="background:#fff; padding:4px 8px; border-radius:6px; border:1px solid #cbd5e1; display:inline-block;">
                ${billBarcodeRef.current ? billBarcodeRef.current.outerHTML : ''}
              </div>
              <div style="font-size: 9px; font-weight: 800; font-family: monospace; color: #475569; margin-top: 4px;">
                OFFICIAL INVOICE: ${invoiceDisplay} (SERIAL: #${serialNo})
              </div>
              <div style="font-size: 8px; color: #64748b; margin-top: 1px;">
                Valid for Returns, Warranty & Verification
              </div>
            </div>
            ${billQrUrl ? `
            <div style="text-align: center; margin-left: 14px;">
              <img src="${billQrUrl}" style="width: 70px; height: 70px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; padding: 2px;" />
              <div style="font-size: 7.5px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-top: 3px;">
                📱 Scan To View Online
              </div>
            </div>` : ''}
          </div>

          <div class="footer">
            <div class="sign">Customer Signature</div>
            <div class="sign">Maidan Perfume Shop Stamp</div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-100 border border-slate-300 rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-slate-900">

        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-100 flex items-center justify-between border-b border-slate-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl border border-slate-300 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black uppercase tracking-wider text-slate-900">Walk-in Sale Bill</h2>
                <span className="px-2.5 py-0.5 bg-white text-slate-900 font-mono font-black text-xs rounded-md border border-slate-300 shadow-xs">
                  #{serialNo}
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{invoiceDisplay} • COMPLETED</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-600 hover:text-black rounded-full bg-white hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bill Printable Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 print:p-0 print:bg-white print:text-black bg-slate-100">
          {/* Shop & Customer details */}
          <div className="bg-slate-50 border border-slate-300 rounded-2xl p-3.5 space-y-2.5 shadow-xs">
            <div className="flex justify-between items-start border-b border-slate-300 pb-2.5">
              <div>
                <h3 className="font-black text-sm text-slate-900 uppercase italic">{shopName}</h3>
                {shopAddress && <p className="text-[10.5px] text-slate-600 font-medium">{shopAddress}</p>}
                {shopPhone && <p className="text-[10.5px] text-slate-900 font-bold">{shopPhone}</p>}
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5 mb-1">
                  <span className="text-[10px] font-mono font-bold text-slate-600 mr-2">Invoice: #{serialNo}</span>
                  {Number(bill.dueAmount) > 0 && (Number(bill.cashPaid) > 0 || Number(bill.bankPaid) > 0) ? (
                    <span className="inline-block px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-slate-900 text-white border border-slate-700 shadow-xs">
                      ⚡ PARTIAL / CREDIT
                    </span>
                  ) : bill.paymentMethod === 'CREDIT' || Number(bill.dueAmount) >= totalAmount || bill.isCredit ? (
                    <span className="inline-block px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-slate-900 text-white border border-slate-700 shadow-xs">
                      📋 CREDIT
                    </span>
                  ) : bill.paymentMethod === 'BANK_TRANSFER' || bill.paymentMethod === 'ONLINE' || bill.paymentMethod === 'BANK' || Number(bill.bankPaid) > 0 ? (
                    <span className="inline-block px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-slate-900 text-white border border-slate-700 shadow-xs">
                      🏦 BANK TRANSFER
                    </span>
                  ) : (
                    <span className="inline-block px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-slate-900 text-white border border-slate-700 shadow-xs">
                      💵 CASH PAID
                    </span>
                  )}
                </div>
                <p className="text-[9px] text-slate-600 font-medium">{saleDate}</p>
              </div>
            </div>

            {/* Branch bank: white background, black text */}
            <div className="bg-white border border-slate-300 rounded-xl p-2.5 text-xs flex justify-between items-center text-slate-900 font-mono shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">Branch Bank ({branchBank.bank}):</span>
              <span className="font-bold bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300 text-slate-900">{branchBank.accountNo}</span>
            </div>

            {/* Customer Details: pure white cards! */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="bg-white border border-slate-300 rounded-xl p-2.5 shadow-xs">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Customer Name</span>
                <span className="font-black text-slate-900 uppercase truncate block">{customerName}</span>
              </div>
              {customerPhone && (
                <div className="bg-white border border-slate-300 rounded-xl p-2.5 shadow-xs">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">WhatsApp / Phone</span>
                  <span className="font-black text-slate-900 block">{customerPhone}</span>
                </div>
              )}
              {customerEmail && (
                <div className="bg-white border border-slate-300 rounded-xl p-2.5 shadow-xs">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Customer Email</span>
                  <span className="font-bold text-slate-900 font-mono text-[11px] truncate block">{customerEmail}</span>
                </div>
              )}
            </div>
          </div>

          {/* Purchased Items List: white writing area! */}
          <div className="border border-slate-300 rounded-2xl overflow-hidden bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-[10px] font-black text-slate-700 uppercase tracking-wider border-b border-slate-300">
                <tr>
                  <th className="p-2.5">Item</th>
                  <th className="p-2.5 text-center">Qty</th>
                  <th className="p-2.5 text-right">Price</th>
                  <th className="p-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium bg-white">
                {items.map((item, idx) => {
                  const d = getItemBreakdownDetails(item);
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <div className="space-y-1.5">
                          <p className="font-black text-slate-900 text-xs tracking-wide uppercase">{d.rawName}</p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-slate-900 text-[10px] font-bold">
                              <span>📦</span> {d.petis}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-slate-900 text-[10px] font-bold">
                              <span>🍱</span> {d.trays}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-slate-900 text-[10px] font-bold">
                              <span>🏷️</span> {d.eggs}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center align-middle">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-300 text-slate-900 font-mono font-black text-xs">
                          {item.quantity}
                        </span>
                      </td>
                      <td className="p-3 text-right align-middle text-slate-700 font-mono text-xs font-semibold">
                        {currency} {(item.price || 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-right align-middle font-mono font-black text-slate-900 text-sm">
                        {currency} {((item.quantity || 1) * (item.price || 0)).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Grand Total Area */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-300 space-y-2">
              <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-300 shadow-xs">
                <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Grand Total Amount</span>
                <span className="text-xl font-black text-slate-900">{currency} {totalAmount.toLocaleString()}</span>
              </div>
              {Number(bill.dueAmount) > 0 && (Number(bill.cashPaid) > 0 || Number(bill.bankPaid) > 0) && (
                <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-300 bg-white p-2.5 rounded-xl">
                  <span className="text-slate-700 font-bold uppercase text-[10px]">
                    💵 Paid ({Number(bill.bankPaid) > 0 ? 'Bank' : 'Cash'}): <strong className="text-slate-900 font-black">{currency} {(Number(bill.cashPaid) || Number(bill.bankPaid) || 0).toLocaleString()}</strong>
                  </span>
                  <span className="text-slate-700 font-bold uppercase text-[10px]">
                    ⚠️ Credit Due: <strong className="text-slate-900 font-black">{currency} {(Number(bill.dueAmount) || 0).toLocaleString()}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Smart Digital Receipt Barcode & QR Verification Card */}
            <div className="bg-slate-50 border-t border-slate-300 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="p-1 rounded-md bg-white border border-slate-300 text-slate-900">
                    <BarcodeIcon className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[10px] font-black uppercase text-slate-900 tracking-wider">
                    Official Bill Barcode
                  </span>
                </div>
                <div className="bg-white p-1.5 rounded-lg border border-slate-300 shadow-2xs">
                  <svg ref={billBarcodeRef} className="max-w-[170px] h-auto" />
                </div>
                <span className="text-[9px] font-mono font-bold text-slate-600 mt-1">
                  Invoice ID: {invoiceDisplay}
                </span>
              </div>

              {billQrUrl && (
                <div className="flex flex-col items-center justify-center p-2.5 bg-white rounded-xl border border-slate-300 shrink-0 text-center shadow-2xs">
                  <img src={billQrUrl} alt="Bill QR" className="w-16 h-16 rounded-md" />
                  <span className="text-[8px] font-black text-slate-900 uppercase mt-1 flex items-center gap-0.5">
                    <Smartphone className="w-2.5 h-2.5" />
                    <span>Scan with Phone</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyBillLink}
                    className="text-[8.5px] text-slate-700 hover:text-black font-bold uppercase mt-1 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-2.5 h-2.5 text-slate-900" /> : <Copy className="w-2.5 h-2.5" />}
                    <span>{copiedLink ? "Copied" : "Copy Link"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions (3 Buttons: Excel, WhatsApp PDF, Print) */}
        <div className="p-3 sm:p-4 bg-slate-100 border-t border-slate-300 grid grid-cols-3 gap-2">
          {/* 1. Excel Download */}
          <button
            onClick={handleDownloadExcel}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-white hover:bg-slate-200 text-slate-900 font-bold text-[10.5px] uppercase tracking-wider rounded-xl border border-slate-300 transition-all shadow-xs cursor-pointer active:scale-95"
            title="Export Excel (.csv)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-900" /> Save Excel
          </button>

          {/* 2. WhatsApp Direct PDF Share */}
          <button
            onClick={handleWhatsAppShare}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-slate-800 hover:bg-black text-white font-black text-[10.5px] uppercase tracking-wider rounded-xl border border-slate-700 transition-all shadow-md cursor-pointer active:scale-95"
            title="Send PDF directly to WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5 text-white" /> WhatsApp
          </button>

          {/* 3. Print Receipt */}
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-black hover:bg-slate-800 text-white font-black text-[10.5px] uppercase tracking-wider rounded-xl border border-black transition-all shadow-md cursor-pointer active:scale-95"
            title="Print Clean Bill Receipt"
          >
            <Printer className="w-3.5 h-3.5 text-white" /> Print Bill
          </button>
        </div>

        {/* WhatsApp Share Options Prompt Modal */}
        {showWhatsAppPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white border-2 border-slate-300 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-900">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase text-slate-900">Send PDF Bill on WhatsApp</h3>
                    <p className="text-[10px] text-slate-600 font-bold">Official Invoice #{serialNo}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWhatsAppPrompt(false)}
                  className="text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10.5px] font-black uppercase text-slate-700 tracking-wider block">
                  Customer WhatsApp Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 03069578493"
                    value={targetPhone}
                    onChange={e => setTargetPhone(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-black font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleDirectSharePDFFile}
                    className="px-4 py-2.5 bg-black hover:bg-slate-800 text-white font-black text-xs uppercase rounded-xl tracking-wider transition-all cursor-pointer shadow-md active:scale-95 flex items-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Send PDF
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-2">
                {/* Primary: Send PDF Bill directly */}
                <button
                  type="button"
                  onClick={handleDirectSharePDFFile}
                  className="w-full py-3 bg-black hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Send PDF Bill</span>
                </button>

                {/* Secondary Actions: Save PDF & Web WhatsApp */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={downloadPDF}
                    className="py-2.5 px-2 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>📄 Save PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendViaWhatsAppWeb(targetPhone)}
                    className="py-2.5 px-2 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>💻 WhatsApp Web</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
