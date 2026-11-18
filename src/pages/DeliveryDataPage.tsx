import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

const API_BASE_URL = 'https://invoice-python-api-q2oq.onrender.com';

type DeliveryItem = {
  _id: string;
  invoice: string;
  model: string;
  size: string;
  barcode: string;
  status: 'Pending' | 'Delivered';
  filename: string;
  date: string;
};

export default function DeliveryDataPage() {
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItem[]>([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryBarcode, setDeliveryBarcode] = useState('');
  const [delivering, setDelivering] = useState(false);
  const [deliveryMessage, setDeliveryMessage] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const deliveryInputRef = useRef<HTMLInputElement>(null);

  const fetchDeliveryItems = async () => {
    try {
      setDeliveryLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/pdf-viewer-delivery-items`);
      setDeliveryItems(response.data);
    } catch (err: any) {
      console.error('Failed to fetch PDF viewer delivery items', err);
      setError(err.response?.data?.detail || 'Failed to fetch delivery items.');
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

  useEffect(() => {
    fetchDeliveryItems();
  }, []);

  useEffect(() => {
    if (deliveryInputRef.current && !delivering) {
      setTimeout(() => { deliveryInputRef.current?.focus(); }, 300);
    }
  }, [deliveryItems]);

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

        {/* Header */}
        <View style={{ marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
          <View>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Delivery Workspace</Text>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>PDF Viewer Delivery Items</Text>
            <Text style={{ fontSize: 12, color: '#475569' }}>Scan barcodes to mark items as delivered.</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <View style={{ backgroundColor: '#FFF7ED', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#EA580C' }}>{pendingDeliveryCount} Pending</Text>
            </View>
            <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#15803D' }}>{deliveredCount} Delivered</Text>
            </View>
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

        {/* Delivery Items Table */}
        <View style={{ flex: 1, width: '100%', backgroundColor: '#FFFFFF', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } as any}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>PDF Viewer Delivery Items ({deliveryItems.length})</Text>
              <Text style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>Separate from main delivery system</Text>
            </View>
          </View>

          {deliveryLoading ? (
            <View style={{ paddingVertical: 30, alignItems: 'center' }}><ActivityIndicator size="small" color="#2563EB" /></View>
          ) : deliveryItems.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: 'center', width: '100%' }}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>📦</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#0F172A', marginBottom: 2 }}>No Items Yet</Text>
              <Text style={{ fontSize: 10, color: '#64748B', textAlign: 'center' }}>Upload a PDF in PDF Viewer to generate items</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator style={{ flex: 1, width: '100%' }}>
              <View style={{ width: '100%' }}>
                <View style={{ flexDirection: 'row', backgroundColor: '#F8FAFC', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E2E8F0' }}>
                  {[['Invoice', 110], ['Model', 80], ['Size', 60], ['Barcode', 180], ['Status', 100], ['Action', 90]].map(([label, width]) => (
                    <View key={label} style={deliveryCell(width as number, true)}>
                      <Text style={{ fontSize: 9, fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>{label}</Text>
                    </View>
                  ))}
                </View>
                <ScrollView style={{ maxHeight: '100%', flex: 1, }}>
                  {deliveryItems.map((item) => (
                    <View key={item._id} style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#F1F5F9', alignItems: 'center', backgroundColor: '#FFFFFF', width: '100%', flex: 1, }}>
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
    </View>
  );
}