import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

const API_BASE_URL = 'https://invoice-python-api-q2oq.onrender.com';

type ReportItem = {
  id: string;
  invoice: string;
  model: string;
  size: string;
  barcode: string;
  status: string;
  deliveredAt: string;
  normal_rate: string;
  shak: string;
  tatriz: string;
  amount: string;
};

export default function ReportPage() {
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${API_BASE_URL}/api/pdf-viewer-reports?status=delivered`);
      setItems(response.data.items);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleInputChange = (id: string, field: string, value: string) => {
    setEditValues(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value
      }
    }));
  };

  const saveReport = async (item: ReportItem) => {
    try {
      setSavingId(item.id);
      setMessage('');
      const values = editValues[item.id] || {};

      const payload = {
        normal_rate: values.normal_rate !== undefined ? values.normal_rate : item.normal_rate,
        shak: values.shak !== undefined ? values.shak : item.shak,
        tatriz: values.tatriz !== undefined ? values.tatriz : item.tatriz,
        amount: values.amount !== undefined ? values.amount : item.amount,
      };

      await axios.patch(`${API_BASE_URL}/api/pdf-viewer-delivery-items/${item.id}/report`, payload);

      setItems(prev => prev.map(i =>
        i.id === item.id ? { ...i, ...payload } : i
      ));

      setMessage('✅ Report saved successfully');
      setTimeout(() => setMessage(''), 2000);
    } catch (err: any) {
      setError('Failed to save report');
    } finally {
      setSavingId(null);
    }
  };

  // Helper to get YYYY-MM-DD string for grouping
  const getDateKey = (dateStr: string) => {
    if (!dateStr || dateStr === '-') return '0000-00-00';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '0000-00-00';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Helper to get display label
  const getDisplayLabel = (dateKey: string) => {
    if (dateKey === '0000-00-00') return 'Unknown Date';

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    if (dateKey === todayKey) return 'Today';
    if (dateKey === yesterdayKey) return 'Yesterday';

    const d = new Date(dateKey);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Group items by date key
  const groupedItems = items.reduce((acc, item) => {
    const dateKey = getDateKey(item.deliveredAt);
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(item);
    return acc;
  }, {} as Record<string, ReportItem[]>);

  // Sort keys descending
  const sortedGroupKeys = Object.keys(groupedItems).sort((a, b) => b.localeCompare(a));

  const cellStyle = (flexVal: number) => ({
    flex: flexVal,
    paddingVertical: 8,
    paddingHorizontal: 6,
    justifyContent: 'center' as const,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  });

  const headerCellStyle = (flexVal: number) => ({
    flex: flexVal,
    paddingVertical: 10,
    paddingHorizontal: 6,
    justifyContent: 'center' as const,
  });

  const inputStyle = {
    width: '100%',
    padding: '6px 8px',
    border: '1px solid #CBD5E1',
    borderRadius: 4,
    fontSize: 11,
    outline: 'none',
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
  };

  return (
    <View style={{ flex: 1, minHeight: '100vh' as any, padding: 24, background: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)' } as any}>
      <View style={{ width: '100%', maxWidth: '100%', alignSelf: 'center' }}>

        <View style={{ marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
          <View>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Reports</Text>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>Delivery Report</Text>
            <Text style={{ fontSize: 12, color: '#475569' }}>Only delivered items. Add amounts manually.</Text>
          </View>
          <Pressable onPress={fetchReports} disabled={loading} style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 4 }}>
            <Text style={{ color: '#475569', fontSize: 12, fontWeight: '600' }}>↻ Refresh</Text>
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

        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } as any}>

          {loading ? (
            <View style={{ paddingVertical: 30, alignItems: 'center' }}><ActivityIndicator size="small" color="#2563EB" /></View>
          ) : items.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>📋</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#0F172A' }}>No Delivered Items Found</Text>
              <Text style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>Scan barcodes in Delivery Data page</Text>
            </View>
          ) : (
            <View style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>

              {/* MAIN TABLE HEADER */}
              <View style={{ flexDirection: 'row', backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderColor: '#E2E8F0' }}>
                <View style={headerCellStyle(1.5)}><Text style={{ fontSize: 9, fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Invoice</Text></View>
                <View style={headerCellStyle(1)}><Text style={{ fontSize: 9, fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Model</Text></View>
                <View style={headerCellStyle(0.8)}><Text style={{ fontSize: 9, fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Size</Text></View>
                <View style={headerCellStyle(2)}><Text style={{ fontSize: 9, fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Barcode</Text></View>
                <View style={headerCellStyle(1.2)}><Text style={{ fontSize: 9, fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Normal Rate</Text></View>
                <View style={headerCellStyle(1)}><Text style={{ fontSize: 9, fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Shak</Text></View>
                <View style={headerCellStyle(1)}><Text style={{ fontSize: 9, fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Tatriz</Text></View>
                <View style={headerCellStyle(1.2)}><Text style={{ fontSize: 9, fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Amount</Text></View>
                <View style={headerCellStyle(1)}><Text style={{ fontSize: 9, fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Delivered</Text></View>
                <View style={headerCellStyle(1)}><Text style={{ fontSize: 9, fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Action</Text></View>
              </View>

              {/* TABLE BODY (All groups inside one) */}
              <ScrollView style={{ maxHeight: '70vh' as any }}>
                {sortedGroupKeys.map((dateKey, groupIndex) => {
                  const displayLabel = getDisplayLabel(dateKey);
                  return (
                    <React.Fragment key={dateKey}>

                      {/* Date Separator Row */}
                      <View style={{
                        flexDirection: 'row',
                        backgroundColor: displayLabel === 'Today' ? '#EFF6FF' : displayLabel === 'Yesterday' ? '#FFF7ED' : '#F1F5F9',
                        borderBottomWidth: 1,
                        borderTopWidth: groupIndex > 0 ? 1 : 0,
                        borderColor: '#E2E8F0',
                        paddingVertical: 6,
                        paddingHorizontal: 8,
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: displayLabel === 'Today' ? '#2563EB' : displayLabel === 'Yesterday' ? '#EA580C' : '#475569' }}>
                          📅 {displayLabel}
                        </Text>
                        <Text style={{ fontSize: 9, color: '#94A3B8' }}>{groupedItems[dateKey].length} items</Text>
                      </View>

                      {/* Items for this date */}
                      {groupedItems[dateKey].map((item) => {
                        const currentValues = editValues[item.id] || {};
                        const isSaving = savingId === item.id;

                        return (
                          <View key={item.id} style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#F1F5F9', alignItems: 'center' }}>
                            <View style={cellStyle(1.5)}><Text style={{ fontSize: 11, fontWeight: '600', color: '#0F172A' }}>{item.invoice}</Text></View>
                            <View style={cellStyle(1)}><Text style={{ fontSize: 11, color: '#334155' }}>{item.model}</Text></View>
                            <View style={cellStyle(0.8)}><Text style={{ fontSize: 11, color: '#334155' }}>{item.size}</Text></View>
                            <View style={cellStyle(2)}><Text style={{ fontSize: 9, color: '#64748B', fontFamily: 'monospace' }} numberOfLines={1}>{item.barcode}</Text></View>

                            <View style={cellStyle(1.2)}>
                              {React.createElement('input', {
                                value: currentValues.normal_rate !== undefined ? currentValues.normal_rate : item.normal_rate,
                                placeholder: '0.00',
                                onChange: (e: any) => handleInputChange(item.id, 'normal_rate', e.target.value),
                                style: inputStyle
                              })}
                            </View>
                            <View style={cellStyle(1)}>
                              {React.createElement('input', {
                                value: currentValues.shak !== undefined ? currentValues.shak : item.shak,
                                placeholder: '0.00',
                                onChange: (e: any) => handleInputChange(item.id, 'shak', e.target.value),
                                style: inputStyle
                              })}
                            </View>
                            <View style={cellStyle(1)}>
                              {React.createElement('input', {
                                value: currentValues.tatriz !== undefined ? currentValues.tatriz : item.tatriz,
                                placeholder: '0.00',
                                onChange: (e: any) => handleInputChange(item.id, 'tatriz', e.target.value),
                                style: inputStyle
                              })}
                            </View>
                            <View style={cellStyle(1.2)}>
                              {React.createElement('input', {
                                value: currentValues.amount !== undefined ? currentValues.amount : item.amount,
                                placeholder: '0.00',
                                onChange: (e: any) => handleInputChange(item.id, 'amount', e.target.value),
                                style: inputStyle
                              })}
                            </View>

                            <View style={cellStyle(1)}>
                              <View style={{ backgroundColor: '#F0FDF4', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 3, alignSelf: 'flex-start' }}>
                                <Text style={{ fontSize: 9, fontWeight: '600', color: '#15803D' }}>✓ Yes</Text>
                              </View>
                            </View>

                            <View style={cellStyle(1)}>
                              <Pressable
                                onPress={() => saveReport(item)}
                                disabled={isSaving}
                                style={{ backgroundColor: isSaving ? '#94A3B8' : '#2563EB', paddingVertical: 5, paddingHorizontal: 8, borderRadius: 4, alignSelf: 'flex-start' }}
                              >
                                <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '600' }}>
                                  {isSaving ? '...' : 'Save'}
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}