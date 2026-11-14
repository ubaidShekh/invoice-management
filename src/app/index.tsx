import React from 'react';
import { Pressable, Text, View } from 'react-native';

const tabs = [
  '1. Upload Invoice PDF',
  '2. Invoice Details',
  '3. Delivery Data',
  '4. Reports',
];

export default function Header() {
  const [activeTab, setActiveTab] = React.useState(0);

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: '#1c7d36',
        padding: 12,
        gap: 10,
      }}
    >
      {tabs.map((tab, index) => (
        <Pressable
          key={tab}
          onPress={() => setActiveTab(index)}
          style={{
            backgroundColor:
              activeTab === index ? '#145c28' : 'transparent',
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 4,
          }}
        >
          <Text
            style={{
              color: 'white',
              fontWeight: 'bold',
              fontSize: 14,
            }}
          >
            {tab}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}