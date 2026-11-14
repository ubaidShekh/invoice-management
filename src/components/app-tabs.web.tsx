import DeliveryDataPage from '@/pages/DeliveryDataPage';
import InvoiceDetailsPage from '@/pages/InvoiceDetailsPage';
import PdfViewerPage from '@/pages/PdfViewerPage';
import ReportsPage from '@/pages/reports';
import UploadInvoicePage from '@/pages/UploadInvoicePage';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

const tabs = [
  { id: 0, label: 'Upload Invoice', icon: '📤' },
  { id: 1, label: 'Invoice Details', icon: '📄' },
  { id: 2, label: 'Delivery Data', icon: '📦' },
  { id: 3, label: 'Reports', icon: '📊' },
  { id: 4, label: 'PDF Viewer', icon: '📋' }
];

export default function AppTabs() {
  const [activeTab, setActiveTab] = React.useState(0);

  return (
    <View style={{ flex: 1, background: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)' } as any}>
      {/* Sticky Header */}
      <View style={{ backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingHorizontal: 24, paddingTop: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' } as any}>
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F172A', letterSpacing: -0.3 }}>
            Invoice Management
          </Text>
          <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
            Manage invoices, delivery records and reports.
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderBottomWidth: 2,
                    borderBottomColor: isActive ? '#2563EB' : 'transparent',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s ease',
                  } as any}
                >
                  <Text style={{ fontSize: 13 }}>{tab.icon}</Text>
                  <Text style={{ fontSize: 12, fontWeight: isActive ? '600' : '500', color: isActive ? '#2563EB' : '#64748B' }}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Content Area */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {activeTab === 0 && <UploadInvoicePage />}
        {activeTab === 1 && <InvoiceDetailsPage />}
        {activeTab === 2 && <DeliveryDataPage />}
        {activeTab === 3 && <ReportsPage />}
        {activeTab === 4 && <PdfViewerPage />}
      </ScrollView>
    </View>
  );
}