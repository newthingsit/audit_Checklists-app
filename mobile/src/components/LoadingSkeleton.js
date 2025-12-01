import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { themeConfig } from '../config/theme';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

// Animated Skeleton Shimmer Effect
const SkeletonBox = ({ style }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeletonBase,
        style,
        { opacity },
      ]}
    />
  );
};

// Dashboard Loading Skeleton
export const DashboardSkeleton = () => {
  return (
    <View style={styles.container}>
      {/* Header Skeleton */}
      <View style={styles.headerSkeleton}>
        <View>
          <SkeletonBox style={styles.greetingSkeleton} />
          <SkeletonBox style={styles.nameSkeleton} />
        </View>
        <SkeletonBox style={styles.avatarSkeleton} />
      </View>

      {/* Stats Cards Skeleton */}
      <View style={styles.statsContainer}>
        {[1, 2, 3, 4].map((item) => (
          <View key={item} style={styles.statCardWrapper}>
            <SkeletonBox style={styles.statCardSkeleton} />
          </View>
        ))}
      </View>

      {/* Section Header Skeleton */}
      <View style={styles.sectionHeaderSkeleton}>
        <View>
          <SkeletonBox style={styles.sectionTitleSkeleton} />
          <SkeletonBox style={styles.sectionSubtitleSkeleton} />
        </View>
        <SkeletonBox style={styles.buttonSkeleton} />
      </View>

      {/* Audit Cards Skeleton */}
      {[1, 2, 3].map((item) => (
        <View key={item} style={styles.cardSkeleton}>
          <View style={styles.cardLeft}>
            <SkeletonBox style={styles.dotSkeleton} />
            <View style={styles.cardInfo}>
              <SkeletonBox style={styles.cardTitleSkeleton} />
              <SkeletonBox style={styles.cardSubtitleSkeleton} />
            </View>
          </View>
          <SkeletonBox style={styles.badgeSkeleton} />
        </View>
      ))}
    </View>
  );
};

// List Loading Skeleton
export const ListSkeleton = ({ count = 5 }) => {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.listItemSkeleton}>
          <SkeletonBox style={styles.listIconSkeleton} />
          <View style={styles.listContentSkeleton}>
            <SkeletonBox style={styles.listTitleSkeleton} />
            <SkeletonBox style={styles.listDescSkeleton} />
          </View>
        </View>
      ))}
    </View>
  );
};

// Card Grid Skeleton
export const CardGridSkeleton = ({ count = 4 }) => {
  return (
    <View style={styles.gridContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.gridItemWrapper}>
          <SkeletonBox style={styles.gridItemSkeleton} />
        </View>
      ))}
    </View>
  );
};

// Single Card Skeleton
export const CardSkeleton = () => {
  return (
    <View style={styles.singleCardSkeleton}>
      <SkeletonBox style={styles.cardHeaderSkeleton} />
      <SkeletonBox style={styles.cardBodySkeleton} />
      <SkeletonBox style={styles.cardFooterSkeleton} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeConfig.background.default,
  },
  skeletonBase: {
    backgroundColor: themeConfig.border.default,
    borderRadius: themeConfig.borderRadius.small,
  },
  
  // Header
  headerSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: themeConfig.background.paper,
    borderBottomLeftRadius: themeConfig.borderRadius.xl,
    borderBottomRightRadius: themeConfig.borderRadius.xl,
  },
  greetingSkeleton: {
    width: 100,
    height: 14,
    marginBottom: 8,
  },
  nameSkeleton: {
    width: 150,
    height: 24,
  },
  avatarSkeleton: {
    width: 48,
    height: 48,
    borderRadius: themeConfig.borderRadius.medium,
  },
  
  // Stats
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 20,
    justifyContent: 'space-between',
  },
  statCardWrapper: {
    width: cardWidth,
    marginBottom: 16,
  },
  statCardSkeleton: {
    height: 110,
    borderRadius: themeConfig.borderRadius.large,
  },
  
  // Section Header
  sectionHeaderSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitleSkeleton: {
    width: 120,
    height: 18,
    marginBottom: 6,
  },
  sectionSubtitleSkeleton: {
    width: 80,
    height: 13,
  },
  buttonSkeleton: {
    width: 70,
    height: 36,
    borderRadius: themeConfig.borderRadius.medium,
  },
  
  // Cards
  cardSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: themeConfig.background.paper,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 16,
    borderRadius: themeConfig.borderRadius.medium,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dotSkeleton: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitleSkeleton: {
    width: '70%',
    height: 16,
    marginBottom: 6,
  },
  cardSubtitleSkeleton: {
    width: '50%',
    height: 13,
  },
  badgeSkeleton: {
    width: 60,
    height: 24,
    borderRadius: themeConfig.borderRadius.small,
    marginLeft: 12,
  },
  
  // List
  listContainer: {
    padding: 16,
  },
  listItemSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeConfig.background.paper,
    padding: 16,
    borderRadius: themeConfig.borderRadius.medium,
    marginBottom: 10,
  },
  listIconSkeleton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  listContentSkeleton: {
    flex: 1,
  },
  listTitleSkeleton: {
    width: '60%',
    height: 16,
    marginBottom: 6,
  },
  listDescSkeleton: {
    width: '40%',
    height: 13,
  },
  
  // Grid
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'space-between',
  },
  gridItemWrapper: {
    width: cardWidth,
    marginBottom: 16,
  },
  gridItemSkeleton: {
    height: 100,
    borderRadius: themeConfig.borderRadius.medium,
  },
  
  // Single Card
  singleCardSkeleton: {
    backgroundColor: themeConfig.background.paper,
    margin: 16,
    padding: 16,
    borderRadius: themeConfig.borderRadius.large,
  },
  cardHeaderSkeleton: {
    width: '50%',
    height: 20,
    marginBottom: 16,
  },
  cardBodySkeleton: {
    width: '100%',
    height: 80,
    marginBottom: 16,
  },
  cardFooterSkeleton: {
    width: '30%',
    height: 14,
  },
});

export default {
  DashboardSkeleton,
  ListSkeleton,
  CardGridSkeleton,
  CardSkeleton,
};

