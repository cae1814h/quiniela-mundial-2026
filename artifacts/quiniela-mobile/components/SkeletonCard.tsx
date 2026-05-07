import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";

function Skeleton({ width, height, style }: { width?: number | string; height: number; style?: object }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View style={[{ width: width ?? "100%", height, borderRadius: 6, opacity }, style]} />
  );
}

export function SkeletonMatchCard() {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.topRow}>
        <Skeleton width={80} height={10} style={{ backgroundColor: colors.muted }} />
        <Skeleton width={60} height={20} style={{ backgroundColor: colors.muted, borderRadius: 6 }} />
      </View>
      <View style={styles.teamsRow}>
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width={42} height={28} style={{ backgroundColor: colors.muted, borderRadius: 4 }} />
          <Skeleton width={70} height={10} style={{ backgroundColor: colors.muted }} />
        </View>
        <Skeleton width={40} height={24} style={{ backgroundColor: colors.muted }} />
        <View style={{ flex: 1, gap: 6, alignItems: "flex-end" }}>
          <Skeleton width={42} height={28} style={{ backgroundColor: colors.muted, borderRadius: 4 }} />
          <Skeleton width={70} height={10} style={{ backgroundColor: colors.muted }} />
        </View>
      </View>
      <View style={styles.bottomRow}>
        <Skeleton width={100} height={10} style={{ backgroundColor: colors.muted }} />
        <Skeleton width={70} height={20} style={{ backgroundColor: colors.muted, borderRadius: 6 }} />
      </View>
    </View>
  );
}

export function SkeletonResultCard() {
  const colors = useColors();
  return (
    <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Skeleton width={60} height={9} style={{ backgroundColor: colors.muted }} />
      <View style={{ gap: 8, marginTop: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Skeleton width={22} height={16} style={{ backgroundColor: colors.muted, borderRadius: 2 }} />
          <Skeleton width={50} height={10} style={{ backgroundColor: colors.muted, flex: 1 }} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Skeleton width={22} height={16} style={{ backgroundColor: colors.muted, borderRadius: 2 }} />
          <Skeleton width={50} height={10} style={{ backgroundColor: colors.muted, flex: 1 }} />
        </View>
      </View>
      <Skeleton width={80} height={9} style={{ backgroundColor: colors.muted, marginTop: 4 }} />
    </View>
  );
}

export function SkeletonLeaderboardRow() {
  const colors = useColors();
  return (
    <View style={[styles.leaderRow, { borderBottomColor: colors.border }]}>
      <Skeleton width={36} height={36} style={{ backgroundColor: colors.muted, borderRadius: 18 }} />
      <View style={{ flex: 1, gap: 4 }}>
        <Skeleton width={120} height={12} style={{ backgroundColor: colors.muted }} />
        <Skeleton width={80} height={9} style={{ backgroundColor: colors.muted }} />
      </View>
      <Skeleton width={48} height={36} style={{ backgroundColor: colors.muted, borderRadius: 8 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10, gap: 14,
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  teamsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resultCard: {
    borderRadius: 12, borderWidth: 1, padding: 12, gap: 8,
  },
  leaderRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14, borderBottomWidth: 1,
  },
});
