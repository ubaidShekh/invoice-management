import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

const API_BASE_URL = 'https://invoice-python-api-q2oq.onrender.com';

type Product = { model: string; size: string; product_code?: string; };
type InvoiceItem = {
  _id: string;
  invoice_number: string;
  products: Product[];
  selected_product: Product;
  name: string;
};
type PdfItem = {
  filename: string;
  file_size: number;
  total_invoices: number;
  uploaded_at: string;
};

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPdfs = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${API_BASE_URL}/api/pdf-files`);
      setPdfs(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch PDFs.');
    } finally {
      setLoading(false);
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
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const triggerUpload = () => {
    if (fileInputRef.current) fileInputRef.current.click();
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

  useEffect(() => { fetchPdfs(); }, []);

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

  const formatDate = (date?: string) => !date ? '-' : new Date(date).toLocaleString();
  const formatSize = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : `${(bytes / 1024).toFixed(0)} KB`;

  return (
    <View style={{ flex: 1, minHeight: '100vh' as any, padding: 24, background: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)' } as any}>
      <View style={{ width: '100%', maxWidth: '100%', alignSelf: 'center' }}>

        {React.createElement('input', {
          ref: fileInputRef, type: 'file', accept: 'application/pdf', multiple: true,
          onChange: handleFileChange, style: { display: 'none' },
        })}

        <View style={{ marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
          <View>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Document Workspace</Text>
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#0F172A', marginBottom: 6 }}>PDF Viewer</Text>
            <Text style={{ fontSize: 13, color: '#475569' }}>Upload, select products, and generate PDF with footer data.</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            {selectedPdf && (
              <Pressable
                onPress={() => { setSelectedPdf(null); setInvoices([]); setError(''); handleReset(); setMessage(''); }}
                style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 4 }}
              >
                <Text style={{ color: '#475569', fontSize: 12, fontWeight: '600' }}>← Back to List</Text>
              </Pressable>
            )}

            <Pressable
              onPress={triggerUpload}
              disabled={uploading}
              style={{
                backgroundColor: uploading ? '#94A3B8' : '#2563EB',
                paddingVertical: 10, paddingHorizontal: 20, borderRadius: 4,
                flexDirection: 'row', alignItems: 'center', gap: 8,
                cursor: uploading ? 'not-allowed' : 'pointer',
              } as any}
            >
              <Text style={{ fontSize: 14 }}>📤</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
                {uploading ? 'Uploading...' : 'Upload PDF'}
              </Text>
            </Pressable>
          </View>
        </View>

        {!!error && (
          <View style={{ backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', padding: 12, borderRadius: 4, marginBottom: 16 }}>
            <Text style={{ color: '#B91C1C', fontSize: 12 }}>❌ {error}</Text>
          </View>
        )}
        {!!message && (
          <View style={{ backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', padding: 12, borderRadius: 4, marginBottom: 16 }}>
            <Text style={{ color: '#15803D', fontSize: 12 }}>{message}</Text>
          </View>
        )}

        {/* PDF LIST */}
        {!selectedPdf && (
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } as any}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>Uploaded PDFs ({pdfs.length})</Text>
              <Pressable onPress={fetchPdfs} style={{ backgroundColor: '#F1F5F9', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569' }}>↻ Refresh</Text>
              </Pressable>
            </View>

            {loading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}><ActivityIndicator size="small" color="#2563EB" /></View>
            ) : pdfs.length === 0 ? (
              <View style={{ paddingVertical: 60, alignItems: 'center' }}>
                <Text style={{ fontSize: 32, marginBottom: 12 }}>📁</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 4 }}>No PDFs Uploaded Yet</Text>
                <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center' }}>Click "Upload PDF" above to add your first document.</Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {pdfs.map((pdf, i) => (
                  <Pressable
                    key={`${pdf.filename}-${i}`}
                    onPress={() => openPdf(pdf.filename)}
                    style={{
                      backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4, padding: 14,
                      flexDirection: 'row', alignItems: 'center', gap: 12, cursor: 'pointer',
                    } as any}
                  >
                    <View style={{ width: 36, height: 36, backgroundColor: '#EFF6FF', borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 16 }}>📄</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }} numberOfLines={1}>{pdf.filename}</Text>
                      <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                        {pdf.total_invoices} Invoices • {formatSize(pdf.file_size)} • {formatDate(pdf.uploaded_at)}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#2563EB' }}>Open →</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {/* SELECTION VIEW */}
        {selectedPdf && !generatedPdfUrl && (
          <View>
            <View style={{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#DBEAFE', borderRadius: 4, padding: 12, marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#1E40AF', marginBottom: 4 }}>ℹ Step 1: Select Products</Text>
              <Text style={{ fontSize: 11, color: '#2563EB', lineHeight: 18 }}>
                If an invoice has multiple products, use the "Edit" dropdown to select which one to print.
                Then click "Generate PDF with Footer" to create the final PDF.
              </Text>
            </View>

            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0', padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } as any}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>Invoices in this PDF ({invoices.length})</Text>
                <Text style={{ fontSize: 11, color: '#64748B' }}>📄 {selectedPdf}</Text>
              </View>

              {detailsLoading ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}><ActivityIndicator size="small" color="#2563EB" /></View>
              ) : invoices.length === 0 ? (
                <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>No invoice data found for this PDF.</Text>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  {invoices.map((inv, idx) => {
                    const products = inv.products || [];
                    const hasMultiple = products.length > 1;
                    const selected = inv.selected_product || { model: 'N/A', size: 'N/A' };

                    return (
                      <View key={inv._id} style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4, padding: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <View style={{ width: 24, height: 24, backgroundColor: '#EFF6FF', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#2563EB' }}>{idx + 1}</Text>
                          </View>

                          <View style={{ minWidth: 130 }}>
                            <Text style={{ fontSize: 9, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', marginBottom: 2 }}>Invoice No.</Text>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#0F172A' }}>#{inv.invoice_number}</Text>
                          </View>

                          <View style={{ minWidth: 140 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                              <Text style={{ fontSize: 9, fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Model</Text>
                              {hasMultiple && (
                                <Pressable onPress={() => setEditingInvoiceId(editingInvoiceId === inv._id ? null : inv._id)}>
                                  <Text style={{ fontSize: 9, fontWeight: '600', color: '#2563EB', textDecorationLine: 'underline' }}>
                                    {editingInvoiceId === inv._id ? 'Close' : '✎ Edit'}
                                  </Text>
                                </Pressable>
                              )}
                            </View>
                            {editingInvoiceId === inv._id ? (
                              <View style={{ borderWidth: 1, borderColor: '#2563EB', borderRadius: 4, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
                                {products.map((p, pi) => (
                                  <Pressable
                                    key={pi}
                                    onPress={() => handleProductChange(inv._id, p)}
                                    style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: selected.model === p.model && selected.size === p.size ? '#EFF6FF' : '#FFFFFF', borderBottomWidth: pi < products.length - 1 ? 1 : 0, borderColor: '#F1F5F9' }}
                                  >
                                    <Text style={{ fontSize: 11, fontWeight: '500', color: '#0F172A' }}>{p.model} — Size {p.size}</Text>
                                  </Pressable>
                                ))}
                              </View>
                            ) : (
                              <Text style={{ fontSize: 12, fontWeight: '500', color: '#334155' }}>{selected.model}</Text>
                            )}
                          </View>

                          <View style={{ minWidth: 60 }}>
                            <Text style={{ fontSize: 9, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', marginBottom: 2 }}>Size</Text>
                            <Text style={{ fontSize: 12, fontWeight: '500', color: '#334155' }}>{selected.size}</Text>
                          </View>

                          <View style={{ backgroundColor: hasMultiple ? '#FFF7ED' : '#F0FDF4', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 2, alignSelf: 'flex-end' }}>
                            <Text style={{ fontSize: 9, fontWeight: '600', color: hasMultiple ? '#EA580C' : '#15803D' }}>
                              {products.length} Product{products.length !== 1 ? 's' : ''}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <View>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#0F172A' }}>Ready to generate?</Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{invoices.length} invoices will be added to PDF footer</Text>
              </View>
              <Pressable
                onPress={generatePdf}
                disabled={generating}
                style={{
                  backgroundColor: generating ? '#94A3B8' : '#059669',
                  paddingVertical: 10, paddingHorizontal: 20, borderRadius: 4,
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  cursor: generating ? 'not-allowed' : 'pointer',
                } as any}
              >
                {generating ? (
                  <><ActivityIndicator size="small" color="#FFFFFF" /><Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>Generating...</Text></>
                ) : (
                  <><Text style={{ fontSize: 14 }}>⚡</Text><Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>Generate PDF with Footer</Text></>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* GENERATED PDF VIEW */}
        {selectedPdf && generatedPdfUrl && (
          <View>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569' }}>📄 {selectedPdf}</Text>
                <View style={{ backgroundColor: '#F0FDF4', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 2 }}>
                  <Text style={{ fontSize: 9, fontWeight: '600', color: '#15803D' }}>✓ Footer Generated</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={handleReset} style={{ backgroundColor: '#FFFFFF', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4, borderWidth: 1, borderColor: '#CBD5E1' }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569' }}>✎ Edit Selection</Text>
                </Pressable>
                <Pressable onPress={() => window.open(generatedPdfUrl, '_blank')} style={{ backgroundColor: '#FFFFFF', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4, borderWidth: 1, borderColor: '#2563EB' }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#2563EB' }}>↗ Open in New Tab</Text>
                </Pressable>
                <Pressable onPress={handlePrint} style={{ backgroundColor: '#0F172A', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF' }}>🖨 Print</Text>
                </Pressable>
              </View>
            </View>

            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' }}>
              <View style={{ height: 700, backgroundColor: '#525659', position: 'relative' }}>
                {pdfLoading && !pdfError && (
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#525659', zIndex: 10 }}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', marginTop: 12, fontSize: 12 }}>Loading generated PDF...</Text>
                  </View>
                )}
                {pdfError && (
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEF2F2', zIndex: 10, padding: 20 }}>
                    <Text style={{ fontSize: 32, marginBottom: 12 }}>⚠️</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#B91C1C', marginBottom: 8 }}>Failed to load generated PDF</Text>
                    <Pressable onPress={() => window.open(generatedPdfUrl, '_blank')} style={{ backgroundColor: '#2563EB', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 4 }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>Open in New Tab</Text>
                    </Pressable>
                  </View>
                )}
                {React.createElement('iframe', {
                  key: generatedPdfUrl, src: generatedPdfUrl,
                  style: { width: '100%', height: '100%', border: 'none' },
                  title: 'Generated PDF Viewer',
                  onLoad: () => setPdfLoading(false),
                  onError: () => { setPdfLoading(false); setPdfError(true); },
                })}
              </View>
            </View>

            <View style={{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#DBEAFE', borderRadius: 4, padding: 12, marginTop: 16 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#1E40AF', marginBottom: 4 }}>ℹ Footer data is inside the PDF</Text>
              <Text style={{ fontSize: 11, color: '#2563EB', lineHeight: 18 }}>
                Each invoice's footer contains: Invoice No, Model, Size, and a blank Name line.
                Print directly using the Print button. After printing, write the customer name manually with a pen.
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}