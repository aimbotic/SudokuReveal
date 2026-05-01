import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  useWindowDimensions,
  SafeAreaView,
} from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';

import puzzlesData from '../assets/puzzles.json';
import { getRewardImageSource } from '../utils/rewards';

export default function CompletionScreen() {
  const { id } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const puzzle = puzzlesData.find((p) => p.id === id);

  const tileAnims = useRef(
    Array.from({ length: 9 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    Animated.stagger(
      150,
      tileAnims.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        })
      )
    ).start();
  }, [tileAnims]);

  const imageSource = puzzle ? getRewardImageSource(puzzle.reward) : null;

  if (!puzzle || !imageSource) {
    return <Redirect href="/select" />;
  }

  const imageSize = width - 64;
  const tileSize = imageSize / 3;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Puzzle Complete!</Text>
        <Text style={styles.subtitle}>Your hidden image is revealed</Text>

        <View style={[styles.imageGrid, { width: imageSize, height: imageSize }]}>
          {tileAnims.map((anim, index) => {
            const row = Math.floor(index / 3);
            const col = index % 3;
            const scale = anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.85, 1],
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.tile,
                  {
                    width: tileSize,
                    height: tileSize,
                    opacity: anim,
                    transform: [{ scale }],
                  },
                ]}
              >
                <View
                  style={{
                    width: tileSize,
                    height: tileSize,
                    overflow: 'hidden',
                  }}
                >
                  <Image
                    source={imageSource}
                    style={{
                      width: imageSize,
                      height: imageSize,
                      position: 'absolute',
                      top: -(row * tileSize),
                      left: -(col * tileSize),
                    }}
                    resizeMode="cover"
                  />
                </View>
              </Animated.View>
            );
          })}
        </View>

        <Text style={styles.caption}>{puzzle.title}</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Play Next Puzzle</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6c757d',
    marginBottom: 32,
    textAlign: 'center',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  tile: {},
  caption: {
    marginTop: 20,
    fontSize: 13,
    color: '#adb5bd',
    letterSpacing: 0.5,
  },
  button: {
    marginTop: 32,
    backgroundColor: '#4361ee',
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#4361ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 'bold',
  },
});
