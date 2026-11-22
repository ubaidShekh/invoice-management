import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

type Item = {
  _id: string;
  invoice: string;
  model: string;
  size: string;
  barcode: string;
  status: 'Pending' | 'Delivered';
  date: string;
  customer_name: string;
  customer_id?: string;
};

type Customer = { _id: string; name: string; phone: string; };

const API_URL = 'https://invoice-python-api-q2oq.onrender.com';

export default function DeliveryDataPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [barcode, setBarcode] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [delivering, setDelivering] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const fetchCustomers = async () => {
    try {
      setCustomersLoading(true);
      const response = await axios.get(`${API_URL}/api/customers`);
      setCustomers(response.data);
    } catch (error: any) {
      console.log('Customers fetch error:', error.message);
    } finally {
      setCustomersLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const fetchItems = async (customerId?: string) => {
    const cid = customerId || selectedCustomer?._id;
    if (!cid) return;
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/pdf-viewer-delivery-items?customer_id=${cid}`);
      setItems(response.data);
      setMessage('');
    } catch (error: any) {
      console.log('Fetch Error:', error.message);
      setMessage('Failed to fetch delivery items.');
    } finally {
      setLoading(false);
    }
  };

  const selectCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setItems([]);
    setMessage('');
    setBarcode('');
    await fetchItems(customer._id);
    setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 500);
  };

  const deliverItem = async (value: string) => {
    const code = value.trim();
    if (!code) {
      setMessage('Please enter or scan a barcode.');
      if (inputRef.current) inputRef.current.focus();
      return;
    }
    if (delivering || !selectedCustomer) return;

    try {
      setDelivering(true);
      setMessage('');
      const response = await axios.post(`${API_URL}/api/pdf-viewer-delivery-items/scan`, {
        barcode: code,
        customer_id: selectedCustomer._id,
      });
      setMessage(`✅ ${response.data.message} (${code})`);
      setBarcode('');
      await fetchItems();
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Backend connection failed.';
      setMessage(`❌ ${errorMessage} (${code})`);
      setBarcode('');
    } finally {
      setDelivering(false);
      setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); deliverItem(barcode); }
  };

  const openCameraScanner = () => { alert('Camera scanner integration will be added.'); };

  const buttonStyle = {
    backgroundColor: '#2563EB', color: '#fff', border: 'none', borderRadius: 4,
    padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontWeight: '600',
  };

  const pendingCount = items.filter((item) => item.status === 'Pending').length;
  const deliveredCount = items.filter((item) => item.status === 'Delivered').length;

  // ================= CUSTOMER LIST VIEW =================
  if (!selectedCustomer) {
    return (
      <View style={{ flex: 1, minHeight: '100vh' as any, padding: 24, background: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)' } as any}>
        <View style={{ width: '100%', maxWidth: 900, alignSelf: 'center' }}>
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              Logistics / Delivery Management
            </Text>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>Select Customer</Text>
            <Text style={{ fontSize: 12, color: '#475569' }}>Choose a customer to manage their deliveries.</Text>
          </View>

          {customersLoading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}><ActivityIndicator size="large" color="#2563EB" /></View>
          ) : customers.length === 0 ? (
            <View style={{ backgroundColor: '#FFFFFF', padding: 40, alignItems: 'center', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 32, marginBottom: 12 }}>👥</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 4 }}>No Customers Yet</Text>
              <Text style={{ fontSize: 12, color: '#64748B' }}>Add customers from the PDF Viewer page.</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {customers.map((customer) => (
                <Pressable key={customer._id} onPress={() => selectCustomer(customer)}
                  style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, cursor: 'pointer' } as any}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18 }}>👤</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{customer.name}</Text>
                    <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{customer.phone || 'No phone'}</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: '#2563EB', fontWeight: '600' }}>View →</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }

  // ================= CUSTOMER-SCOPED PAGE =================
  return (
    <View style={{ flex: 1, minHeight: '100vh' as any, padding: 24, background: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)' } as any}>
      <View style={{ width: '100%', maxWidth: '100%', alignSelf: 'center' }}>

        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Pressable onPress={() => { setSelectedCustomer(null); setItems([]); setBarcode(''); setMessage(''); }}
              style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 4 } as any}>
              <Text style={{ color: '#475569', fontSize: 12, fontWeight: '600' }}>← Back</Text>
            </Pressable>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Customer: {selectedCustomer.name}
            </Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>Delivery Data & Scanner</Text>
          <Text style={{ fontSize: 12, color: '#475569' }}>Manage shipment records, scan barcodes and track delivery status.</Text>
        </View>

        {/* Stats Cards */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
          <View style={{ flex: 1, minWidth: 180, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' } as any}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <View style={{ width: 28, height: 28, backgroundColor: '#EFF6FF', borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                <Text style={{ fontSize: 14 }}>📦</Text>
              </View>
              <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '500' }}>Total Items</Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F172A' }}>{loading ? '...' : items.length}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 180, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' } as any}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <View style={{ width: 28, height: 28, backgroundColor: '#FFF7ED', borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                <Text style={{ fontSize: 14 }}>⏳</Text>
              </View>
              <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '500' }}>Pending Deliveries</Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#EA580C' }}>{loading ? '...' : pendingCount}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 180, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' } as any}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <View style={{ width: 28, height: 28, backgroundColor: '#F0FDF4', borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                <Text style={{ fontSize: 14 }}>✓</Text>
              </View>
              <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '500' }}>Delivered Items</Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#15803D' }}>{loading ? '...' : deliveredCount}</Text>
          </View>
        </View>

        {/* Scanner Card */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 4, borderWidth: 2, borderColor: '#2563EB', padding: 16, marginBottom: 16, boxShadow: '0 4px 6px rgba(37, 99, 235, 0.08)' } as any}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <View style={{ width: 30, height: 30, backgroundColor: '#EFF6FF', borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <Text style={{ fontSize: 15 }}>▥</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>Hardware Scanner Ready</Text>
              <Text style={{ fontSize: 11, color: '#2563EB' }}>🟢 Waiting for scan...</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            {React.createElement('input', {
              ref: inputRef, value: barcode, placeholder: 'Scan or type barcode...', disabled: delivering,
              onChange: (e: any) => setBarcode(e.target.value), onKeyDown: handleKeyDown, autoFocus: true,
              style: { flex: 1, minWidth: 200, padding: '9px 12px', border: '2px solid #2563EB', borderRadius: 4, fontSize: 13, fontWeight: '600', outline: 'none', backgroundColor: delivering ? '#F1F5F9' : '#EFF6FF', color: '#0F172A' },
            })}
            {React.createElement('button', { onClick: () => deliverItem(barcode), disabled: delivering || !barcode.trim(), style: { ...buttonStyle, padding: '9px 16px', opacity: delivering || !barcode.trim() ? 0.5 : 1 } }, delivering ? 'Processing...' : '✓ Deliver')}
            {React.createElement('button', { onClick: () => fetchItems(), disabled: loading || delivering, style: { ...buttonStyle, backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0', padding: '9px 12px' } }, '↻ Refresh')}
            {React.createElement('button', { onClick: openCameraScanner, style: { ...buttonStyle, backgroundColor: '#FFFFFF', color: '#2563EB', border: '1px solid #BFDBFE', padding: '9px 12px' } }, '📷 Camera')}
          </View>

          {message !== '' && (
            <View style={{ marginTop: 10, padding: 8, borderRadius: 4, backgroundColor: message.includes('✅') ? '#F0FDF4' : '#FEF2F2', borderWidth: 1, borderColor: message.includes('✅') ? '#BBF7D0' : '#FECACA' }}>
              <Text style={{ color: message.includes('✅') ? '#15803D' : '#DC2626', fontSize: 11, fontWeight: '500' }}>{message}</Text>
            </View>
          )}
        </View>

        {/* Delivery Records Table */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } as any}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            <View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>Delivery Records</Text>
              <Text style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>Track invoice, barcode and shipment status.</Text>
            </View>
            <View style={{ backgroundColor: '#F1F5F9', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: '#475569' }}>{loading ? 'Loading...' : `${items.length} Records`}</Text>
            </View>
          </View>

          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 30 }}><ActivityIndicator size="small" color="#2563EB" /></View>
          ) : items.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 30 }}>
              <Text style={{ fontSize: 24, marginBottom: 8 }}>📦</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#0F172A' }}>No Delivery Items Found</Text>
            </View>
          ) : (
            <View style={{ width: '100%' }}>
              <View style={{ flexDirection: 'row', backgroundColor: '#F8FAFC', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E2E8F0' }}>
                <View style={{ flex: 2, paddingVertical: 10, paddingHorizontal: 8 }}><Text style={{ fontSize: 9, fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Invoice</Text></View>
                <View style={{ flex: 1.5, paddingVertical: 10, paddingHorizontal: 8 }}><Text style={{ fontSize: 9, fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Customer</Text></View>
                <View style={{ flex: 1.5, paddingVertical: 10, paddingHorizontal: 8 }}><Text style={{ fontSize: 9, fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Model</Text></View>
                <View style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8 }}><Text style={{ fontSize: 9, fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Size</Text></View>
                <View style={{ flex: 2.5, paddingVertical: 10, paddingHorizontal: 8 }}><Text style={{ fontSize: 9, fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Barcode</Text></View>
                <View style={{ flex: 1.5, paddingVertical: 10, paddingHorizontal: 8 }}><Text style={{ fontSize: 9, fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Status</Text></View>
                <View style={{ flex: 2, paddingVertical: 10, paddingHorizontal: 8 }}><Text style={{ fontSize: 9, fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Date</Text></View>
                <View style={{ flex: 1.5, paddingVertical: 10, paddingHorizontal: 8 }}><Text style={{ fontSize: 9, fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Action</Text></View>
              </View>

              <ScrollView style={{ maxHeight: 500 }}>
                {items.map((item) => (
                  <View key={item._id} style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#F1F5F9', alignItems: 'center' }}>
                    <View style={{ flex: 2, paddingVertical: 10, paddingHorizontal: 8 }}><Text style={{ fontSize: 11, fontWeight: '600', color: '#0F172A' }}>{item.invoice}</Text></View>
                    <View style={{ flex: 1.5, paddingVertical: 10, paddingHorizontal: 8 }}><Text style={{ fontSize: 11, color: '#334155' }}>{item.customer_name}</Text></View>
                    <View style={{ flex: 1.5, paddingVertical: 10, paddingHorizontal: 8 }}><Text style={{ fontSize: 11, color: '#334155' }}>{item.model}</Text></View>
                    <View style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8 }}><Text style={{ fontSize: 11, color: '#334155' }}>{item.size}</Text></View>
                    <View style={{ flex: 2.5, paddingVertical: 10, paddingHorizontal: 8 }}><Text style={{ fontSize: 9, color: '#64748B', fontFamily: 'monospace' }}>{item.barcode}</Text></View>
                    <View style={{ flex: 1.5, paddingVertical: 10, paddingHorizontal: 8 }}>
                      <View style={{ backgroundColor: item.status === 'Delivered' ? '#F0FDF4' : '#FFF7ED', paddingVertical: 3, paddingHorizontal: 6, borderRadius: 3, alignSelf: 'flex-start' }}>
                        <Text style={{ fontSize: 9, fontWeight: '600', color: item.status === 'Delivered' ? '#15803D' : '#EA580C' }}>● {item.status}</Text>
                      </View>
                    </View>
                    <View style={{ flex: 2, paddingVertical: 10, paddingHorizontal: 8 }}><Text style={{ fontSize: 10, color: '#64748B' }}>{item.date === '-' ? '-' : new Date(item.date).toLocaleString()}</Text></View>
                    <View style={{ flex: 1.5, paddingVertical: 10, paddingHorizontal: 8 }}>
                      {item.status === 'Pending' && React.createElement('button', {
                        onClick: () => deliverItem(item.barcode), disabled: delivering,
                        style: { backgroundColor: '#2563EB', color: '#fff', border: 'none', borderRadius: 3, padding: '5px 8px', fontSize: 10, fontWeight: '600', cursor: 'pointer', opacity: delivering ? 0.6 : 1 },
                      }, delivering ? '...' : 'Deliver')}
                      {item.status === 'Delivered' && <Text style={{ fontSize: 10, fontWeight: '600', color: '#15803D' }}>✓ Done</Text>}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <Text style={{ fontSize: 10, color: '#94A3B8', textAlign: 'center', marginTop: 16 }}>Delivery Management System • Logistics Operations</Text>
      </View>
    </View>
  );
}