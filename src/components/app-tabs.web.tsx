import DeliveryDataPage from '@/pages/DeliveryDataPage';
import PdfViewerPage from '@/pages/PdfViewerPage';
import ReportsPage from '@/pages/reports';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

const tabs = [
  { id: 0, label: 'Upload Invoice Print', icon: '📋' },

  { id: 1, label: 'Delivery Data', icon: '📦' },
  { id: 2, label: 'Reports', icon: '📊' },
];

export default function AppTabs() {
  const [activeTab, setActiveTab] = React.useState(0);

  return (
    <View style={{ flex: 1, background: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)' } as any}>
      {/* Compact Sticky Header */}
      <View style={{
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        paddingHorizontal: 16,
        paddingTop: 10,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      } as any}>

        {/* Compact Title Row */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', letterSpacing: -0.3 }}>
            Invoice Management
          </Text>
          <Text style={{ fontSize: 10, color: '#94A3B8' }}>
            Manage invoices, delivery & reports
          </Text>
        </View>

        {/* Compact Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderBottomWidth: 2,
                    borderBottomColor: isActive ? '#2563EB' : 'transparent',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    transition: 'all 0.2s ease',
                  } as any}
                >

                  <Text style={{
                    fontSize: 11,
                    fontWeight: isActive ? '600' : '500',
                    color: isActive ? '#2563EB' : '#64748B',
                  }}>
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
        {activeTab === 0 && <PdfViewerPage />}

        {activeTab === 1 && <DeliveryDataPage />}
        {activeTab === 2 && <ReportsPage />}
      </ScrollView>
    </View>
  );
}