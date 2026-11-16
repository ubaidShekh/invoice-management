import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';

const API_BASE_URL = 'https://invoice-python-api-q2oq.onrender.com';

type Product = { model: string; size: string; product_code?: string; };
type InvoiceItem = { _id: string; invoice_number: string; products: Product[]; selected_product: Product; name: string; };
type PdfItem = { filename: string; file_size: number; total_invoices: number; total_delivery_items?: number; uploaded_at: string; };
type PrintAllInvoice = { filename: string; invoice_number: string; products: Product[]; selected_product: Product; };
type DeliveryItem = { _id: string; invoice: string; model: string; size: string; barcode: string; status: 'Pending' | 'Delivered'; filename: string; date: string; };

export default function PdfViewerPage() {
  const [pdfs, setPdfs] = useState<PdfItem[]>([]);
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  // Delivery Items (PDF Viewer specific)
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItem[]>([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryBarcode, setDeliveryBarcode] = useState('');
  const [delivering, setDelivering] = useState(false);
  const [deliveryMessage, setDeliveryMessage] = useState('');
  const deliveryInputRef = useRef<HTMLInputElement>(null);

  // Delete
  const [selectedFilenames, setSelectedFilenames] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Print All
  const [showPrintAllView, setShowPrintAllView] = useState(false);
  const [printAllInvoices, setPrintAllInvoices] = useState<PrintAllInvoice[]>([]);
  const [loadingAllInvoices, setLoadingAllInvoices] = useState(false);
  const [editingPrintAllInvoice, setEditingPrintAllInvoice] = useState<string | null>(null);
  const [printingAll, setPrintingAll] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPdfs = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${API_BASE_URL}/api/pdf-files`);
      setPdfs(response.data);
      setSelectedFilenames([]);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch PDFs.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryItems = async () => {
    try {
      setDeliveryLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/pdf-viewer-delivery-items`);
      setDeliveryItems(response.data);
    } catch (err: any) {
      console.error('Failed to fetch PDF viewer delivery items', err);
    } finally {
      setDeliveryLoading(false);
    }
  };

  const handleDeliverItem = async (barcodeValue: string) => {
    const code = barcodeValue.trim();
    if (!code) {
      setDeliveryMessage('Please enter or scan a barcode.');
      if (deliveryInputRef.current) deliveryInputRef.current.focus();
      return;
    }
    if (delivering) return;

    try {
      setDelivering(true);
      setDeliveryMessage('');
      const response = await axios.post(`${API_BASE_URL}/api/pdf-viewer-delivery-items/scan`, { barcode: code });
      setDeliveryMessage(`✅ ${response.data.message}`);
      setDeliveryBarcode('');
      await fetchDeliveryItems();
    } catch (err: any) {
      setDeliveryMessage(`❌ ${err.response?.data?.detail || 'Failed to deliver item'}`);
    } finally {
      setDelivering(false);
      setTimeout(() => { if (deliveryInputRef.current) deliveryInputRef.current.focus(); }, 100);
    }
  };

  const handleDeliveryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleDeliverItem(deliveryBarcode);
    }
  };

  const handleFileChange = async (e: any) => {
    const selectedFiles = Array.from(e.target.files || []) as File[];
    if (selectedFiles.length === 0) return;
    try {
      setUploading(true);
      setMessage('');
      setError('');
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append('invoices', file, file.name));
      const response = await axios.post(`${API_BASE_URL}/upload_pdf_viewer`, formData, {
        timeout: 300000,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(`✅ ${response.data.total_files_processed} file(s) uploaded successfully.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchPdfs();
      await fetchDeliveryItems();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const triggerUpload = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handlePrintAllClick = async () => {
    try {
      setLoadingAllInvoices(true);
      setShowPrintAllView(true);
      setError('');
      setMessage('');
      const allInvoices: PrintAllInvoice[] = [];
      for (const pdf of pdfs) {
        try {
          const response = await axios.get(`${API_BASE_URL}/api/pdf-invoice-details/${encodeURIComponent(pdf.filename)}`);
          for (const inv of response.data.invoices) {
            const products = inv.products || [];
            const selected = products[0] || { model: 'N/A', size: 'N/A' };
            allInvoices.push({
              filename: pdf.filename,
              invoice_number: inv.invoice_number,
              products: products,
              selected_product: selected,
            });
          }
        } catch (e) {
          console.log(`Failed to fetch invoices for ${pdf.filename}`);
        }
      }
      setPrintAllInvoices(allInvoices);
    } catch (err: any) {
      setError('Failed to load all invoices.');
    } finally {
      setLoadingAllInvoices(false);
    }
  };

  const handlePrintAllProductChange = (index: number, product: Product) => {
    setPrintAllInvoices(prev => prev.map((inv, i) =>
      i === index ? { ...inv, selected_product: product } : inv
    ));
    setEditingPrintAllInvoice(null);
  };

  const generateAndPrintAll = async () => {
    try {
      setPrintingAll(true);
      setError('');
      setMessage('⏳ Generating merged PDF. Please wait...');

      const selections = printAllInvoices.map(inv => ({
        filename: inv.filename,
        invoice_number: inv.invoice_number,
        model: inv.selected_product?.model || 'N/A',
        size: inv.selected_product?.size || 'N/A',
      }));

      const response = await axios.post(
        `${API_BASE_URL}/api/pdf-print-all-with-selections`,
        { selections },
        { responseType: 'blob', timeout: 180000 }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      setMessage('✅ PDF generated. Opening print dialog...');

      const newWindow = window.open(blobUrl, '_blank');
      if (newWindow) {
        setTimeout(() => {
          try { newWindow.focus(); newWindow.print(); } catch (e) { }
        }, 2000);
      } else {
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
        iframe.src = blobUrl;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          setTimeout(() => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
            } catch (e) {
              const link = document.createElement('a');
              link.href = blobUrl;
              link.download = 'all-invoices-with-footer.pdf';
              link.click();
              setMessage('✅ PDF downloaded. Please open and print manually.');
            }
          }, 1000);
        };
        setTimeout(() => {
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        }, 60000);
      }

      setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
      setTimeout(() => setShowPrintAllView(false), 3000);
    } catch (err: any) {
      console.error('Print All Error:', err);
      setError('Failed to generate combined PDF. Please try again.');
    } finally {
      setPrintingAll(false);
    }
  };

  const openPdf = async (filename: string) => {
    setDetailsLoading(true);
    setSelectedPdf(filename);
    setError('');
    setInvoices([]);
    setGeneratedPdfUrl(null);
    setPdfError(false);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/pdf-invoice-details/${encodeURIComponent(filename)}`);
      setInvoices(response.data.invoices);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load PDF details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchPdfs();
    fetchDeliveryItems();
  }, []);

  useEffect(() => {
    if (deliveryInputRef.current && !delivering) {
      setTimeout(() => { deliveryInputRef.current?.focus(); }, 300);
    }
  }, [deliveryItems]);

  const handleProductChange = (invoiceId: string, product: Product) => {
    setInvoices(prev => prev.map(inv => inv._id === invoiceId ? { ...inv, selected_product: product } : inv));
    setEditingInvoiceId(null);
    if (generatedPdfUrl) setGeneratedPdfUrl(null);
  };

  const generatePdf = async () => {
    if (!selectedPdf) return;
    try {
      setGenerating(true);
      setError('');
      setPdfError(false);
      const selections = invoices.map(inv => ({
        invoice_number: inv.invoice_number,
        model: inv.selected_product?.model || 'N/A',
        size: inv.selected_product?.size || 'N/A',
      }));
      const response = await axios.post(
        `${API_BASE_URL}/api/pdf-with-footer/${encodeURIComponent(selectedPdf)}`,
        { selections },
        { responseType: 'blob', timeout: 120000 }
      );
      const blobUrl = URL.createObjectURL(response.data);
      if (generatedPdfUrl && generatedPdfUrl.startsWith('blob:')) URL.revokeObjectURL(generatedPdfUrl);
      setGeneratedPdfUrl(blobUrl);
      setMessage('✅ PDF generated successfully with footer data!');
    } catch (err: any) {
      setError('Failed to generate PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!generatedPdfUrl) return;
    const printWindow = window.open(generatedPdfUrl, '_blank');
    if (printWindow) setTimeout(() => { try { printWindow.print(); } catch (e) { } }, 2000);
  };

  const handleReset = () => {
    if (generatedPdfUrl && generatedPdfUrl.startsWith('blob:')) URL.revokeObjectURL(generatedPdfUrl);
    setGeneratedPdfUrl(null);
    setMessage('');
    setPdfError(false);
  };

  const toggleSelectFile = (filename: string) => {
    setSelectedFilenames(prev =>
      prev.includes(filename) ? prev.filter(f => f !== filename) : [...prev, filename]
    );
  };

  const toggleSelectAll = () => {
    if (selectedFilenames.length === pdfs.length) setSelectedFilenames([]);
    else setSelectedFilenames(pdfs.map(p => p.filename));
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      setError('');
      const response = await axios.post(`${API_BASE_URL}/api/pdf-files/delete-bulk`, { filenames: selectedFilenames });
      setMessage(`✅ ${response.data.message}`);
      setShowDeleteModal(false);
      setSelectedFilenames([]);
      await fetchPdfs();
      await fetchDeliveryItems();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Delete failed.');
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (date?: string) => !date ? '-' : new Date(date).toLocaleString();
  const formatSize = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  const allSelected = pdfs.length > 0 && selectedFilenames.length === pdfs.length;

  const pendingDeliveryCount = deliveryItems.filter(i => i.status === 'Pending').length;
  const deliveredCount = deliveryItems.filter(i => i.status === 'Delivered').length;

  const deliveryCell = (width: number, bold = false) => ({
    width, paddingVertical: 10, paddingHorizontal: 8, fontSize: 11,
    fontWeight: bold ? '600' as const : '400' as const,
    color: bold ? '#475569' : '#334155',
    justifyContent: 'center' as const,
  });

  return (
    <View style={{ flex: 1, minHeight: '100vh' as any, padding: 24, background: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)' } as any}>
      <View style={{ width: '100%', maxWidth: '100%', alignSelf: 'center' }}>

        {React.createElement('input', {
          ref: fileInputRef, type: 'file', accept: 'application/pdf', multiple: true,
          onChange: handleFileChange, style: { display: 'none' },
        })}

        {/* Header */}
        <View style={{ marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
          <View>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Document Workspace</Text>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>PDF Viewer & Delivery</Text>
            <Text style={{ fontSize: 12, color: '#475569' }}>Manage PDFs and their delivery items separately.</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {(selectedPdf || showPrintAllView) && (
              <Pressable
                onPress={() => { setSelectedPdf(null); setShowPrintAllView(false); setInvoices([]); setPrintAllInvoices([]); setError(''); handleReset(); setMessage(''); }}
                style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 4 }}
              >
                <Text style={{ color: '#475569', fontSize: 12, fontWeight: '600' }}>← Back</Text>
              </Pressable>
            )}

            {!selectedPdf && !showPrintAllView && pdfs.length > 0 && (
              <Pressable
                onPress={handlePrintAllClick}
                disabled={loadingAllInvoices}
                style={{
                  backgroundColor: loadingAllInvoices ? '#94A3B8' : '#0F172A',
                  paddingVertical: 8, paddingHorizontal: 16, borderRadius: 4,
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                } as any}
              >
                <Text style={{ fontSize: 13 }}>🖨</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
                  {loadingAllInvoices ? 'Loading...' : 'Print All'}
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={triggerUpload}
              disabled={uploading}
              style={{
                backgroundColor: uploading ? '#94A3B8' : '#2563EB',
                paddingVertical: 8, paddingHorizontal: 16, borderRadius: 4,
                flexDirection: 'row', alignItems: 'center', gap: 6,
              } as any}
            >
              <Text style={{ fontSize: 13 }}>📤</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
                {uploading ? 'Uploading...' : 'Upload PDF'}
              </Text>
            </Pressable>
          </View>
        </View>

        {!!error && (
          <View style={{ backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', padding: 10, borderRadius: 4, marginBottom: 12 }}>
            <Text style={{ color: '#B91C1C', fontSize: 12 }}>❌ {error}</Text>
          </View>
        )}
        {!!message && (
          <View style={{ backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', padding: 10, borderRadius: 4, marginBottom: 12 }}>
            <Text style={{ color: '#15803D', fontSize: 12 }}>{message}</Text>
          </View>
        )}

        {/* Scanner Card */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 4, borderWidth: 2, borderColor: '#2563EB', padding: 14, marginBottom: 16, boxShadow: '0 4px 6px rgba(37, 99, 235, 0.08)' } as any}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <View style={{ width: 30, height: 30, backgroundColor: '#EFF6FF', borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <Text style={{ fontSize: 15 }}>▥</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>PDF Viewer Barcode Scanner</Text>
              <Text style={{ fontSize: 11, color: '#2563EB' }}>🟢 Ready — Only for PDF Viewer items</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <View style={{ backgroundColor: '#FFF7ED', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#EA580C' }}>{pendingDeliveryCount} Pending</Text>
              </View>
              <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#15803D' }}>{deliveredCount} Delivered</Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            {React.createElement('input', {
              ref: deliveryInputRef,
              value: deliveryBarcode,
              placeholder: 'Scan barcode or type manually...',
              disabled: delivering,
              onChange: (e: any) => setDeliveryBarcode(e.target.value),
              onKeyDown: handleDeliveryKeyDown,
              autoFocus: true,
              style: {
                flex: 1, minWidth: 200,
                padding: '9px 12px',
                border: '2px solid #2563EB',
                borderRadius: 4,
                fontSize: 13, fontWeight: '600', outline: 'none',
                backgroundColor: delivering ? '#F1F5F9' : '#EFF6FF',
                color: '#0F172A',
              },
            })}
            {React.createElement('button', {
              onClick: () => handleDeliverItem(deliveryBarcode),
              disabled: delivering || !deliveryBarcode.trim(),
              style: {
                backgroundColor: delivering || !deliveryBarcode.trim() ? '#94A3B8' : '#2563EB',
                color: '#fff', border: 'none', borderRadius: 4,
                padding: '9px 14px', cursor: delivering ? 'not-allowed' : 'pointer',
                fontSize: 12, fontWeight: '600',
              },
            }, delivering ? 'Processing...' : '✓ Deliver')}
            {React.createElement('button', {
              onClick: fetchDeliveryItems,
              disabled: deliveryLoading,
              style: {
                backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0', borderRadius: 4,
                padding: '9px 12px', cursor: 'pointer', fontSize: 12, fontWeight: '600',
              },
            }, '↻ Refresh')}
          </View>

          {deliveryMessage !== '' && (
            <View style={{ marginTop: 8, padding: 8, borderRadius: 4, backgroundColor: deliveryMessage.includes('✅') ? '#F0FDF4' : '#FEF2F2', borderWidth: 1, borderColor: deliveryMessage.includes('✅') ? '#BBF7D0' : '#FECACA' }}>
              <Text style={{ color: deliveryMessage.includes('✅') ? '#15803D' : '#DC2626', fontSize: 11, fontWeight: '500' }}>{deliveryMessage}</Text>
            </View>
          )}
        </View>

        {/* Main Content: PDF List + Delivery Items */}
        {!selectedPdf && !showPrintAllView && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>

            {/* LEFT: PDF LIST */}
            <View style={{ flex: 1, minWidth: 320, backgroundColor: '#FFFFFF', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } as any}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {pdfs.length > 0 && (
                    <Pressable
                      onPress={toggleSelectAll}
                      style={{
                        width: 18, height: 18, borderRadius: 3, borderWidth: 2,
                        borderColor: allSelected ? '#2563EB' : '#CBD5E1',
                        backgroundColor: allSelected ? '#2563EB' : '#FFFFFF',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      } as any}
                    >
                      {allSelected && <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>✓</Text>}
                    </Pressable>
                  )}
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>
                    PDFs ({pdfs.length})
                    {selectedFilenames.length > 0 && (
                      <Text style={{ fontSize: 11, fontWeight: '500', color: '#2563EB' }}> • {selectedFilenames.length} selected</Text>
                    )}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {selectedFilenames.length > 0 && (
                    <Pressable
                      onPress={() => setShowDeleteModal(true)}
                      style={{ backgroundColor: '#DC2626', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      <Text style={{ fontSize: 10 }}>🗑</Text>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: '#FFFFFF' }}>Delete</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={fetchPdfs} style={{ backgroundColor: '#F1F5F9', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: '#475569' }}>↻</Text>
                  </Pressable>
                </View>
              </View>

              {loading ? (
                <View style={{ paddingVertical: 30, alignItems: 'center' }}><ActivityIndicator size="small" color="#2563EB" /></View>
              ) : pdfs.length === 0 ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <Text style={{ fontSize: 28, marginBottom: 8 }}>📁</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#0F172A', marginBottom: 2 }}>No PDFs Yet</Text>
                  <Text style={{ fontSize: 10, color: '#64748B', textAlign: 'center' }}>Upload PDF to get started</Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 500 }}>
                  <View style={{ gap: 6 }}>
                    {pdfs.map((pdf, i) => {
                      const isSelected = selectedFilenames.includes(pdf.filename);
                      return (
                        <View key={`${pdf.filename}-${i}`} style={{ backgroundColor: isSelected ? '#EFF6FF' : '#F8FAFC', borderWidth: 1, borderColor: isSelected ? '#2563EB' : '#E2E8F0', borderRadius: 4, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Pressable
                            onPress={() => toggleSelectFile(pdf.filename)}
                            style={{ width: 16, height: 16, borderRadius: 2, borderWidth: 2, borderColor: isSelected ? '#2563EB' : '#CBD5E1', backgroundColor: isSelected ? '#2563EB' : '#FFFFFF', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } as any}
                          >
                            {isSelected && <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '700' }}>✓</Text>}
                          </Pressable>
                          <Pressable onPress={() => openPdf(pdf.filename)} style={{ flex: 1, cursor: 'pointer' } as any}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#0F172A' }} numberOfLines={1}>{pdf.filename}</Text>
                            <Text style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>
                              {pdf.total_invoices} inv • {pdf.total_delivery_items || 0} items • {formatSize(pdf.file_size)}
                            </Text>
                          </Pressable>
                          <Pressable onPress={() => openPdf(pdf.filename)} style={{ paddingHorizontal: 6, cursor: 'pointer' } as any}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#2563EB' }}>→</Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
            </View>

            {/* RIGHT: PDF VIEWER DELIVERY ITEMS TABLE */}
            <View style={{ flex: 1.5, minWidth: 500, backgroundColor: '#FFFFFF', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } as any}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>PDF Viewer Delivery Items ({deliveryItems.length})</Text>
                  <Text style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>Separate from main delivery system</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <View style={{ backgroundColor: '#FFF7ED', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 3 }}>
                    <Text style={{ fontSize: 9, fontWeight: '600', color: '#EA580C' }}>{pendingDeliveryCount} Pending</Text>
                  </View>
                  <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 3 }}>
                    <Text style={{ fontSize: 9, fontWeight: '600', color: '#15803D' }}>{deliveredCount} Delivered</Text>
                  </View>
                </View>
              </View>

              {deliveryLoading ? (
                <View style={{ paddingVertical: 30, alignItems: 'center' }}><ActivityIndicator size="small" color="#2563EB" /></View>
              ) : deliveryItems.length === 0 ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <Text style={{ fontSize: 28, marginBottom: 8 }}>📦</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#0F172A', marginBottom: 2 }}>No Items Yet</Text>
                  <Text style={{ fontSize: 10, color: '#64748B', textAlign: 'center' }}>Upload a PDF to generate items</Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View>
                    <View style={{ flexDirection: 'row', backgroundColor: '#F8FAFC', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E2E8F0' }}>
                      {[['Invoice', 110], ['Model', 80], ['Size', 60], ['Barcode', 180], ['Status', 100], ['Action', 90]].map(([label, width]) => (
                        <View key={label} style={deliveryCell(width as number, true)}>
                          <Text style={{ fontSize: 9, fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>{label}</Text>
                        </View>
                      ))}
                    </View>
                    <ScrollView style={{ maxHeight: 500 }}>
                      {deliveryItems.map((item) => (
                        <View key={item._id} style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#F1F5F9', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
                          <View style={deliveryCell(110)}><Text style={{ fontSize: 11, fontWeight: '600', color: '#0F172A' }}>{item.invoice}</Text></View>
                          <View style={deliveryCell(80)}><Text style={{ fontSize: 11, color: '#334155' }}>{item.model}</Text></View>
                          <View style={deliveryCell(60)}><Text style={{ fontSize: 11, color: '#334155' }}>{item.size}</Text></View>
                          <View style={deliveryCell(180)}><Text style={{ fontSize: 9, color: '#64748B', fontFamily: 'monospace' }}>{item.barcode}</Text></View>
                          <View style={deliveryCell(100)}>
                            <View style={{ backgroundColor: item.status === 'Delivered' ? '#F0FDF4' : '#FFF7ED', paddingVertical: 2, paddingHorizontal: 5, borderRadius: 3, alignSelf: 'flex-start' }}>
                              <Text style={{ fontSize: 8, fontWeight: '600', color: item.status === 'Delivered' ? '#15803D' : '#EA580C' }}>● {item.status}</Text>
                            </View>
                          </View>
                          <View style={{ width: 90, padding: 6 }}>
                            {item.status === 'Pending' && React.createElement('button', {
                              onClick: () => handleDeliverItem(item.barcode),
                              disabled: delivering,
                              style: { backgroundColor: '#2563EB', color: '#fff', border: 'none', borderRadius: 3, padding: '4px 6px', fontSize: 9, fontWeight: '600', cursor: 'pointer', opacity: delivering ? 0.6 : 1 },
                            }, delivering ? '...' : 'Deliver')}
                            {item.status === 'Delivered' && <Text style={{ fontSize: 9, fontWeight: '600', color: '#15803D' }}>✓ Done</Text>}
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        )}

        {/* PRINT ALL VIEW */}
        {showPrintAllView && (
          <View>
            <View style={{ backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 4, padding: 10, marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#92400E', marginBottom: 2 }}>ℹ Print All: Select Products</Text>
              <Text style={{ fontSize: 10, color: '#78350F' }}>Use "Edit" to select products for invoices with multiple items.</Text>
            </View>

            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } as any}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>All Invoices ({printAllInvoices.length})</Text>
                <Text style={{ fontSize: 10, color: '#64748B' }}>From {pdfs.length} PDFs</Text>
              </View>

              {loadingAllInvoices ? (
                <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#2563EB" />
                </View>
              ) : (
                <View style={{ gap: 6 }}>
                  {printAllInvoices.map((inv, idx) => {
                    const products = inv.products || [];
                    const hasMultiple = products.length > 1;
                    const selected = inv.selected_product || { model: 'N/A', size: 'N/A' };
                    const editKey = `${inv.filename}-${inv.invoice_number}-${idx}`;
                    const isEditing = editingPrintAllInvoice === editKey;

                    return (
                      <View key={editKey} style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4, padding: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <View style={{ width: 18, height: 18, backgroundColor: '#EFF6FF', borderRadius: 9, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 8, fontWeight: '700', color: '#2563EB' }}>{idx + 1}</Text>
                          </View>
                          <View style={{ minWidth: 90 }}>
                            <Text style={{ fontSize: 8, fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>File</Text>
                            <Text style={{ fontSize: 10, color: '#334155' }} numberOfLines={1}>{inv.filename}</Text>
                          </View>
                          <View style={{ minWidth: 90 }}>
                            <Text style={{ fontSize: 8, fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Invoice</Text>
                            <Text style={{ fontSize: 10, fontWeight: '600', color: '#0F172A' }}>#{inv.invoice_number}</Text>
                          </View>
                          <View style={{ minWidth: 110 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 8, fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Model</Text>
                              {hasMultiple && (
                                <Pressable onPress={() => setEditingPrintAllInvoice(isEditing ? null : editKey)}>
                                  <Text style={{ fontSize: 8, fontWeight: '600', color: '#2563EB', textDecorationLine: 'underline' }}>{isEditing ? 'Close' : '✎ Edit'}</Text>
                                </Pressable>
                              )}
                            </View>
                            {isEditing ? (
                              <View style={{ borderWidth: 1, borderColor: '#2563EB', borderRadius: 4, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
                                {products.map((p, pi) => (
                                  <Pressable key={pi} onPress={() => handlePrintAllProductChange(idx, p)} style={{ paddingVertical: 4, paddingHorizontal: 6, backgroundColor: selected.model === p.model && selected.size === p.size ? '#EFF6FF' : '#FFFFFF', borderBottomWidth: pi < products.length - 1 ? 1 : 0, borderColor: '#F1F5F9' }}>
                                    <Text style={{ fontSize: 9, fontWeight: '500', color: '#0F172A' }}>{p.model} — Size {p.size}</Text>
                                  </Pressable>
                                ))}
                              </View>
                            ) : (
                              <Text style={{ fontSize: 10, fontWeight: '500', color: '#334155' }}>{selected.model}</Text>
                            )}
                          </View>
                          <View style={{ minWidth: 45 }}>
                            <Text style={{ fontSize: 8, fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Size</Text>
                            <Text style={{ fontSize: 10, fontWeight: '500', color: '#334155' }}>{selected.size}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <Text style={{ fontSize: 10, color: '#64748B' }}>{printAllInvoices.length} invoices will be merged</Text>
              <Pressable
                onPress={generateAndPrintAll}
                disabled={printingAll || printAllInvoices.length === 0}
                style={{
                  backgroundColor: printingAll || printAllInvoices.length === 0 ? '#94A3B8' : '#059669',
                  paddingVertical: 8, paddingHorizontal: 16, borderRadius: 4,
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  cursor: printingAll ? 'not-allowed' : 'pointer',
                } as any}
              >
                {printingAll ? (
                  <><ActivityIndicator size="small" color="#FFFFFF" /><Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>Generating...</Text></>
                ) : (
                  <><Text style={{ fontSize: 13 }}>⚡</Text><Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>Generate & Print All</Text></>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* SINGLE PDF SELECTION */}
        {selectedPdf && !generatedPdfUrl && (
          <View>
            <View style={{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#DBEAFE', borderRadius: 4, padding: 10, marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#1E40AF', marginBottom: 2 }}>ℹ Select Products</Text>
              <Text style={{ fontSize: 10, color: '#2563EB' }}>Use "Edit" for multiple products, then click "Generate PDF".</Text>
            </View>

            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } as any}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>Invoices ({invoices.length})</Text>
                <Text style={{ fontSize: 10, color: '#64748B' }}>📄 {selectedPdf}</Text>
              </View>

              {detailsLoading ? (
                <View style={{ paddingVertical: 30, alignItems: 'center' }}><ActivityIndicator size="small" color="#2563EB" /></View>
              ) : (
                <View style={{ gap: 6 }}>
                  {invoices.map((inv, idx) => {
                    const products = inv.products || [];
                    const hasMultiple = products.length > 1;
                    const selected = inv.selected_product || { model: 'N/A', size: 'N/A' };
                    return (
                      <View key={inv._id} style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4, padding: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <View style={{ width: 22, height: 22, backgroundColor: '#EFF6FF', borderRadius: 11, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 9, fontWeight: '700', color: '#2563EB' }}>{idx + 1}</Text>
                          </View>
                          <View style={{ minWidth: 110 }}>
                            <Text style={{ fontSize: 8, fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Invoice</Text>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#0F172A' }}>#{inv.invoice_number}</Text>
                          </View>
                          <View style={{ minWidth: 120 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 8, fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Model</Text>
                              {hasMultiple && (
                                <Pressable onPress={() => setEditingInvoiceId(editingInvoiceId === inv._id ? null : inv._id)}>
                                  <Text style={{ fontSize: 8, fontWeight: '600', color: '#2563EB', textDecorationLine: 'underline' }}>{editingInvoiceId === inv._id ? 'Close' : '✎ Edit'}</Text>
                                </Pressable>
                              )}
                            </View>
                            {editingInvoiceId === inv._id ? (
                              <View style={{ borderWidth: 1, borderColor: '#2563EB', borderRadius: 4, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
                                {products.map((p, pi) => (
                                  <Pressable key={pi} onPress={() => handleProductChange(inv._id, p)} style={{ paddingVertical: 5, paddingHorizontal: 8, backgroundColor: selected.model === p.model && selected.size === p.size ? '#EFF6FF' : '#FFFFFF', borderBottomWidth: pi < products.length - 1 ? 1 : 0, borderColor: '#F1F5F9' }}>
                                    <Text style={{ fontSize: 10, fontWeight: '500', color: '#0F172A' }}>{p.model} — Size {p.size}</Text>
                                  </Pressable>
                                ))}
                              </View>
                            ) : (
                              <Text style={{ fontSize: 11, fontWeight: '500', color: '#334155' }}>{selected.model}</Text>
                            )}
                          </View>
                          <View style={{ minWidth: 50 }}>
                            <Text style={{ fontSize: 8, fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Size</Text>
                            <Text style={{ fontSize: 11, fontWeight: '500', color: '#334155' }}>{selected.size}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <Text style={{ fontSize: 10, color: '#64748B' }}>{invoices.length} invoices will be added</Text>
              <Pressable
                onPress={generatePdf}
                disabled={generating}
                style={{ backgroundColor: generating ? '#94A3B8' : '#059669', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 6 } as any}
              >
                {generating ? (
                  <><ActivityIndicator size="small" color="#FFFFFF" /><Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>Generating...</Text></>
                ) : (
                  <><Text style={{ fontSize: 13 }}>⚡</Text><Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>Generate PDF</Text></>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* GENERATED PDF VIEW */}
        {selectedPdf && generatedPdfUrl && (
          <View>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0', padding: 10, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569' }}>📄 {selectedPdf}</Text>
                <View style={{ backgroundColor: '#F0FDF4', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 2 }}>
                  <Text style={{ fontSize: 8, fontWeight: '600', color: '#15803D' }}>✓ Footer Added</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Pressable onPress={handleReset} style={{ backgroundColor: '#FFFFFF', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 4, borderWidth: 1, borderColor: '#CBD5E1' }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#475569' }}>✎ Edit</Text>
                </Pressable>
                <Pressable onPress={() => window.open(generatedPdfUrl, '_blank')} style={{ backgroundColor: '#FFFFFF', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 4, borderWidth: 1, borderColor: '#2563EB' }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#2563EB' }}>↗ Open</Text>
                </Pressable>
                <Pressable onPress={handlePrint} style={{ backgroundColor: '#0F172A', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#FFFFFF' }}>🖨 Print</Text>
                </Pressable>
              </View>
            </View>

            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' }}>
              <View style={{ height: 700, backgroundColor: '#525659', position: 'relative' }}>
                {pdfLoading && !pdfError && (
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#525659', zIndex: 10 }}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                  </View>
                )}
                {pdfError && (
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEF2F2', zIndex: 10, padding: 20 }}>
                    <Text style={{ fontSize: 28, marginBottom: 10 }}>⚠️</Text>
                    <Pressable onPress={() => window.open(generatedPdfUrl, '_blank')} style={{ backgroundColor: '#2563EB', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 4 }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>Open in New Tab</Text>
                    </Pressable>
                  </View>
                )}
                {React.createElement('iframe', {
                  key: generatedPdfUrl, src: generatedPdfUrl,
                  style: { width: '100%', height: '100%', border: 'none' },
                  onLoad: () => setPdfLoading(false),
                  onError: () => { setPdfLoading(false); setPdfError(true); },
                })}
              </View>
            </View>
          </View>
        )}
      </View>

      {/* DELETE MODAL */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 4, width: '100%', maxWidth: 420, overflow: 'hidden' }}>
            <View style={{ backgroundColor: '#FEF2F2', padding: 14, borderBottomWidth: 1, borderColor: '#FECACA', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>🗑</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>Confirm Delete</Text>
                <Text style={{ fontSize: 11, color: '#B91C1C' }}>Cannot be undone</Text>
              </View>
            </View>
            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: 12, color: '#334155', marginBottom: 10 }}>
                Delete {selectedFilenames.length === 1 ? 'this PDF' : `${selectedFilenames.length} PDFs`}?
              </Text>
              <View style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4, padding: 8, maxHeight: 120, overflow: 'auto' } as any}>
                {selectedFilenames.map((f, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 9 }}>📄</Text>
                    <Text style={{ fontSize: 10, color: '#475569', flex: 1 }} numberOfLines={1}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={{ padding: 12, borderTopWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'flex-end', gap: 6, backgroundColor: '#F8FAFC' }}>
              <Pressable onPress={() => setShowDeleteModal(false)} disabled={deleting} style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569' }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmDelete} disabled={deleting} style={{ backgroundColor: deleting ? '#FCA5A5' : '#DC2626', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {deleting ? (
                  <><ActivityIndicator size="small" color="#FFFFFF" /><Text style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF' }}>Deleting...</Text></>
                ) : (
                  <><Text style={{ fontSize: 11 }}>🗑</Text><Text style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF' }}>Delete</Text></>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}