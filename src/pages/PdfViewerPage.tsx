import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';

const API_BASE_URL = 'https://reprocess-switch-subdivide.ngrok-free.dev';
const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// ✅ Ngrok bypass axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
});

type Product = { model: string; size: string; product_code?: string; };
type InvoiceItem = { _id: string; invoice_number: string; products: Product[]; selected_product: Product; name: string; };
type PdfItem = { filename: string; file_size: number; total_invoices: number; total_delivery_items?: number; uploaded_at: string; batch_id?: string; batch_uploaded_at?: string; };
type PdfBatch = { batch_id: string; customer_id: string; uploaded_at: string; pdf_count: number; total_size: number; filenames: string[]; };
type PrintAllInvoice = { filename: string; invoice_number: string; products: Product[]; selected_product: Product; };
type Customer = { _id: string; name: string; company: string; phone: string; email: string; };

export default function PdfViewerPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerLoading, setCustomerLoading] = useState(true);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', company: '', phone: '', email: '' });
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  // Batches
  const [pdfBatches, setPdfBatches] = useState<PdfBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<PdfBatch | null>(null);
  const [batchesLoading, setBatchesLoading] = useState(false);

  const [pdfs, setPdfs] = useState<PdfItem[]>([]);
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [savingPdf, setSavingPdf] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  const [selectedFilenames, setSelectedFilenames] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showPrintAllView, setShowPrintAllView] = useState(false);
  const [printAllInvoices, setPrintAllInvoices] = useState<PrintAllInvoice[]>([]);
  const [loadingAllInvoices, setLoadingAllInvoices] = useState(false);
  const [editingPrintAllInvoice, setEditingPrintAllInvoice] = useState<string | null>(null);
  const [printingAll, setPrintingAll] = useState(false);
  const [savingAll, setSavingAll] = useState(false);

  const [showSizeWarning, setShowSizeWarning] = useState(false);
  const [oversizedFiles, setOversizedFiles] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCustomers = async () => {
    try {
      setCustomerLoading(true);
      const response = await api.get('/api/customers');
      setCustomers(response.data);
    } catch (err) {
      setError('Failed to fetch customers.');
    } finally {
      setCustomerLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const handleCreateCustomer = async () => {
    if (!newCustomer.name.trim()) return;
    try {
      setCreatingCustomer(true);
      await api.post('/api/customers', newCustomer);
      setShowCreateCustomer(false);
      setNewCustomer({ name: '', company: '', phone: '', email: '' });
      await fetchCustomers();
    } catch (err) {
      setError('Failed to create customer.');
    } finally {
      setCreatingCustomer(false);
    }
  };

  // ----- BATCHES -----
  const fetchPdfBatches = async (customerId: string) => {
    try {
      setBatchesLoading(true);
      const response = await api.get(`/api/pdf-batches?customer_id=${customerId}`);
      setPdfBatches(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch PDF batches.');
    } finally {
      setBatchesLoading(false);
    }
  };

  const fetchPdfsForCustomer = async (customerId: string, batchId?: string) => {
    try {
      setLoading(true);
      setError('');
      let url = `/api/pdf-files?customer_id=${customerId}`;
      if (batchId) url += `&batch_id=${batchId}`;
      const response = await api.get(url);
      setPdfs(response.data);
      setSelectedFilenames([]);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch PDFs.');
    } finally {
      setLoading(false);
    }
  };

  const selectCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedBatch(null);
    setPdfs([]);
    await fetchPdfBatches(customer._id);
  };

  const openBatch = async (batch: PdfBatch) => {
    setSelectedBatch(batch);
    await fetchPdfsForCustomer(batch.customer_id, batch.batch_id);
  };

  const handleFileChange = async (e: any) => {
    const selectedFiles = Array.from(e.target.files || []) as File[];
    if (selectedFiles.length === 0) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    const tooLarge = selectedFiles.filter(f => f.size > MAX_FILE_SIZE_BYTES);
    if (tooLarge.length > 0) {
      setOversizedFiles(tooLarge.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(2)} MB)`));
      setShowSizeWarning(true);
      setError('');
      setMessage('');
      return;
    }

    if (!selectedCustomer) {
      setError('Please select a customer first.');
      return;
    }

    try {
      setUploading(true);
      setMessage('');
      setError('');
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append('invoices', file, file.name));
      formData.append('customer_id', selectedCustomer._id);

      const response = await api.post('/upload_pdf_viewer', formData, {
        timeout: 300000,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = response.data;
      const processed = data.total_files_processed || 0;
      const skipped = data.skipped_files || [];

      let msg = `✅ ${processed} file(s) uploaded successfully.`;
      if (skipped.length > 0) {
        msg += ` ⚠️ ${skipped.length} file(s) skipped: `;
        msg += skipped.map((s: any) => `${s.filename} (${s.reason})`).join(', ');
      }
      setMessage(msg);

      await fetchPdfBatches(selectedCustomer._id);
      if (selectedBatch) {
        await fetchPdfsForCustomer(selectedCustomer._id, selectedBatch.batch_id);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const triggerUpload = () => {
    if (!selectedCustomer) {
      setError('Please select a customer first.');
      return;
    }
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
          const response = await api.get(`/api/pdf-invoice-details/${encodeURIComponent(pdf.filename)}`);
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

      const response = await api.post(
        '/api/pdf-print-all-with-selections',
        { selections },
        { responseType: 'blob', timeout: 180000 }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      setMessage('✅ PDF generated. Opening print dialog...');

      const newWindow = window.open(blobUrl, '_blank');
      if (newWindow) {
        setTimeout(() => { try { newWindow.focus(); newWindow.print(); } catch (e) { } }, 2000);
      } else {
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
        iframe.src = blobUrl;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          setTimeout(() => {
            try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); }
            catch (e) {
              const link = document.createElement('a');
              link.href = blobUrl; link.download = 'all-invoices-with-footer.pdf'; link.click();
              setMessage('✅ PDF downloaded. Please open and print manually.');
            }
          }, 1000);
        };
        setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 60000);
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

  const saveAll = async () => {
    try {
      setSavingAll(true);
      setError('');
      setMessage('⏳ Generating merged PDF for saving...');

      const selections = printAllInvoices.map(inv => ({
        filename: inv.filename,
        invoice_number: inv.invoice_number,
        model: inv.selected_product?.model || 'N/A',
        size: inv.selected_product?.size || 'N/A',
      }));

      const response = await api.post(
        '/api/pdf-print-all-with-selections',
        { selections },
        { responseType: 'blob', timeout: 180000 }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'all-invoices-with-footer.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 60000);
      setMessage('✅ Merged PDF saved successfully.');
    } catch (err: any) {
      console.error('Save All Error:', err);
      setError('Failed to save combined PDF. Please try again.');
    } finally {
      setSavingAll(false);
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
      const response = await api.get(`/api/pdf-invoice-details/${encodeURIComponent(filename)}`);
      setInvoices(response.data.invoices);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load PDF details.');
    } finally {
      setDetailsLoading(false);
    }
  };

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
      const response = await api.post(
        `/api/pdf-with-footer/${encodeURIComponent(selectedPdf)}`,
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

  const savePdf = async () => {
    if (!selectedPdf) return;
    try {
      setSavingPdf(true);
      setError('');
      setMessage('');
      const selections = invoices.map(inv => ({
        invoice_number: inv.invoice_number,
        model: inv.selected_product?.model || 'N/A',
        size: inv.selected_product?.size || 'N/A',
      }));
      const response = await api.post(
        `/api/pdf-with-footer/${encodeURIComponent(selectedPdf)}`,
        { selections },
        { responseType: 'blob', timeout: 120000 }
      );
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const baseName = selectedPdf.replace(/\.pdf$/i, '');
      link.download = `${baseName}-with-footer.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 60000);
      setMessage('✅ PDF saved successfully.');
    } catch (err: any) {
      setError('Failed to save PDF. Please try again.');
    } finally {
      setSavingPdf(false);
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
    setSelectedFilenames(prev => prev.includes(filename) ? prev.filter(f => f !== filename) : [...prev, filename]);
  };

  const toggleSelectAll = () => {
    if (selectedFilenames.length === pdfs.length) setSelectedFilenames([]);
    else setSelectedFilenames(pdfs.map(p => p.filename));
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      setError('');
      const response = await api.post('/api/pdf-files/delete-bulk', { filenames: selectedFilenames });
      setMessage(`✅ ${response.data.message}`);
      setShowDeleteModal(false);
      setSelectedFilenames([]);
      if (selectedCustomer) {
        if (selectedBatch) {
          await fetchPdfsForCustomer(selectedCustomer._id, selectedBatch.batch_id);
        }
        await fetchPdfBatches(selectedCustomer._id);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Delete failed.');
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return 'Date not available';
    try {
      return new Date(date).toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };
  const formatSize = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  const allSelected = pdfs.length > 0 && selectedFilenames.length === pdfs.length;

  // =====================================================
  // VIEW 1: CUSTOMER LIST
  // =====================================================
  if (!selectedCustomer) {
    return (
      <View style={{ flex: 1, padding: 24, background: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)' } as any}>
        <View style={{ width: '100%', maxWidth: 900, alignSelf: 'center' }}>
          <View style={{ marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
            <View>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Workspace</Text>
              <Text style={{ fontSize: 22, fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>Customers</Text>
              <Text style={{ fontSize: 12, color: '#475569' }}>Select a customer to manage their PDFs.</Text>
            </View>
            <Pressable onPress={() => setShowCreateCustomer(true)} style={{ backgroundColor: '#2563EB', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 13 }}>➕</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>New Customer</Text>
            </Pressable>
          </View>

          {customerLoading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}><ActivityIndicator size="large" color="#2563EB" /></View>
          ) : customers.length === 0 ? (
            <View style={{ backgroundColor: '#FFFFFF', padding: 40, alignItems: 'center', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 32, marginBottom: 12 }}>👥</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 4 }}>No Customers Yet</Text>
              <Text style={{ fontSize: 12, color: '#64748B' }}>Click "New Customer" to add your first one.</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {customers.map((customer) => (
                <Pressable
                  key={customer._id}
                  onPress={() => selectCustomer(customer)}
                  style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18 }}>👤</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{customer.name}</Text>
                    <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                      {customer.company && `${customer.company} • `}{customer.phone || customer.email || 'No contact info'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, color: '#2563EB', fontWeight: '600' }}>View →</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <Modal visible={showCreateCustomer} transparent animationType="fade" onRequestClose={() => setShowCreateCustomer(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 4, width: '100%', maxWidth: 400, padding: 24 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 16 }}>New Customer</Text>
              <View style={{ gap: 12, marginBottom: 20 }}>
                {React.createElement('input', {
                  placeholder: 'Name *', value: newCustomer.name,
                  onChange: (e: any) => setNewCustomer({ ...newCustomer, name: e.target.value }),
                  style: { padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 4, fontSize: 13, outline: 'none' },
                })}
                {React.createElement('input', {
                  placeholder: 'Company', value: newCustomer.company,
                  onChange: (e: any) => setNewCustomer({ ...newCustomer, company: e.target.value }),
                  style: { padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 4, fontSize: 13, outline: 'none' },
                })}
                {React.createElement('input', {
                  placeholder: 'Phone', value: newCustomer.phone,
                  onChange: (e: any) => setNewCustomer({ ...newCustomer, phone: e.target.value }),
                  style: { padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 4, fontSize: 13, outline: 'none' },
                })}
                {React.createElement('input', {
                  placeholder: 'Email', value: newCustomer.email,
                  onChange: (e: any) => setNewCustomer({ ...newCustomer, email: e.target.value }),
                  style: { padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 4, fontSize: 13, outline: 'none' },
                })}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                <Pressable onPress={() => setShowCreateCustomer(false)} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 4, borderWidth: 1, borderColor: '#D1D5DB' }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569' }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleCreateCustomer}
                  disabled={creatingCustomer || !newCustomer.name.trim()}
                  style={{ backgroundColor: creatingCustomer || !newCustomer.name.trim() ? '#94A3B8' : '#2563EB', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                >
                  {creatingCustomer && <ActivityIndicator size="small" color="#FFF" />}
                  <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>Create</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // =====================================================
  // VIEW 2: BATCHES LIST
  // =====================================================
  if (selectedCustomer && !selectedBatch) {
    return (
      <View style={{ flex: 1, minHeight: '100vh' as any, padding: 24, background: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)' } as any}>
        {React.createElement('input', {
          ref: fileInputRef, type: 'file', accept: 'application/pdf', multiple: true,
          onChange: handleFileChange, style: { display: 'none' },
        })}

        <View style={{ width: '100%', maxWidth: 900, alignSelf: 'center' }}>
          <View style={{ marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Pressable
                onPress={() => { setSelectedCustomer(null); setPdfBatches([]); setError(''); setMessage(''); }}
                style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 4 }}
              >
                <Text style={{ color: '#475569', fontSize: 12, fontWeight: '600' }}>← Back</Text>
              </Pressable>
              <View>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                  Customer: {selectedCustomer.name}
                </Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F172A' }}>Upload Batches</Text>
              </View>
            </View>
            <Pressable
              onPress={triggerUpload}
              disabled={uploading}
              style={{ backgroundColor: uploading ? '#94A3B8' : '#2563EB', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 6 } as any}
            >
              <Text style={{ fontSize: 13 }}>📤</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>{uploading ? 'Uploading...' : 'Upload PDF'}</Text>
            </Pressable>
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

          {batchesLoading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}><ActivityIndicator size="large" color="#2563EB" /></View>
          ) : pdfBatches.length === 0 ? (
            <View style={{ backgroundColor: '#FFFFFF', padding: 40, alignItems: 'center', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 32, marginBottom: 12 }}>📁</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 4 }}>No Uploads Yet</Text>
              <Text style={{ fontSize: 12, color: '#64748B' }}>Upload PDFs to create your first batch.</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {pdfBatches.map((batch, idx) => (
                <Pressable
                  key={batch.batch_id}
                  onPress={() => openBatch(batch)}
                  style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, cursor: 'pointer' } as any}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#2563EB' }}>#{pdfBatches.length - idx}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>
                      Upload Batch • {batch.pdf_count} PDF{batch.pdf_count !== 1 ? 's' : ''}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                      {formatDate(batch.uploaded_at)} • {formatSize(batch.total_size)}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: '#EFF6FF', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>{batch.pdf_count}</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: '#2563EB', fontWeight: '600' }}>View →</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <Modal visible={showSizeWarning} transparent animationType="fade" onRequestClose={() => setShowSizeWarning(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 4, width: '100%', maxWidth: 460, overflow: 'hidden' }}>
              <View style={{ backgroundColor: '#FEF3C7', padding: 14, borderBottomWidth: 1, borderColor: '#FDE68A', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>⚠️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>File Too Large</Text>
                  <Text style={{ fontSize: 11, color: '#92400E' }}>Max allowed size is {MAX_FILE_SIZE_MB} MB per file</Text>
                </View>
              </View>
              <View style={{ padding: 16 }}>
                <Text style={{ fontSize: 12, color: '#334155', marginBottom: 10 }}>
                  The following file(s) exceed {MAX_FILE_SIZE_MB} MB and were NOT uploaded.
                </Text>
                <View style={{ backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 4, padding: 8, maxHeight: 180, overflow: 'auto' } as any}>
                  {oversizedFiles.map((f, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 9 }}>📄</Text>
                      <Text style={{ fontSize: 10, color: '#78350F', flex: 1 }} numberOfLines={2}>{f}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={{ padding: 12, borderTopWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'flex-end', gap: 6, backgroundColor: '#F8FAFC' }}>
                <Pressable
                  onPress={() => { setShowSizeWarning(false); setOversizedFiles([]); }}
                  style={{ backgroundColor: '#2563EB', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 4 }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF' }}>OK, I'll Reduce Size</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // =====================================================
  // VIEW 3: PDFs LIST (batch selected)
  // =====================================================
  return (
    <View style={{ flex: 1, minHeight: '100vh' as any, padding: 24, background: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)' } as any}>
      <View style={{ width: '100%', maxWidth: '100%', alignSelf: 'center' }}>

        {React.createElement('input', {
          ref: fileInputRef, type: 'file', accept: 'application/pdf', multiple: true,
          onChange: handleFileChange, style: { display: 'none' },
        })}

        <View style={{ marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              onPress={() => {
                setSelectedBatch(null);
                setPdfs([]);
                setSelectedFilenames([]);
                setError('');
                setMessage('');
              }}
              style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 4 }}
            >
              <Text style={{ color: '#475569', fontSize: 12, fontWeight: '600' }}>← Batches</Text>
            </Pressable>
            <View>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                {selectedCustomer.name} • Batch ({selectedBatch?.pdf_count || pdfs.length} PDFs)
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F172A' }}>PDF Documents</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {(selectedPdf || showPrintAllView) && (
              <Pressable
                onPress={() => { setSelectedPdf(null); setShowPrintAllView(false); setInvoices([]); setPrintAllInvoices([]); setError(''); handleReset(); setMessage(''); }}
                style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 4 }}
              >
                <Text style={{ color: '#475569', fontSize: 12, fontWeight: '600' }}>← Back to PDFs</Text>
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

        {!selectedPdf && !showPrintAllView && (
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } as any}>
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
                <Pressable onPress={() => selectedCustomer && selectedBatch && fetchPdfsForCustomer(selectedCustomer._id, selectedBatch.batch_id)} style={{ backgroundColor: '#F1F5F9', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#475569' }}>↻</Text>
                </Pressable>
              </View>
            </View>

            {loading ? (
              <View style={{ paddingVertical: 30, alignItems: 'center' }}><ActivityIndicator size="small" color="#2563EB" /></View>
            ) : pdfs.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Text style={{ fontSize: 28, marginBottom: 8 }}>📁</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#0F172A', marginBottom: 2 }}>No PDFs in this batch</Text>
                <Text style={{ fontSize: 10, color: '#64748B', textAlign: 'center' }}>Upload more PDFs to add them here</Text>
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
                            {pdf.total_invoices} inv • {formatSize(pdf.file_size)}
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
        )}

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
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <Pressable
                  onPress={saveAll}
                  disabled={savingAll || printingAll || printAllInvoices.length === 0}
                  style={{
                    backgroundColor: savingAll || printingAll || printAllInvoices.length === 0 ? '#94A3B8' : '#FFFFFF',
                    borderWidth: savingAll || printingAll || printAllInvoices.length === 0 ? 0 : 1,
                    borderColor: '#059669',
                    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 4,
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    cursor: savingAll ? 'not-allowed' : 'pointer',
                  } as any}
                >
                  {savingAll ? (
                    <><ActivityIndicator size="small" color="#FFFFFF" /><Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>Saving...</Text></>
                  ) : (
                    <><Text style={{ fontSize: 13 }}>💾</Text><Text style={{ color: '#059669', fontSize: 11, fontWeight: '600' }}>Save</Text></>
                  )}
                </Pressable>

                <Pressable
                  onPress={generateAndPrintAll}
                  disabled={printingAll || savingAll || printAllInvoices.length === 0}
                  style={{
                    backgroundColor: printingAll || savingAll || printAllInvoices.length === 0 ? '#94A3B8' : '#059669',
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
          </View>
        )}

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
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <Pressable
                  onPress={savePdf}
                  disabled={savingPdf || generating}
                  style={{
                    backgroundColor: savingPdf || generating ? '#94A3B8' : '#FFFFFF',
                    borderWidth: savingPdf || generating ? 0 : 1,
                    borderColor: '#059669',
                    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 4,
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    cursor: savingPdf ? 'not-allowed' : 'pointer',
                  } as any}
                >
                  {savingPdf ? (
                    <><ActivityIndicator size="small" color="#FFFFFF" /><Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>Saving...</Text></>
                  ) : (
                    <><Text style={{ fontSize: 13 }}>💾</Text><Text style={{ color: '#059669', fontSize: 11, fontWeight: '600' }}>Save</Text></>
                  )}
                </Pressable>

                <Pressable
                  onPress={generatePdf}
                  disabled={generating || savingPdf}
                  style={{ backgroundColor: generating || savingPdf ? '#94A3B8' : '#059669', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 6 } as any}
                >
                  {generating ? (
                    <><ActivityIndicator size="small" color="#FFFFFF" /><Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>Generating...</Text></>
                  ) : (
                    <><Text style={{ fontSize: 13 }}>⚡</Text><Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>Generate PDF</Text></>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        )}

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

      <Modal visible={showSizeWarning} transparent animationType="fade" onRequestClose={() => setShowSizeWarning(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 4, width: '100%', maxWidth: 460, overflow: 'hidden' }}>
            <View style={{ backgroundColor: '#FEF3C7', padding: 14, borderBottomWidth: 1, borderColor: '#FDE68A', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>⚠️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>File Too Large</Text>
                <Text style={{ fontSize: 11, color: '#92400E' }}>Max allowed size is {MAX_FILE_SIZE_MB} MB per file</Text>
              </View>
            </View>
            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: 12, color: '#334155', marginBottom: 10 }}>
                The following file(s) exceed {MAX_FILE_SIZE_MB} MB and were NOT uploaded.
                Please reduce their size and try again.
              </Text>
              <View style={{ backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 4, padding: 8, maxHeight: 180, overflow: 'auto' } as any}>
                {oversizedFiles.map((f, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 9 }}>📄</Text>
                    <Text style={{ fontSize: 10, color: '#78350F', flex: 1 }} numberOfLines={2}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={{ padding: 12, borderTopWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'flex-end', gap: 6, backgroundColor: '#F8FAFC' }}>
              <Pressable
                onPress={() => { setShowSizeWarning(false); setOversizedFiles([]); }}
                style={{ backgroundColor: '#2563EB', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 4 }}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF' }}>OK, I'll Reduce Size</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}