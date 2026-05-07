import { Feather } from "@expo/vector-icons";
import {
  useGetLeaderboard,
  useGetPrizePool,
  useListMatches,
  useListMyPredictions,
  getListMyPredictionsQueryKey,
  getGetLeaderboardQueryKey,
  getGetPrizePoolQueryKey,
} from "@workspace/api-client-react";
import type { PredictionWithMatch } from "@workspace/api-client-react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MatchCard } from "@/components/MatchCard";
import { SkeletonMatchCard } from "@/components/SkeletonCard";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getTodayHN, matchDayStr } from "@/utils/dateHN";

// Format number as Lempiras
function formatLps(amount: number) {
  return `L. ${amount.toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token } = useAuth();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: matches, isLoading: loadingMatches, refetch: refetchMatches } = useListMatches();
  const { data: predictions, refetch: refetchPreds } = useListMyPredictions({
    query: { enabled: !!token, queryKey: getListMyPredictionsQueryKey() },
  });
  const { data: leaderboard } = useGetLeaderboard({ limit: 100 }, {
    query: { enabled: !!token, queryKey: getGetLeaderboardQueryKey({ limit: 100 }) },
  });
  const { data: prize } = useGetPrizePool({
    query: { queryKey: getGetPrizePoolQueryKey() },
  });

  const predsByMatchId = useMemo(() => {
    const map = new Map<number, PredictionWithMatch>();
    (predictions ?? []).forEach((p) => map.set(p.matchId, p));
    return map;
  }, [predictions]);

  const todayHN = getTodayHN();

  const todayMatches = useMemo(
    () => (matches ?? []).filter((m) => matchDayStr(m.matchDate) === todayHN),
    [matches, todayHN]
  );

  const myRank = useMemo(() => {
    if (!user || !leaderboard) return null;
    return leaderboard.find((e) => e.userId === user.id) ?? null;
  }, [leaderboard, user]);

  const handleRefresh = async () => {
    await Promise.all([refetchMatches(), refetchPreds()]);
  };

  const initials = user
    ? (user.name.charAt(0) + (user.name.split(" ")[1]?.charAt(0) ?? "")).toUpperCase()
    : "";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad, paddingBottom: Platform.OS === "web" ? 120 : 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {/* Header gradient */}
        <LinearGradient colors={["#0d1c30", colors.background]} style={styles.headerGrad}>
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
                {user ? `Hola, ${user.name.split(" ")[0]}` : "Quiniela Mundial"}
              </Text>
              <Text style={[styles.appTitle, { color: colors.primary }]}>FIFA World Cup 2026</Text>
            </View>
            {user && (
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/system")}
                style={[styles.avatarBtn, { borderColor: `${colors.primary}60` }]}
                activeOpacity={0.8}
              >
                {user.photoUrl ? (
                  <Image
                    source={{ uri: user.photoUrl }}
                    style={{ width: 50, height: 50, borderRadius: 25 }}
                    contentFit="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={[`${colors.primary}55`, `${colors.primary}22`]}
                    style={styles.avatarGrad}
                  >
                    <Text style={[styles.avatarTxt, { color: colors.primary }]}>{initials}</Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>
            )}
          </View>

          {user && (
            <View style={styles.statsRow}>
              <StatCard icon="award" value={String(user.totalPoints)} label="Puntos" color={colors.primary} colors={colors} />
              {myRank && (
                <StatCard icon="bar-chart-2" value={`#${myRank.rank}`} label="Posición" color={colors.gold} colors={colors} />
              )}
              {predictions && (
                <StatCard icon="crosshair" value={String(predictions.length)} label="Pronósticos" color="#60a5fa" colors={colors} />
              )}
            </View>
          )}
        </LinearGradient>

        {/* Prize pool card */}
        {prize && <PrizeCard prize={prize} colors={colors} />}

        {/* Today's matches */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="calendar" size={14} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Partidos de hoy</Text>
          </View>

          {loadingMatches ? (
            <>
              <SkeletonMatchCard />
              <SkeletonMatchCard />
            </>
          ) : todayMatches.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="sun" size={26} color={colors.mutedForeground} />
              <Text style={[styles.emptyTxt, { color: colors.mutedForeground }]}>No hay partidos hoy</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/results")}>
                <Text style={[styles.emptyLink, { color: colors.primary }]}>Ver todos los partidos →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            todayMatches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                prediction={predsByMatchId.get(m.id)}
                onPress={() => router.push(`/match/${m.id}`)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ── Prize pool card ────────────────────────────────────────────────────────
function PrizeCard({
  prize,
  colors,
}: {
  prize: { cuota: number; totalPlayers: number; prizePot: number; distribution: { place: number; pct: number; amount: number }[] };
  colors: ReturnType<typeof useColors>;
}) {
  const pot = prize.prizePot;

  const GOLD = "#fbbf24";
  const SILVER = "#94a3b8";
  const BRONZE = "#cd7c3e";
  const placeColors = [GOLD, SILVER, BRONZE];
  const placeLabels = ["1°", "2°", "3°"];

  return (
    <View style={styles.prizeWrapper}>
      <LinearGradient
        colors={["#1a1200", "#0d1c30"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.prizeCard, { borderColor: `${GOLD}40` }]}
      >
        {/* Top row */}
        <View style={styles.prizeTop}>
          <View style={styles.prizeTitleRow}>
            <Feather name="award" size={18} color={GOLD} />
            <Text style={styles.prizeTitle}>Premio Acumulado</Text>
          </View>
          <View style={styles.prizeAmountRow}>
            <Text style={styles.prizePot}>{formatLps(pot)}</Text>
          </View>
          <Text style={styles.prizeSubtitle}>
            {prize.totalPlayers} jugador{prize.totalPlayers !== 1 ? "es" : ""} × {formatLps(prize.cuota)} cuota
          </Text>
        </View>

        {/* Divider */}
        <View style={[styles.prizeDivider, { backgroundColor: `${GOLD}22` }]} />

        {/* Distribution */}
        <View style={styles.prizeDist}>
          <Text style={styles.prizeDistLabel}>Distribución de premios</Text>
          <View style={styles.prizeDistRow}>
            {prize.distribution.map((d, i) => (
              <View key={d.place} style={styles.prizeDistItem}>
                <Text style={[styles.prizeDistPlace, { color: placeColors[i] ?? GOLD }]}>
                  {placeLabels[i] ?? `${d.place}°`}
                </Text>
                <Text style={[styles.prizeDistAmount, { color: placeColors[i] ?? GOLD }]}>
                  {formatLps(d.amount)}
                </Text>
                <Text style={styles.prizeDistPct}>{d.pct}%</Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

function StatCard({ icon, value, label, color, colors }: {
  icon: string; value: string; label: string; color: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: `${color}33` }]}>
      <Feather name={icon as any} size={20} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const GOLD = "#fbbf24";

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { gap: 0 },
  headerGrad: { padding: 16, paddingBottom: 14, gap: 10 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  greeting: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 2 },
  appTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  avatarBtn: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, overflow: "hidden" },
  avatarGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  avatarTxt: { fontSize: 17, fontFamily: "Inter_700Bold" },
  statsRow: { flexDirection: "row", gap: 8 },
  statCard: { flex: 1, borderRadius: 4, borderWidth: 1, padding: 8, alignItems: "center", gap: 3 },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 9, fontFamily: "Inter_500Medium" },

  // Prize card
  prizeWrapper: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 4 },
  prizeCard: {
    borderRadius: 16, borderWidth: 1, overflow: "hidden",
    padding: 16, gap: 12,
  },
  prizeTop: { gap: 4 },
  prizeTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  prizeTitle: {
    fontSize: 13, fontFamily: "Inter_600SemiBold",
    color: GOLD, textTransform: "uppercase", letterSpacing: 1,
  },
  prizeAmountRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  prizePot: {
    fontSize: 36, fontFamily: "Inter_700Bold", color: GOLD,
    lineHeight: 42,
  },
  prizeSubtitle: {
    fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(251,191,36,0.6)",
  },
  prizeDivider: { height: 1 },
  prizeDist: { gap: 8 },
  prizeDistLabel: {
    fontSize: 10, fontFamily: "Inter_600SemiBold",
    color: "rgba(251,191,36,0.5)", textTransform: "uppercase", letterSpacing: 0.5,
  },
  prizeDistRow: { flexDirection: "row", gap: 8 },
  prizeDistItem: {
    flex: 1, alignItems: "center",
    backgroundColor: "rgba(251,191,36,0.06)",
    borderRadius: 10, borderWidth: 1, borderColor: "rgba(251,191,36,0.15)",
    paddingVertical: 10, gap: 2,
  },
  prizeDistPlace: { fontSize: 16, fontFamily: "Inter_700Bold" },
  prizeDistAmount: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  prizeDistPct: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(251,191,36,0.5)" },

  // Today's matches
  section: { padding: 12, paddingTop: 10, gap: 5 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 },
  emptyCard: {
    borderRadius: 12, borderWidth: 1, padding: 28, alignItems: "center", gap: 10,
  },
  emptyTxt: { fontSize: 14, fontFamily: "Inter_500Medium" },
  emptyLink: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 4 },
});
