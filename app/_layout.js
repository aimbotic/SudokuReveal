import { Stack, router } from 'expo-router';
import { Text, TouchableOpacity } from 'react-native';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackVisible: false,
        headerStyle: {
          backgroundColor: '#ffffff',
        },
        headerTintColor: '#1a1a2e',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerLeft: ({ canGoBack }) => (
          canGoBack ? (
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={{
                minWidth: 40,
                height: 36,
                alignItems: 'flex-start',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 28, lineHeight: 30, color: '#4361ee' }}>{'<'}</Text>
            </TouchableOpacity>
          ) : null
        ),
        headerRight: () => (
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            style={{
              minWidth: 72,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#4361ee' }}>Settings</Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Sudoku Infinite' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="select" options={{ title: 'Puzzles' }} />
      <Stack.Screen name="bot" options={{ title: 'Bot Battle' }} />
      <Stack.Screen name="online" options={{ title: 'Online Play' }} />
      <Stack.Screen name="gallery" options={{ title: 'Gallery' }} />
      <Stack.Screen name="puzzle" options={{ title: 'Puzzle' }} />
      <Stack.Screen name="completion" options={{ title: 'Complete' }} />
    </Stack>
  );
}
