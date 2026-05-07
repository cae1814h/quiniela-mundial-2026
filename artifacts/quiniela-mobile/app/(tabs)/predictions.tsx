import { Feather } from "@expo/vector-icons";
import { useListMatches, useListMyPredictions, getListMyPredictionsQueryKey } from "@workspace/api-client-react";
import type { Match, PredictionWithMatch } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  RefreshControl,
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
import { getTodayHN, getTomorrowHN, matchDayStr, matchInWeekHN } from "@/utils/dateHN";

type OuterTab = "realizados" | "pendientes";
type TimeFilter = "todo" | "hoy" | "manana" | "semana";

function matchInTimeRange(matchDate: string, filter: TimeFilter): boolean {
  if (filter === "todo") return true;
  const day = matchDayStr(matchDate);
  if (filter === "hoy") return day === getTodayHN();
  if (filter === "manana") return day === getTomorrowHN();
  return matchInWeekHN(matchDate);
}

const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
  { key: "hoy", label: "Hoy" },
  { key: "manana", label: "Mañana" },
  { key: "semana", label: "Semana" },
  { key: "todo", label: "Todo" },
];

export default function PredictionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const [outerTab, setOuterTab] = useState<OuterTab>("realizados");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("todo");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: matches, isLoading: loadingMatches, refetch: refetchMatches } = useListMatches();
  const { data: predictions, isLoading: loadingPreds, refetch: refetchPreds } = useListMyPredictions({
    query: { enabled: !!token, queryKey: getListMyPredictionsQueryKey() },
  });

  const predsByMatchId = useMemo(() => {
    const map = new Map<number, PredictionWithMatch>();
    (predictions ?? []).forEach((p) => map.set(p.matchId, p));
    return map;
  }, [predictions]);

  const filtered = useMemo(() => {
    if (!matches) return [];
    if (outerTab === "realizados") {
      return matches.filter((m) =>
        predsByMatchId.has(m.id) && matchInTimeRange(m.matchDate, timeFilter)
      );
    }
    return matches.filter((m) =>
      !predsByMatchId.has(m.id) &&
      m.status === "scheduled" &&
      matchInTimeRange(m.matchDate, timeFilter)
    );
  }, [matches, outerTab, timeFilter, predsByMatchId]);

  const isLoading = loadingMatches || loadingPreds;

  const handleRefresh = async () => {
    await Promise.all([refetchMatches(), refetchPreds()]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <View style={styles.headerTitleRow}>
          <Feather name="crosshair" size={20} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Pronósticos</Text>
        </View>

        {/* Outer tabs */}
        <View style={[styles.outerTabBar, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
          {(["realizados", "pendientes"] as OuterTab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setOuterTab(tab)}
              style={[
                styles.outerTab,
                outerTab === tab && { backgroundColor: colors.primary },
              ]}
            >
              <Text style={[
                styles.outerTabText,
                { color: outerTab === tab ? colors.primaryForeground : colors.mutedForeground },
              ]}>
                {tab === "realizados" ? "Realizados" : "Pendientes"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Time filters */}
        <View style={styles.timeFilterRow}>
          {TIME_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setTimeFilter(f.key)}
              style={[
                styles.pill,
                {
                  borderColor: timeFilter === f.key ? colors.primary : "transparent",
                  backgroundColor: timeFilter === f.key
                    ? `${colors.primary}22`
                    : colors.surface2,
                },
              ]}
            >
              <Text style={[
                styles.pillText,
                { color: timeFilter === f.key ? colors.primary : colors.mutedForeground },
              ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={isLoading ? (Array(4).fill(null) as null[]) : filtered}
        keyExtractor={(item, i) => item ? String((item as Match).id) : `sk-${i}`}
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 120 : 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Feather
                name={outerTab === "pendientes" ? "check-circle" : "crosshair"}
                size={36}
                color={colors.mutedForeground}
              />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {outerTab === "pendientes"
                  ? "Sin partidos pendientes"
                  : "Sin pronósticos en este período"}
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {outerTab === "pendientes"
                  ? "¡Ya pronosticaste todos los partidos!"
                  : "Cambia el filtro de tiempo o ve a Pendientes para pronosticar"}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) =>
          item === null ? (
            <SkeletonMatchCard />
          ) : (
            <MatchCard
              match={item as Match}
              prediction={predsByMatchId.get((item as Match).id)}
              onPress={() => router.push(`/match/${(item as Match).id}`)}
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, gap: 14 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  outerTabBar: {
    flexDirection: "row", borderRadius: 4, borderWidth: 1, padding: 3,
  },
  outerTab: {
    flex: 1, paddingVertical: 9, borderRadius: 4, alignItems: "center",
  },
  outerTabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  timeFilterRow: { flexDirection: "row", gap: 6 },
  pill: {
    flex: 1, paddingVertical: 8, borderRadius: 4, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  pillText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  list: { padding: 16 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
