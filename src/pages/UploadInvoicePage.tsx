import axios from 'axios';
import React, { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function UploadInvoicePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const saveInvoice = async () => {
    if (files.length === 0) {
      setMessage('Please select at least one PDF file.');
      return;
    }

    try {
      setSaving(true);
      setMessage('');
      setUploadProgress(0);

      const formData = new FormData();
      files.forEach((file) => formData.append('invoices', file, file.name));

      const response = await axios.post(
        'http://localhost:3000/upload_pdf',
        formData,
        {
          timeout: 300000,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
            }
          },
        }
      );

      setMessage(
        `Successfully processed ${response.data.total_files_processed} file(s) and created ${response.data.total_delivery_items_created} items.`
      );
      setFiles([]);
      setUploadProgress(0);
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        setMessage('Upload timed out.');
      } else if (error.response?.data?.detail) {
        setMessage(error.response.data.detail);
      } else {
        setMessage('Network error. Backend unreachable.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    // Natural Gradient Background (F8FAFC to E2E8F0)
    <View style={{ flex: 1, minHeight: '100vh' as any, padding: 24, background: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)' } as any}>
      <View style={{ width: '100%', maxWidth: 900, alignSelf: 'center' }}>

        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Invoice Management / Upload
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#0F172A', marginBottom: 6 }}>Upload Invoices</Text>
          <Text style={{ fontSize: 13, color: '#475569' }}>Upload multiple PDF documents to extract data automatically.</Text>
        </View>

        {/* Main Card */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 4, padding: 24, borderWidth: 1, borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } as any}>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <View style={{ width: 32, height: 32, borderRadius: 4, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>01</Text>
            </View>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#0F172A' }}>Documents</Text>
              <Text style={{ fontSize: 12, color: '#64748B' }}>Select one or more PDF files</Text>
            </View>
          </View>

          {/* Upload Area */}
          <View style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderStyle: 'dashed', borderColor: files.length > 0 ? '#3B82F6' : '#CBD5E1', borderRadius: 4, padding: 32, alignItems: 'center', marginBottom: 20 } as any}>
            <Text style={{ fontSize: 24, marginBottom: 12 }}>📄</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 6 }}>
              {files.length > 0 ? `${files.length} file(s) selected` : 'Choose PDF files'}
            </Text>
            <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>You can select multiple files at once.</Text>

            {React.createElement('input', {
              type: 'file',
              accept: 'application/pdf',
              multiple: true,
              onChange: (e: any) => {
                const selected = Array.from(e.target.files) as File[];
                const valid = selected.filter((f) => f.type === 'application/pdf');
                if (valid.length !== selected.length) setMessage('Some files skipped. Only PDFs allowed.');
                setFiles(valid);
                setMessage('');
              },
              style: { fontSize: 12, color: '#475569', cursor: 'pointer' },
            })}

            {files.length > 0 && (
              <View style={{ marginTop: 20, width: '100%', maxWidth: 450 }}>
                {files.map((f, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4, padding: 10, marginBottom: 6 }}>
                    <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 2, marginRight: 10 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#DC2626' }}>PDF</Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 12, fontWeight: '500', color: '#0F172A' }} numberOfLines={1}>{f.name}</Text>
                    <Text style={{ fontSize: 11, color: '#64748B' }}>{(f.size / 1024 / 1024).toFixed(2)} MB</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 12, color: '#64748B' }}>Step 1 of 3</Text>
            {React.createElement('button', {
              onClick: saveInvoice,
              disabled: saving || files.length === 0,
              style: {
                backgroundColor: saving || files.length === 0 ? '#94A3B8' : '#2563EB',
                color: '#FFFFFF', border: 'none', padding: '10px 20px', borderRadius: 4,
                cursor: saving || files.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: '600', transition: 'all 0.2s',
              },
            }, saving ? 'Uploading...' : 'Upload Files')}
          </View>

          {/* Progress */}
          {saving && (
            <View style={{ marginTop: 16, padding: 12, backgroundColor: '#F8FAFC', borderRadius: 4, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={{ marginTop: 8, fontSize: 12, color: '#475569' }}>Extracting data... {uploadProgress}%</Text>
            </View>
          )}

          {/* Message */}
          {message !== '' && (
            <View style={{ marginTop: 16, padding: 12, borderRadius: 4, backgroundColor: message.includes('Successfully') ? '#F0FDF4' : '#FEF2F2', borderWidth: 1, borderColor: message.includes('Successfully') ? '#BBF7D0' : '#FECACA' }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: message.includes('Successfully') ? '#15803D' : '#DC2626' }}>{message}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}