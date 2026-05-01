import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#ffffff',
        },
        headerTintColor: '#1a1a2e',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    />
  );
}