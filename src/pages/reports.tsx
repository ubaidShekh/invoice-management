import axios from 'axios';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

const API_BASE_URL = 'https://invoice-python-api-q2oq.onrender.com';
const GREEN = '#166534';
const BLACK = '#000000';
const WHITE = '#FFFFFF';

// PDF columns (unchanged for download)
const PDF_COLUMN_DEFINITIONS = [
  { key: 'index', label: '#', flex: 0.5, align: 'center' },
  { key: 'date', label: 'DATE', flex: 1.2, align: 'center' },
  { key: 'invoice', label: 'INVOICE', flex: 1, align: 'center' },
  { key: 'model', label: 'MODEL', flex: 3, align: 'left' },
  { key: 'quantity', label: 'QTY', flex: 1, align: 'right' },
  { key: 'rate', label: 'RATE', flex: 1.2, align: 'right' },
  { key: 'shak', label: 'SHAK', flex: 1, align: 'right' },
  { key: 'tatriz', label: 'TATRIZ', flex: 1, align: 'right' },
  { key: 'amount', label: 'AMOUNT', flex: 1.5, align: 'right' },
  { key: 'action', label: 'ACTION', flex: 1, align: 'center' },
] as const;

// UI Table columns (compact)
const UI_COLUMNS = [
  { key: 'index', label: '#', flex: 0.5, align: 'center' },
  { key: 'date', label: 'DATE', flex: 1.5, align: 'center' },
  { key: 'invoice', label: 'INVOICE', flex: 1.5, align: 'center' },
  { key: 'quantity', label: 'QTY', flex: 0.8, align: 'right' },
  { key: 'amount', label: 'AMOUNT', flex: 1.5, align: 'right' },
  { key: 'action', label: 'ACTION', flex: 1, align: 'center' },
] as const;

const TOTAL_PDF_COLUMN_FLEX = PDF_COLUMN_DEFINITIONS.reduce((sum, column) => sum + column.flex, 0);
const TOTAL_UI_COLUMN_FLEX = UI_COLUMNS.reduce((sum, column) => sum + column.flex, 0);

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

type ExportRow = {
  idx: number;
  date: string;
  invoice: string;
  model: string;
  size: string;
  barcode: string;
  quantity: number;
  rate: number;
  shak: number;
  tatriz: number;
  amount: number;
};

type FilterType = 'all' | 'weekly' | 'monthly' | 'exact';

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export default function ReportPage() {
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editValues, setEditValues] = useState<Record<string, Record<string, string>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Filter states
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [exactDate, setExactDate] = useState<string>(''); // YYYY-MM-DD

  // Modal state
  const [selectedItem, setSelectedItem] = useState<ReportItem | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${API_BASE_URL}/api/pdf-viewer-reports?status=delivered`);
      setItems(Array.isArray(response.data?.items) ? response.data.items : []);
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
    setEditValues(previous => ({
      ...previous,
      [id]: { ...(previous[id] || {}), [field]: value },
    }));
  };

  const saveReport = async (item: ReportItem) => {
    try {
      setSavingId(item.id);
      setMessage('');
      setError('');
      const values = editValues[item.id] || {};
      const payload = {
        normal_rate: values.normal_rate !== undefined ? values.normal_rate : item.normal_rate,
        shak: values.shak !== undefined ? values.shak : item.shak,
        tatriz: values.tatriz !== undefined ? values.tatriz : item.tatriz,
        amount: values.amount !== undefined ? values.amount : item.amount,
      };

      await axios.patch(`${API_BASE_URL}/api/pdf-viewer-delivery-items/${item.id}/report`, payload);
      setItems(previous => previous.map(existing =>
        existing.id === item.id ? { ...existing, ...payload } : existing,
      ));
      setMessage('Report saved successfully');
      setTimeout(() => setMessage(''), 2000);
      setSelectedItem(null); // Close modal after save
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save report.');
    } finally {
      setSavingId(null);
    }
  };

  const getDateKey = (dateString: string) => {
    if (!dateString || dateString === '-') return '0000-00-00';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '0000-00-00';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const getDisplayLabel = (dateKey: string) => dateKey === '0000-00-00' ? 'Unknown date' : dateKey;

  const toNum = (value: unknown): number => {
    const parsed = Number.parseFloat(String(value ?? '').replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const resolvedValue = (item: ReportItem, field: keyof ReportItem) => {
    const edits = editValues[item.id] || {};
    return edits[field] !== undefined ? edits[field] : item[field];
  };

  // Filter Logic
  const filteredItems = useMemo(() => {
    if (filterType === 'all') return items;

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    let startDate = new Date(0);

    if (filterType === 'weekly') {
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (filterType === 'monthly') {
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    } else if (filterType === 'exact' && exactDate) {
      startDate = new Date(exactDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(exactDate);
      endDate.setHours(23, 59, 59, 999);
      return items.filter(item => {
        if (!item.deliveredAt || item.deliveredAt === '-') return false;
        const d = new Date(item.deliveredAt);
        return d >= startDate && d <= endDate;
      });
    }

    return items.filter(item => {
      if (!item.deliveredAt || item.deliveredAt === '-') return false;
      const d = new Date(item.deliveredAt);
      return d >= startDate && d <= today;
    });
  }, [items, filterType, exactDate]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, ReportItem[]> = {};
    filteredItems.forEach(item => {
      const key = getDateKey(item.deliveredAt);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [filteredItems]);

  const sortedGroupKeys = useMemo(
    () => Object.keys(groupedItems).sort((a, b) => b.localeCompare(a)),
    [groupedItems],
  );

  const orderedItems = sortedGroupKeys.flatMap(dateKey => groupedItems[dateKey]);

  const exportRows: ExportRow[] = useMemo(() => orderedItems.map((item, index) => ({
    idx: index + 1,
    date: item.deliveredAt && item.deliveredAt !== '-' ? item.deliveredAt : '-',
    invoice: item.invoice || '-',
    model: item.model || '-',
    size: item.size || '',
    barcode: item.barcode || '',
    quantity: 1,
    rate: toNum(resolvedValue(item, 'normal_rate')),
    shak: toNum(resolvedValue(item, 'shak')),
    tatriz: toNum(resolvedValue(item, 'tatriz')),
    amount: toNum(resolvedValue(item, 'amount')),
  })), [orderedItems, editValues]);

  const totalQuantity = exportRows.reduce((sum, row) => sum + row.quantity, 0);
  const totalAmount = exportRows.reduce((sum, row) => sum + row.amount, 0);
  const firstDateKey = sortedGroupKeys[0] || getDateKey(items[0]?.deliveredAt || '');
  const sheetDate = firstDateKey === '0000-00-00'
    ? new Date().toISOString().slice(0, 10)
    : firstDateKey;

  // PDF Build Logic (Unchanged)
  const buildPdfHtml = () => {
    const columnWidths = PDF_COLUMN_DEFINITIONS
      .map(column => `${(column.flex / TOTAL_PDF_COLUMN_FLEX) * 100}%`)
      .join('');

    let rowOffset = 0;
    const bodyRows = sortedGroupKeys.map(dateKey => {
      const groupItems = groupedItems[dateKey] || [];
      const groupRows = exportRows.slice(rowOffset, rowOffset + groupItems.length);
      rowOffset += groupItems.length;
      const groupHeading = sortedGroupKeys.length > 1
        ? `<tr class="group-row"><td colspan="10">${escapeHtml(getDisplayLabel(dateKey))}</td></tr>`
        : '';
      return groupHeading + groupRows.map(row => `
        <tr>
          <td class="center">${row.idx}</td>
          <td class="center">${escapeHtml(row.date)}</td>
          <td class="center">${escapeHtml(row.invoice)}</td>
          <td class="model-cell">
            <div class="model-name">${escapeHtml(row.model)}</div>
            <div class="model-detail">${escapeHtml(row.size ? `${row.size} | ` : '')}${escapeHtml(row.barcode)}</div>
          </td>
          <td class="right">${row.quantity}</td>
          <td class="right">${row.rate.toFixed(2)}</td>
          <td class="right">${row.shak.toFixed(2)}</td>
          <td class="right">${row.tatriz.toFixed(2)}</td>
          <td class="right">${row.amount.toFixed(2)}</td>
          <td class="center"></td>
        </tr>
      `).join('');
    }).join('');

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Delivery_Sheet_${escapeHtml(sheetDate)}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; color: #111; font-family: Arial, Helvetica, sans-serif; }
    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .document { width: 100%; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid ${GREEN}; padding-bottom: 16px; margin-bottom: 16px; min-height: 88px; }
    .brand { display: flex; flex-direction: column; align-items: flex-start; }
    .brand-mark { display: inline-flex; align-items: center; justify-content: center; min-width: 78px; height: 30px; padding: 0 9px; margin-bottom: 7px; background: #000; color: #D4AF37; border-radius: 2px; font-size: 12px; font-weight: 700; }
    .company-name { margin: 0; font-size: 22px; line-height: 1.15; font-weight: 700; letter-spacing: 1px; }
    .company-sub { margin: 2px 0 0; color: #555; font-size: 9px; line-height: 1.2; }
    .title-block { text-align: right; }
    .doc-title { margin: 5px 0 6px; font-size: 27px; line-height: 1.15; font-weight: 700; letter-spacing: .3px; }
    .meta { margin: 2px 0; font-size: 11px; line-height: 1.3; color: #333; }
    .meta strong { font-weight: 700; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11px; }
    col { width: auto; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    th { height: 38px; padding: 8px 4px; border: 1px solid #000; background: ${GREEN} !important; color: #fff !important; font-size: 11px; font-weight: 700; text-align: center; vertical-align: middle; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    td { min-height: 65px; padding: 10px 6px; border: 1px solid #000; background: #fff; color: #111; font-size: 11px; line-height: 1.35; vertical-align: middle; overflow-wrap: anywhere; }
    td.center { text-align: center; }
    td.right { text-align: right; padding-right: 8px; }
    td.model-cell { text-align: left; padding-left: 8px; }
    .model-name { font-size: 11px; font-weight: 600; color: #111; }
    .model-detail { margin-top: 2px; font-size: 9px; color: #6B7280; }
    .group-row td { padding: 4px 8px; border: 1px solid #000; background: #F9FAFB; color: #374151; font-size: 10px; font-weight: 700; text-align: left; }
    .total-row td { padding: 10px 6px; font-size: 11px; font-weight: 700; background: #fff; }
    .total-label { text-align: left; padding-left: 8px; }
    @media screen { body { padding: 20px; } .document { max-width: 1100px; margin: 0 auto; } }
  </style>
</head>
<body>
  <main class="document">
    <header class="header">
      <section class="brand">
        <div class="brand-mark">UPWON</div>
        <p class="company-name">UPWON</p>
        <p class="company-sub">COMPANY</p>
      </section>
      <section class="title-block">
        <h1 class="doc-title">DELIVERY SHEET</h1>
        <p class="meta"><strong>DATE:</strong> ${escapeHtml(sheetDate)}</p>
        <p class="meta"><strong>CLIENT:</strong> THEKRA LINE</p>
      </section>
    </header>
    <table>
      <colgroup>${columnWidths.split(/(?<=%)/).map(width => `<col style="width:${width}" />`).join('')}</colgroup>
      <thead><tr>${PDF_COLUMN_DEFINITIONS.map(column => `<th>${column.label}</th>`).join('')}</tr></thead>
      <tbody>
        ${bodyRows}
        <tr class="total-row">
          <td colspan="3"></td>
          <td class="total-label">TOTAL</td>
          <td class="right">${totalQuantity}</td>
          <td colspan="3"></td>
          <td class="right">${totalAmount.toFixed(2)}</td>
          <td></td>
        </tr>
      </tbody>
    </table>
  </main>
</body>
</html>`;
  };

  const generatePdf = async () => {
    if (generatingPdf || loading) return;
    if (exportRows.length === 0) {
      setError('No delivered items to export for the selected filter.');
      return;
    }

    setGeneratingPdf(true);
    setError('');
    setMessage('');

    try {
      const html = buildPdfHtml();
      const fileName = `Delivery_Sheet_${sheetDate}.pdf`;

      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          throw new Error('Popup blocked. Allow popups for this site, then click Download PDF again.');
        }

        let printStarted = false;
        const openPrintDialog = () => {
          if (printStarted || printWindow.closed) return;
          printStarted = true;
          printWindow.focus();
          printWindow.print();
        };

        printWindow.addEventListener('load', openPrintDialog, { once: true });
        printWindow.document.open();
        printWindow.document.write(html.replace('</head>', `<style>@page { size: A4 landscape; }</style></head>`));
        printWindow.document.close();
        printWindow.document.title = fileName.replace(/\.pdf$/i, '');

        window.setTimeout(openPrintDialog, 900);
        setMessage('Print dialog will open. In Destination, select “Save as PDF”, then click Save.');
      } else {
        const { uri } = await Print.printToFileAsync({ html, width: 842, height: 595 });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Save ${fileName}`,
            UTI: 'com.adobe.pdf',
          });
        } else {
          await Print.printAsync({ uri });
        }
        setMessage('PDF generated successfully.');
      }
    } catch (err: any) {
      console.error('PDF generation error:', err);
      setError(err?.message ? `PDF failed: ${err.message}` : 'Failed to generate PDF.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const cellStyle = (flexValue: number, align: 'center' | 'left' | 'right' = 'center') => ({
    flex: flexValue,
    minWidth: 0,
    minHeight: 55,
    paddingVertical: 8,
    paddingHorizontal: 6,
    justifyContent: 'center' as const,
    alignItems: align === 'left' ? 'flex-start' as const : align === 'right' ? 'flex-end' as const : 'center' as const,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BLACK,
  });

  const headerCellStyle = (flexValue: number) => ({
    flex: flexValue,
    minWidth: 0,
    minHeight: 38,
    paddingVertical: 8,
    paddingHorizontal: 4,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: GREEN,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BLACK,
  });

  let runningIndex = 0;

  return (
    <View style={{ flex: 1, minHeight: '100vh' as any, padding: 24, backgroundColor: '#F3F4F6' }}>
      <View style={{ width: '100%', maxWidth: 1100, alignSelf: 'center' }}>
        <View style={{ marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111' }}>Delivery Report</Text>
            <Text style={{ fontSize: 12, color: '#6B7280' }}>Edit data and download PDF.</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              onPress={generatePdf}
              disabled={loading || generatingPdf}
              style={{ backgroundColor: generatingPdf ? '#94A3B8' : GREEN, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              {generatingPdf && <ActivityIndicator size="small" color="#FFF" />}
              <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>
                {generatingPdf ? 'Generating…' : 'Download PDF'}
              </Text>
            </Pressable>
            <Pressable onPress={fetchReports} disabled={loading} style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 4 }}>
              <Text style={{ color: '#111', fontSize: 13, fontWeight: '600' }}>↻ Refresh</Text>
            </Pressable>
          </View>
        </View>

        {/* Filter Bar */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16, backgroundColor: WHITE, padding: 12, borderRadius: 4, borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center' }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151' }}>Filter:</Text>
          {(['all', 'weekly', 'monthly', 'exact'] as FilterType[]).map(type => (
            <Pressable
              key={type}
              onPress={() => setFilterType(type)}
              style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4, backgroundColor: filterType === type ? GREEN : '#F3F4F6', borderWidth: 1, borderColor: filterType === type ? GREEN : '#D1D5DB' }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: filterType === type ? WHITE : '#374151', textTransform: 'capitalize' }}>{type}</Text>
            </Pressable>
          ))}
          {filterType === 'exact' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 }}>
              {React.createElement('input', {
                type: 'date',
                value: exactDate,
                onChange: (e: any) => setExactDate(e.target.value),
                style: { padding: '6px 10px', borderRadius: 4, border: '1px solid #D1D5DB', fontSize: 12, outline: 'none' },
              })}
              {exactDate ? (
                <Pressable onPress={() => setExactDate('')} style={{ padding: 4 }}>
                  <Text style={{ fontSize: 12, color: '#DC2626', fontWeight: '600' }}>✕</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </View>

        {!!error && <View style={{ backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', padding: 10, borderRadius: 4, marginBottom: 12 }}><Text style={{ color: '#B91C1C', fontSize: 12 }}>{error}</Text></View>}
        {!!message && <View style={{ backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', padding: 10, borderRadius: 4, marginBottom: 12 }}><Text style={{ color: '#15803D', fontSize: 12 }}>{message}</Text></View>}

        <View style={{ backgroundColor: WHITE, padding: 32, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } as any}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 2, borderColor: GREEN, paddingBottom: 16, marginBottom: 16 }}>
            <View>
              <View style={{ backgroundColor: BLACK, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 2, marginBottom: 7, alignSelf: 'flex-start' }}>
                <Text style={{ color: '#D4AF37', fontWeight: 'bold', fontSize: 12 }}>UPWON</Text>
              </View>
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#111', letterSpacing: 1 }}>UPWON</Text>
              <Text style={{ fontSize: 9, color: '#555' }}>COMPANY</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 27, fontWeight: 'bold', color: '#111' }}>DELIVERY SHEET</Text>
              <Text style={{ fontSize: 11, color: '#333', fontWeight: 'bold', marginTop: 4 }}>DATE: <Text style={{ fontWeight: 'normal' }}>{filteredItems.length ? sheetDate : '-'}</Text></Text>
              <Text style={{ fontSize: 11, color: '#333', fontWeight: 'bold' }}>CLIENT: <Text style={{ fontWeight: 'normal' }}>THEKRA LINE</Text></Text>
            </View>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}><ActivityIndicator size="large" color={GREEN} /></View>
          ) : filteredItems.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}><Text style={{ fontSize: 14, fontWeight: '600', color: '#111' }}>No Delivered Items Found for the selected filter.</Text></View>
          ) : (
            <View style={{ borderWidth: 1, borderColor: BLACK }}>
              {/* Compact UI Table Header */}
              <View style={{ flexDirection: 'row' }}>
                {UI_COLUMNS.map((column, index) => (
                  <View key={column.key} style={[headerCellStyle(column.flex), index === UI_COLUMNS.length - 1 ? { borderRightWidth: 0 } : null]}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: WHITE }}>{column.label}</Text>
                  </View>
                ))}
              </View>

              <ScrollView style={{ maxHeight: '60vh' as any }}>
                {sortedGroupKeys.map((dateKey, groupIndex) => (
                  <React.Fragment key={dateKey}>
                    {sortedGroupKeys.length > 1 && (
                      <View style={{ backgroundColor: '#F9FAFB', paddingVertical: 4, paddingHorizontal: 8, borderBottomWidth: 1, borderColor: BLACK }}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#374151' }}>{getDisplayLabel(dateKey)}</Text>
                      </View>
                    )}
                    {groupedItems[dateKey].map(item => {
                      runningIndex += 1;
                      const currentValues = editValues[item.id] || {};
                      const calculatedAmount = currentValues.amount !== undefined ? currentValues.amount : item.amount;

                      return (
                        <View key={item.id} style={{ flexDirection: 'row', backgroundColor: WHITE }}>
                          <View style={cellStyle(0.5)}><Text style={{ fontSize: 11, textAlign: 'center' }}>{runningIndex}</Text></View>
                          <View style={cellStyle(1.5)}><Text style={{ fontSize: 11, textAlign: 'center' }}>{item.deliveredAt || '-'}</Text></View>
                          <View style={cellStyle(1.5)}><Text style={{ fontSize: 11, textAlign: 'center' }}>{item.invoice || '-'}</Text></View>
                          <View style={cellStyle(0.8, 'right')}><Text style={{ fontSize: 11, paddingRight: 4 }}>1</Text></View>
                          <View style={cellStyle(1.5, 'right')}><Text style={{ fontSize: 11, paddingRight: 4 }}>{calculatedAmount}</Text></View>
                          <View style={[cellStyle(1), { borderRightWidth: 0, alignItems: 'center' }]}>
                            <Pressable onPress={() => setSelectedItem(item)} style={{ backgroundColor: GREEN, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 2, alignItems: 'center' }}>
                              <Text style={{ color: WHITE, fontSize: 10, fontWeight: '600' }}>VIEW</Text>
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                  </React.Fragment>
                ))}
              </ScrollView>

              {/* Total Row */}
              <View style={{ flexDirection: 'row', backgroundColor: WHITE }}>
                <View style={cellStyle(0.5)} />
                <View style={cellStyle(1.5)} />
                <View style={cellStyle(1.5)} />
                <View style={cellStyle(0.8, 'right')}><Text style={{ fontSize: 11, fontWeight: 'bold', paddingRight: 4 }}>{totalQuantity}</Text></View>
                <View style={cellStyle(1.5, 'right')}><Text style={{ fontSize: 11, fontWeight: 'bold', paddingRight: 4 }}>{totalAmount.toFixed(2)}</Text></View>
                <View style={[cellStyle(1), { borderRightWidth: 0 }]} />
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Detail Modal */}
      <Modal visible={selectedItem !== null} transparent animationType="fade" onRequestClose={() => setSelectedItem(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <View style={{ backgroundColor: WHITE, borderRadius: 4, width: '100%', maxWidth: 600, padding: 24, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' } as any}>
            {selectedItem && (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#111' }}>Invoice Details</Text>
                  <Pressable onPress={() => setSelectedItem(null)} style={{ padding: 8, backgroundColor: '#F3F4F6', borderRadius: 4 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151' }}>✕</Text>
                  </Pressable>
                </View>

                <View style={{ gap: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>Invoice No.</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#111' }}>#{selectedItem.invoice}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>Date</Text>
                    <Text style={{ fontSize: 13, color: '#111' }}>{selectedItem.deliveredAt}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>Model</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#111' }}>{selectedItem.model}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>Size</Text>
                    <Text style={{ fontSize: 13, color: '#111' }}>{selectedItem.size}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>Barcode</Text>
                    <Text style={{ fontSize: 13, color: '#111', fontFamily: 'monospace' }}>{selectedItem.barcode}</Text>
                  </View>

                  <View style={{ height: 1, backgroundColor: '#E5E7EB', marginVertical: 8 }} />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>Normal Rate</Text>
                    {React.createElement('input', {
                      value: editValues[selectedItem.id]?.normal_rate !== undefined ? editValues[selectedItem.id].normal_rate : selectedItem.normal_rate,
                      onChange: (e: any) => handleInputChange(selectedItem.id, 'normal_rate', e.target.value),
                      style: { width: 120, padding: '6px', border: '1px solid #D1D5DB', borderRadius: 4, fontSize: 12, textAlign: 'right' },
                    })}
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>Shak</Text>
                    {React.createElement('input', {
                      value: editValues[selectedItem.id]?.shak !== undefined ? editValues[selectedItem.id].shak : selectedItem.shak,
                      onChange: (e: any) => handleInputChange(selectedItem.id, 'shak', e.target.value),
                      style: { width: 120, padding: '6px', border: '1px solid #D1D5DB', borderRadius: 4, fontSize: 12, textAlign: 'right' },
                    })}
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>Tatriz</Text>
                    {React.createElement('input', {
                      value: editValues[selectedItem.id]?.tatriz !== undefined ? editValues[selectedItem.id].tatriz : selectedItem.tatriz,
                      onChange: (e: any) => handleInputChange(selectedItem.id, 'tatriz', e.target.value),
                      style: { width: 120, padding: '6px', border: '1px solid #D1D5DB', borderRadius: 4, fontSize: 12, textAlign: 'right' },
                    })}
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>Amount</Text>
                    {React.createElement('input', {
                      value: editValues[selectedItem.id]?.amount !== undefined ? editValues[selectedItem.id].amount : selectedItem.amount,
                      onChange: (e: any) => handleInputChange(selectedItem.id, 'amount', e.target.value),
                      style: { width: 120, padding: '6px', border: '1px solid #D1D5DB', borderRadius: 4, fontSize: 12, textAlign: 'right', fontWeight: '600' },
                    })}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                  <Pressable onPress={() => setSelectedItem(null)} style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 4, borderWidth: 1, borderColor: '#D1D5DB' }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => saveReport(selectedItem)}
                    disabled={savingId === selectedItem.id}
                    style={{ backgroundColor: savingId === selectedItem.id ? '#94A3B8' : GREEN, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  >
                    {savingId === selectedItem.id && <ActivityIndicator size="small" color="#FFF" />}
                    <Text style={{ color: WHITE, fontSize: 13, fontWeight: '600' }}>Save Changes</Text>
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