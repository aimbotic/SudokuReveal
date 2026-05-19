import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  ScrollView,
  useWindowDimensions,
  SafeAreaView,
} from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';

import puzzlesData from '../assets/puzzles.json';
import { getRewardImageSource } from '../utils/rewards';
import { getLevelNumber, getNextPuzzleAfter } from '../utils/progression';

export default function CompletionScreen() {
  const { id } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const puzzle = puzzlesData.find((p) => p.id === id);
  const nextPuzzle = typeof id === 'string' ? getNextPuzzleAfter(id) : null;

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

  const displayImageSize = Math.min(width - 32, 420);
  const tileSize = displayImageSize / 3;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Puzzle Complete!</Text>
        <Text style={styles.subtitle}>Your hidden image is revealed</Text>

        <View style={[styles.imageGrid, { width: displayImageSize, height: displayImageSize }]}>
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
                      width: displayImageSize,
                      height: displayImageSize,
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
        <Text style={styles.nextLevelText}>
          {nextPuzzle
            ? `Level ${getLevelNumber(nextPuzzle.id)} unlocked`
            : 'You cleared the final level'}
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            if (nextPuzzle) {
              router.replace(`/puzzle?id=${nextPuzzle.id}`);
              return;
            }
            router.replace('/select');
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {nextPuzzle ? 'Play Next Level' : 'Back to Level Path'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
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
  nextLevelText: {
    marginTop: 10,
    fontSize: 14,
    color: '#4361ee',
    fontWeight: '700',
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
