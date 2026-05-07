import { Feather } from "@expo/vector-icons";
import {
  useGetLeaderboard,
  useGetLeaderboardSummary,
  useGetPrizePool,
  getGetPrizePoolQueryKey,
} from "@workspace/api-client-react";
import type { LeaderboardEntry } from "@workspace/api-client-react";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SkeletonLeaderboardRow } from "@/components/SkeletonCard";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

function getInitials(name: string) {
  const parts = name.trim().split(" ");
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

// ── Avatar: photo if available, initials fallback ──────────────────────────
function PlayerAvatar({
  name, photoUrl, colors, size = 38,
}: {
  name: string; photoUrl?: string | null;
  colors: ReturnType<typeof useColors>; size?: number;
}) {
  const r = size / 2;
  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={{ width: size, height: size, borderRadius: r }}
        contentFit="cover"
      />
    );
  }
  return (
    <View
      style={{
        width: size, height: size, borderRadius: r,
        backgroundColor: `${colors.primary}22`,
        borderWidth: 1, borderColor: `${colors.primary}44`,
        alignItems: "center", justifyContent: "center",
      }}
    >
      <Text style={{ color: colors.primary, fontSize: size * 0.36, fontFamily: "Inter_700Bold" }}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

// ── Rank badge: medal icons for 1-2-3, number for rest ─────────────────────
function RankBadge({ rank }: { rank: number }) {
  const colors = useColors();
  if (rank === 1) {
    return (
      <View style={[styles.rankCircle, { backgroundColor: "rgba(251,191,36,0.18)", borderColor: "rgba(251,191,36,0.45)" }]}>
        <Feather name="award" size={16} color={colors.gold} />
      </View>
    );
  }
  if (rank === 2) {
    return (
      <View style={[styles.rankCircle, { backgroundColor: "rgba(148,163,184,0.18)", borderColor: "rgba(148,163,184,0.38)" }]}>
        <Text style={[styles.rankNum, { color: "#94a3b8" }]}>2</Text>
      </View>
    );
  }
  if (rank === 3) {
    return (
      <View style={[styles.rankCircle, { backgroundColor: "rgba(205,124,62,0.18)", borderColor: "rgba(205,124,62,0.38)" }]}>
        <Text style={[styles.rankNum, { color: "#cd7c3e" }]}>3</Text>
      </View>
    );
  }
  return (
    <View style={[styles.rankCircle, { backgroundColor: "rgba(78,110,138,0.10)", borderColor: "rgba(78,110,138,0.22)" }]}>
      <Text style={[styles.rankNum, { color: colors.mutedForeground }]}>{rank}</Text>
    </View>
  );
}

// ── Points badge ────────────────────────────────────────────────────────────
function PointsBadge({ pts, colors }: { pts: number; colors: ReturnType<typeof useColors> }) {
  const isTop = pts > 0;
  return (
    <View style={[
      styles.ptsBadge,
      {
        backgroundColor: isTop ? `${colors.primary}16` : "rgba(78,110,138,0.08)",
        borderColor: isTop ? `${colors.primary}35` : "rgba(78,110,138,0.18)",
      },
    ]}>
      <Text style={[styles.ptsNum, { color: isTop ? colors.primary : colors.mutedForeground }]}>
        {pts}
      </Text>
      <Text style={[styles.ptsWord, { color: isTop ? colors.primary : colors.mutedForeground }]}>
        puntos
      </Text>
    </View>
  );
}

// ── Details bottom-sheet modal ──────────────────────────────────────────────
function DetailsModal({
  entry, visible, onClose, colors,
}: {
  entry: LeaderboardEntry | null;
  visible: boolean;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  if (!entry) return null;
  const failed = Math.max(0, entry.totalPredictions - entry.exactScores - entry.correctWinners);

  const stats = [
    { label: "Puntos",                   value: entry.totalPoints,      color: colors.primary,     icon: "award" as const },
    { label: "Exactos (3 puntos)",        value: entry.exactScores,      color: colors.primary,     icon: "check-circle" as const },
    { label: "Ganador / Empate (1 punto)", value: entry.correctWinners, color: colors.gold,        icon: "check" as const },
    { label: "Fallidos (0 puntos)",        value: failed,               color: colors.destructive, icon: "x-circle" as const },
    { label: "Total pronósticos",          value: entry.totalPredictions, color: "#60a5fa",         icon: "crosshair" as const },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.sheetHandle, { backgroundColor: colors.mutedForeground }]} />

          {/* Player header */}
          <View style={styles.sheetPlayer}>
            <PlayerAvatar name={entry.name} photoUrl={entry.photoUrl} colors={colors} size={52} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetName, { color: colors.foreground }]}>{entry.name}</Text>
              <Text style={[styles.sheetRankTxt, { color: colors.mutedForeground }]}>
                Posición #{entry.rank}
              </Text>
            </View>
            <View style={[styles.sheetPtsPill, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}35` }]}>
              <Text style={[styles.sheetPtsNum, { color: colors.primary }]}>{entry.totalPoints}</Text>
              <Text style={[styles.sheetPtsLabel, { color: colors.primary }]}>puntos</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={{ gap: 0 }}>
            {stats.map((s, i) => (
              <View
                key={s.label}
                style={[
                  styles.statRow,
                  { borderBottomColor: colors.border },
                  i === stats.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={styles.statLeft}>
                  <Feather name={s.icon} size={15} color={s.color} />
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                </View>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
          >
            <Text style={[styles.closeTxt, { color: colors.foreground }]}>Cerrar</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Prize badge colors per rank ─────────────────────────────────────────────
const PRIZE_STYLES: Record<number, { color: string; bg: string; border: string }> = {
  1: { color: "#fbbf24", bg: "rgba(251,191,36,0.18)", border: "rgba(251,191,36,0.50)" },
  2: { color: "#94a3b8", bg: "rgba(148,163,184,0.18)", border: "rgba(148,163,184,0.45)" },
  3: { color: "#cd7c3e", bg: "rgba(205,124,62,0.18)", border: "rgba(205,124,62,0.45)" },
};

function fmtLps(amount: number) {
  return `L. ${amount.toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Individual leaderboard row ──────────────────────────────────────────────
function LeaderRow({
  item, isMe, prizeAmount, onPress,
}: {
  item: LeaderboardEntry; isMe: boolean; prizeAmount?: number; onPress: () => void;
}) {
  const colors = useColors();
  const isTop3 = item.rank <= 3;
  const prizeStyle = PRIZE_STYLES[item.rank];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.row,
        { borderBottomColor: colors.border },
        isMe && { backgroundColor: `${colors.primary}0c` },
        isTop3 && { backgroundColor: item.rank === 1
          ? "rgba(251,191,36,0.05)"
          : item.rank === 2
          ? "rgba(148,163,184,0.05)"
          : "rgba(205,124,62,0.05)"
        },
      ]}
    >
      {/* Col 1: rank */}
      <RankBadge rank={item.rank} />

      {/* Col 2: photo/avatar */}
      <PlayerAvatar name={item.name} photoUrl={item.photoUrl} colors={colors} size={38} />

      {/* Col 3: name + "Tú" badge + sub-stats + prize */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {item.name}
          </Text>
          {isMe && (
            <View style={[styles.meBadge, { backgroundColor: `${colors.primary}22`, borderColor: `${colors.primary}44` }]}>
              <Text style={[styles.meTxt, { color: colors.primary }]}>Tú</Text>
            </View>
          )}
        </View>
        {item.exactScores > 0 || item.correctWinners > 0 ? (
          <Text style={[styles.subStats, { color: colors.mutedForeground }]}>
            {item.exactScores > 0 ? `${item.exactScores} exacto${item.exactScores > 1 ? "s" : ""}` : ""}
            {item.exactScores > 0 && item.correctWinners > 0 ? " · " : ""}
            {item.correctWinners > 0 ? `${item.correctWinners} ganador${item.correctWinners > 1 ? "es" : ""}` : ""}
          </Text>
        ) : null}

        {/* Prize badge for top-3 */}
        {prizeStyle && prizeAmount != null && prizeAmount > 0 && (
          <View style={[styles.prizeBadge, { backgroundColor: prizeStyle.bg, borderColor: prizeStyle.border }]}>
            <Feather name="award" size={9} color={prizeStyle.color} />
            <Text style={[styles.prizeTxt, { color: prizeStyle.color }]}>
              {fmtLps(prizeAmount)}
            </Text>
          </View>
        )}
      </View>

      {/* Col 4: points */}
      <PointsBadge pts={item.totalPoints} colors={colors} />

      {/* Col 5: chevron */}
      <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

// ── Summary stat card ───────────────────────────────────────────────────────
function SummaryCard({ label, value, icon, colors }: {
  label: string; value: string; icon: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.sumCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Feather name={icon as any} size={15} color={colors.primary} />
      <Text style={[styles.sumValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

// ── Screen ──────────────────────────────────────────────────────────────────
export default function LeaderboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [selected, setSelected] = useState<LeaderboardEntry | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: entries, isLoading, refetch } = useGetLeaderboard({ limit: 100 });
  const { data: summary } = useGetLeaderboardSummary();
  const { data: prize } = useGetPrizePool({
    query: { queryKey: getGetPrizePoolQueryKey() },
  });

  // Map rank → prize amount from distribution array
  const prizeByRank: Record<number, number> = {};
  (prize?.distribution ?? []).forEach((d) => {
    prizeByRank[d.place] = d.amount;
  });

  const openDetails = (entry: LeaderboardEntry) => {
    setSelected(entry);
    setModalVisible(true);
  };

  const ListHeader = (
    <>
      {/* Page header */}
      <View style={[styles.pageHeader, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <Feather name="bar-chart-2" size={20} color={colors.primary} />
          <Text style={[styles.title, { color: colors.foreground }]}>Tabla de posiciones</Text>
        </View>
      </View>

      {/* Summary cards */}
      {summary && (
        <View style={styles.summaryRow}>
          <SummaryCard label="Jugadores" value={String(summary.totalPlayers)} icon="users" colors={colors} />
          <SummaryCard
            label="Partidos"
            value={`${summary.matchesFinished}/${summary.totalMatches}`}
            icon="calendar"
            colors={colors}
          />
          <SummaryCard
            label="Máximo"
            value={`${summary.topScore}`}
            icon="award"
            colors={colors}
          />
        </View>
      )}

      {/* Column labels */}
      <View style={[styles.colHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.colLbl, { color: colors.mutedForeground, width: 34 }]}>#</Text>
        <Text style={[styles.colLbl, { color: colors.mutedForeground, width: 38 }]} />
        <Text style={[styles.colLbl, { color: colors.mutedForeground, flex: 1 }]}>Jugador</Text>
        <Text style={[styles.colLbl, { color: colors.mutedForeground }]}>Puntos</Text>
      </View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={isLoading ? (Array(12).fill(null) as null[]) : (entries ?? [])}
        keyExtractor={(item, i) => item ? String((item as LeaderboardEntry).rank) : `sk-${i}`}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 120 : 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.primary} />
        }
        renderItem={({ item }) =>
          item === null ? (
            <View style={{ paddingHorizontal: 16 }}>
              <SkeletonLeaderboardRow />
            </View>
          ) : (
            <LeaderRow
              item={item as LeaderboardEntry}
              isMe={(item as LeaderboardEntry).userId === user?.id}
              prizeAmount={prizeByRank[(item as LeaderboardEntry).rank]}
              onPress={() => openDetails(item as LeaderboardEntry)}
            />
          )
        }
      />

      <DetailsModal
        entry={selected}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  pageHeader: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },

  // Summary
  summaryRow: { flexDirection: "row", gap: 10, padding: 16 },
  sumCard: {
    flex: 1, borderRadius: 12, borderWidth: 1, padding: 12,
    alignItems: "center", gap: 5,
  },
  sumValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  sumLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textAlign: "center" },

  // Column labels
  colHeader: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1,
  },
  colLbl: { fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },

  // Row
  row: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 11, paddingHorizontal: 16, borderBottomWidth: 1,
  },
  rankCircle: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  rankNum: { fontSize: 13, fontFamily: "Inter_700Bold" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 14, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  subStats: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  meBadge: { borderRadius: 4, borderWidth: 1, paddingHorizontal: 5, paddingVertical: 1 },
  meTxt: { fontSize: 9, fontFamily: "Inter_700Bold" },

  // Prize badge
  prizeBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    marginTop: 4, alignSelf: "flex-start",
    borderRadius: 5, borderWidth: 1,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  prizeTxt: { fontSize: 10, fontFamily: "Inter_700Bold" },

  // Points badge
  ptsBadge: {
    borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 5,
    alignItems: "center", minWidth: 56,
  },
  ptsNum: { fontSize: 16, fontFamily: "Inter_700Bold", lineHeight: 19 },
  ptsWord: { fontSize: 9, fontFamily: "Inter_600SemiBold", marginTop: 0 },

  // Modal
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.60)", justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderBottomWidth: 0,
    padding: 24, paddingTop: 12, gap: 20,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: "center", opacity: 0.35, marginBottom: 8,
  },
  sheetPlayer: { flexDirection: "row", alignItems: "center", gap: 14 },
  sheetName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sheetRankTxt: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  sheetPtsPill: {
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 6,
    alignItems: "center",
  },
  sheetPtsNum: { fontSize: 20, fontFamily: "Inter_700Bold", lineHeight: 24 },
  sheetPtsLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  statRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 13, borderBottomWidth: 1,
  },
  statLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  statLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  statValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  closeBtn: {
    borderRadius: 10, borderWidth: 1, paddingVertical: 14, alignItems: "center",
  },
  closeTxt: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
