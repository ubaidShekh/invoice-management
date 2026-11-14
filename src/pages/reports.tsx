import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

type Item = { id: string; invoice: string; model: string; size: string; barcode: string; status: string; deliveredAt: string; normal_rate: string; shak: string; tatriz: string; amount: string; };
type ReportFilter = 'all' | 'delivered' | 'undelivered';
const API_URL = 'https://invoice-python-api-q2oq.onrender.com';

export default function ReportsPage() {
  const [filter, setFilter] = useState<ReportFilter>('all');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');

  const fetchReports = async () => {
    try {
      setLoading(true);
      setMessage('');
      const response = await axios.get(`${API_URL}/api/reports`, { params: { status: filter } });
      setItems(response.data.items);
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'Failed to fetch reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, [filter]);

  const exportExcel = async () => {
    try {
      setExporting(true);
      const response = await axios.get(`${API_URL}/api/invoices/export`, { params: { status: filter }, responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filter}-delivery-sheet.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage('Excel export failed.');
    } finally {
      setExporting(false);
    }
  };

  const cell = (width: number, bold = false) => ({
    width, paddingVertical: 10, paddingHorizontal: 8, fontSize: 11,
    fontWeight: bold ? '600' as const : '400' as const, color: bold ? '#FFFFFF' : '#334155',
    borderRightWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center' as const,
  });

  const btnStyle = { backgroundColor: '#2563EB', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontWeight: '600' };

  return (
    <View style={{ padding: 24 }}>
      <View style={{ width: '100%', maxWidth: 1200, alignSelf: 'center' }}>

        {/* Title */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Analytics</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>Delivery Reports</Text>
          <Text style={{ fontSize: 13, color: '#475569' }}>Monitor shipment deliveries and export reports.</Text>
        </View>

        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } as any}>

          {/* Controls */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Filter</Text>
                {React.createElement('select', { value: filter, onChange: (e: any) => setFilter(e.target.value), style: { padding: '8px 12px', width: 160, border: '1px solid #CBD5E1', borderRadius: 4, backgroundColor: '#fff', color: '#334155', fontSize: 12, outline: 'none' } }, [
                  React.createElement('option', { key: 'all', value: 'all' }, 'All Items'),
                  React.createElement('option', { key: 'delivered', value: 'delivered' }, 'Delivered'),
                  React.createElement('option', { key: 'undelivered', value: 'undelivered' }, 'Undelivered'),
                ])}
              </View>
              {React.createElement('button', { onClick: fetchReports, disabled: loading, style: { ...btnStyle, backgroundColor: '#FFFFFF', color: '#344054', border: '1px solid #CBD5E1', opacity: loading ? 0.6 : 1 } }, loading ? '...' : '↻ Refresh')}
            </View>
            {React.createElement('button', { onClick: exportExcel, disabled: exporting, style: { ...btnStyle, backgroundColor: '#059669', opacity: exporting ? 0.6 : 1 } }, exporting ? 'Exporting...' : '↓ Export Excel')}
          </View>

          {message !== '' && <Text style={{ color: '#B91C1C', backgroundColor: '#FEF2F2', padding: 10, borderRadius: 4, marginBottom: 16, fontSize: 12 }}>{message}</Text>}

          <View style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
            {loading ? (
              <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator size="small" color="#2563EB" /></View>
            ) : items.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}><Text style={{ fontSize: 13, color: '#64748B' }}>No records found.</Text></View>
            ) : (
              <ScrollView horizontal>
                <View>
                  <View style={{ flexDirection: 'row', backgroundColor: '#28A745' }}>
                    {[['Invoice No.', 120], ['Model', 80], ['Size', 60], ['Barcode', 200], ['Normal Rate', 100], ['Shak', 80], ['Tatriz', 80], ['Amount', 80], ['Delivered', 100]].map(([label, width]) => (
                      <View key={label} style={cell(width as number, true)}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#FFFFFF', textAlign: 'center', textTransform: 'uppercase' }}>{label}</Text>
                      </View>
                    ))}
                  </View>
                  <ScrollView style={{ maxHeight: 500 }}>
                    {items.map((item, index) => (
                      <View key={item.id} style={{ flexDirection: 'row', backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F8FAFC', borderBottomWidth: 1, borderColor: '#E2E8F0' }}>
                        <View style={cell(120)}><Text style={{ fontSize: 11, fontWeight: '600', color: '#0F172A', textAlign: 'center' }}>{item.invoice}</Text></View>
                        <View style={cell(80)}><Text style={{ fontSize: 11, color: '#334155', textAlign: 'center' }}>{item.model}</Text></View>
                        <View style={cell(60)}><Text style={{ fontSize: 11, color: '#334155', textAlign: 'center' }}>{item.size}</Text></View>
                        <View style={cell(200)}><Text style={{ fontSize: 10, color: '#2563EB', textAlign: 'center', fontFamily: 'monospace' }}>{item.barcode}</Text></View>
                        <View style={cell(100)}><Text style={{ fontSize: 11, color: '#334155', textAlign: 'center' }}>{item.normal_rate || '-'}</Text></View>
                        <View style={cell(80)}><Text style={{ fontSize: 11, color: '#334155', textAlign: 'center' }}>{item.shak || '-'}</Text></View>
                        <View style={cell(80)}><Text style={{ fontSize: 11, color: '#334155', textAlign: 'center' }}>{item.tatriz || '-'}</Text></View>
                        <View style={cell(80)}><Text style={{ fontSize: 11, color: '#334155', textAlign: 'center' }}>{item.amount || '-'}</Text></View>
                        <View style={cell(100)}>
                          <Text style={{ fontSize: 10, fontWeight: '600', color: item.status === 'Delivered' ? '#15803D' : '#EA580C', textAlign: 'center' }}>
                            {item.status === 'Delivered' ? '✓ Delivered' : 'Pending'}
                          </Text>
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
    </View>
  );
}