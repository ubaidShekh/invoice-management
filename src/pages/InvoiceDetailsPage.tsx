import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';

const API_BASE_URL = 'https://invoice-python-api-q2oq.onrender.com';

type Product = { model: string; size: string; product_code?: string; };
type CustomerInfo = { customer_name: string; address: string; phone: string; total_amount: string; payment_method: string; status: string; };
type Invoice = { _id: string; invoice_number: string; filename: string; file_size: number; products: Product[]; customer_info: CustomerInfo; date: string; };

export default function InvoiceDetailsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchInvoices = useCallback(async () => {
    try {
      setError('');
      const response = await axios.get(`${API_BASE_URL}/api/invoices`, { timeout: 30000 });
      setInvoices(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch invoices.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  // Flex based cell style for full width
  const cellStyle = {
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center' as const,
  };

  return (
    <View style={{ flex: 1, minHeight: '100vh' as any, padding: 24, background: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)' } as any}>
      <View style={{ width: '100%', maxWidth: '100%', alignSelf: 'center' }}>

        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Invoice Management / Records</Text>
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#0F172A', marginBottom: 6 }}>Saved Invoices</Text>
          <Text style={{ fontSize: 13, color: '#475569' }}>View extracted invoice records and customer details.</Text>
        </View>

        {/* Summary Card */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 4, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16, flexDirection: 'row', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } as any}>
          <View style={{ width: 40, height: 40, borderRadius: 4, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Text style={{ fontSize: 16 }}>📄</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 2 }}>Total Records</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F172A' }}>{loading ? '...' : invoices.length}</Text>
          </View>
          <Pressable onPress={fetchInvoices} disabled={loading} style={{ backgroundColor: '#2563EB', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 4 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>Refresh</Text>
          </Pressable>
        </View>

        {!!error && (
          <View style={{ backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', padding: 12, borderRadius: 4, marginBottom: 16 }}>
            <Text style={{ color: '#B91C1C', fontSize: 12 }}>{error}</Text>
          </View>
        )}

        {/* Table Card */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } as any}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>Invoice Records</Text>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}><ActivityIndicator size="small" color="#2563EB" /></View>
          ) : invoices.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}><Text style={{ fontSize: 13, color: '#64748B' }}>No Invoices Found</Text></View>
          ) : (
            <View style={{ width: '100%' }}>
              {/* Table Header */}
              <View style={{ flexDirection: 'row', backgroundColor: '#F8FAFC', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E2E8F0' }}>
                <View style={{ flex: 3, ...cellStyle }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Invoice No.</Text>
                </View>
                <View style={{ flex: 2, ...cellStyle }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Model</Text>
                </View>
                <View style={{ flex: 2, ...cellStyle }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Size</Text>
                </View>
                <View style={{ flex: 3, ...cellStyle }}>
                  {/* <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Action</Text> */}
                </View>
              </View>

              {/* Table Data */}
              {invoices.map((inv) => {
                const productsToShow = inv.products?.length > 0 ? inv.products : [{ model: 'N/A', size: 'N/A' }];

                return productsToShow.map((product, idx) => (
                  <View key={`${inv._id}-${idx}`} style={{ flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#F1F5F9' }}>
                    <View style={{ flex: 3, ...cellStyle }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>#{inv.invoice_number}</Text>
                    </View>
                    <View style={{ flex: 2, ...cellStyle }}>
                      <Text style={{ fontSize: 13, fontWeight: '500', color: '#334155' }}>{product.model || 'N/A'}</Text>
                    </View>
                    <View style={{ flex: 2, ...cellStyle }}>
                      <Text style={{ fontSize: 13, fontWeight: '500', color: '#334155' }}>{product.size || 'N/A'}</Text>
                    </View>
                    <View style={{ flex: 3, ...cellStyle }}>
                      {/* <Pressable onPress={() => setSelectedInvoice(inv)} style={{ backgroundColor: '#EFF6FF', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4, borderWidth: 1, borderColor: '#DBEAFE', alignSelf: 'flex-start' }}>
                        <Text style={{ color: '#2563EB', fontSize: 12, fontWeight: '600' }}>View Details</Text>
                      </Pressable> */}
                    </View>
                  </View>
                ));
              })}
            </View>
          )}
        </View>
      </View>

      {/* Details Modal */}
      <Modal visible={selectedInvoice !== null} transparent animationType="fade" onRequestClose={() => setSelectedInvoice(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 4, width: '100%', maxWidth: 800, maxHeight: '90%', overflow: 'hidden' }}>
            {selectedInvoice && (
              <>
                <View style={{ backgroundColor: '#F8FAFC', padding: 16, borderBottomWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A' }}>Invoice Details</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#2563EB', marginTop: 2 }}>Order #{selectedInvoice.invoice_number}</Text>
                  </View>
                  <Pressable onPress={() => setSelectedInvoice(null)} style={{ backgroundColor: '#FFFFFF', padding: 8, borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <Text style={{ fontSize: 14, color: '#475569', fontWeight: '700' }}>✕</Text>
                  </Pressable>
                </View>

                <ScrollView style={{ padding: 20 }}>
                  <View style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4, marginBottom: 20 }}>
                    <View style={{ backgroundColor: '#F1F5F9', padding: 10, borderBottomWidth: 1, borderColor: '#E2E8F0' }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.3 }}>Customer Details</Text>
                    </View>
                    <View style={{ padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
                      <View style={{ minWidth: 200 }}>
                        <Text style={{ fontSize: 11, color: '#64748B' }}>Name</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A', marginTop: 2 }}>{selectedInvoice.customer_info?.customer_name || 'N/A'}</Text>
                      </View>
                      <View style={{ minWidth: 150 }}>
                        <Text style={{ fontSize: 11, color: '#64748B' }}>Phone</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A', marginTop: 2 }}>{selectedInvoice.customer_info?.phone || 'N/A'}</Text>
                      </View>
                      <View style={{ minWidth: 150 }}>
                        <Text style={{ fontSize: 11, color: '#64748B' }}>Payment Method</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A', marginTop: 2 }}>{selectedInvoice.customer_info?.payment_method || 'N/A'}</Text>
                      </View>
                      <View style={{ minWidth: 150 }}>
                        <Text style={{ fontSize: 11, color: '#64748B' }}>Total Amount</Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#15803D', marginTop: 2 }}>SAR {selectedInvoice.customer_info?.total_amount || '0'}</Text>
                      </View>
                      <View style={{ minWidth: 150 }}>
                        <Text style={{ fontSize: 11, color: '#64748B' }}>Status</Text>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#15803D', marginTop: 2 }}>✓ {selectedInvoice.customer_info?.status || 'Paid'}</Text>
                      </View>
                      <View style={{ width: '100%' }}>
                        <Text style={{ fontSize: 11, color: '#64748B' }}>Address</Text>
                        <Text style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{selectedInvoice.customer_info?.address || 'N/A'}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>Product Details</Text>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#2563EB', backgroundColor: '#EFF6FF', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 4 }}>
                      {selectedInvoice.products?.length || 0} Items
                    </Text>
                  </View>

                  <View style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                    <View style={{ flexDirection: 'row', backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderColor: '#E2E8F0' }}>
                      <View style={{ flex: 2, padding: 10 }}><Text style={{ fontSize: 10, fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Model</Text></View>
                      <View style={{ flex: 2, padding: 10 }}><Text style={{ fontSize: 10, fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Size</Text></View>
                      <View style={{ flex: 2, padding: 10 }}><Text style={{ fontSize: 10, fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Product Code</Text></View>
                      <View style={{ flex: 3, padding: 10 }}><Text style={{ fontSize: 10, fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Barcode</Text></View>
                    </View>
                    {selectedInvoice.products?.length ? (
                      selectedInvoice.products.map((p, i) => (
                        <View key={i} style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#F1F5F9', backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                          <View style={{ flex: 2, padding: 10 }}><Text style={{ fontSize: 12, fontWeight: '600', color: '#0F172A' }}>{p.model}</Text></View>
                          <View style={{ flex: 2, padding: 10 }}><Text style={{ fontSize: 12, color: '#334155' }}>{p.size}</Text></View>
                          <View style={{ flex: 2, padding: 10 }}><Text style={{ fontSize: 11, color: '#64748B' }}>{p.product_code || '-'}</Text></View>
                          <View style={{ flex: 3, padding: 10 }}><Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#2563EB' }}>INV-{selectedInvoice.invoice_number}-{i + 1}</Text></View>
                        </View>
                      ))
                    ) : (
                      <View style={{ padding: 20, alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: '#64748B' }}>No products found for this invoice.</Text>
                      </View>
                    )}
                  </View>
                </ScrollView>

                <View style={{ padding: 16, borderTopWidth: 1, borderColor: '#E2E8F0', alignItems: 'flex-end', backgroundColor: '#F8FAFC' }}>
                  <Pressable onPress={() => setSelectedInvoice(null)} style={{ backgroundColor: '#2563EB', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 4 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>Close</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}