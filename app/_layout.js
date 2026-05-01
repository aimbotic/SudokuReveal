import { Stack, router } from 'expo-router';
import { Text, TouchableOpacity } from 'react-native';

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
        headerRight: () => (
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            style={{
              minWidth: 40,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 22, color: '#4361ee' }}>⚙</Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen name="index" options={{ title: 'SudokuReveal' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="select" options={{ title: 'Puzzles' }} />
      <Stack.Screen name="gallery" options={{ title: 'Gallery' }} />
      <Stack.Screen name="puzzle" options={{ title: 'Puzzle' }} />
      <Stack.Screen name="completion" options={{ title: 'Complete' }} />
    </Stack>
  );
}
