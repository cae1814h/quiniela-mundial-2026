import { Feather } from "@expo/vector-icons";
import {
  useListMatches,
  useListMyPredictions,
  useUpdateMatchResult,
  getListMyPredictionsQueryKey,
} from "@workspace/api-client-react";
import type { Match, PredictionWithMatch } from "@workspace/api-client-react";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  formatMatchDate,
  roundLabel,
  StatusBadge,
  MatchCard,
} from "@/components/MatchCard";
import { SkeletonMatchCard } from "@/components/SkeletonCard";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { cityFlagUrl } from "@/lib/cityFlag";
import { getTodayHN, getYesterdayHN, matchDayStr, matchInWeekHN } from "@/utils/dateHN";

// ── Types ──────────────────────────────────────────────────────────────────
type MainTab    = "resultados" | "grupos";
type ResultsTab = "ayer" | "hoy" | "semana" | "todos";

type TeamStanding = {
  team: string;
  flagUrl?: string | null;
  PJ: number; PG: number; PE: number; PP: number;
  GF: number; GC: number; DG: number; PTS: number;
};

// ── Standings computation (client-side from API matches) ────────────────
function computeStandings(matches: Match[], group: string): TeamStanding[] {
  const teamMap = new Map<string, TeamStanding>();

  for (const m of matches) {
    if (m.groupName !== group || m.round !== "group") continue;

    if (!teamMap.has(m.teamHome)) {
      teamMap.set(m.teamHome, {
        team: m.teamHome, flagUrl: m.teamHomeFlagUrl,
        PJ: 0, PG: 0, PE: 0, PP: 0, GF: 0, GC: 0, DG: 0, PTS: 0,
      });
    }
    if (!teamMap.has(m.teamAway)) {
      teamMap.set(m.teamAway, {
        team: m.teamAway, flagUrl: m.teamAwayFlagUrl,
        PJ: 0, PG: 0, PE: 0, PP: 0, GF: 0, GC: 0, DG: 0, PTS: 0,
      });
    }

    if (m.status !== "finished" || m.homeScore == null || m.awayScore == null) continue;

    const home = teamMap.get(m.teamHome)!;
    const away = teamMap.get(m.teamAway)!;

    home.PJ++; away.PJ++;
    home.GF += m.homeScore; home.GC += m.awayScore;
    away.GF += m.awayScore; away.GC += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.PG++; home.PTS += 3; away.PP++;
    } else if (m.homeScore < m.awayScore) {
      away.PG++; away.PTS += 3; home.PP++;
    } else {
      home.PE++; home.PTS++; away.PE++; away.PTS++;
    }

    home.DG = home.GF - home.GC;
    away.DG = away.GF - away.GC;
  }

  return Array.from(teamMap.values()).sort(
    (a, b) => b.PTS - a.PTS || b.DG - a.DG || b.GF - a.GF
  );
}

// ── Flag / placeholder ─────────────────────────────────────────────────────
function FlagCol({ flag, name, colors }: {
  flag?: string | null; name: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.flagCol}>
      {flag ? (
        <Image source={{ uri: flag }} style={styles.flag} contentFit="cover" />
      ) : (
        <View style={[styles.flagPh, { backgroundColor: colors.surface2 }]}>
          <Text style={[styles.flagPhTxt, { color: colors.mutedForeground }]}>
            {name.slice(0, 3).toUpperCase()}
          </Text>
        </View>
      )}
      <Text style={[styles.teamName, { color: colors.foreground }]} numberOfLines={1} textBreakStrategy="simple">
        {name}
      </Text>
    </View>
  );
}

// ── Admin Result Modal ──────────────────────────────────────────────────────
function ScoreStepper({ value, onChange, colors }: {
  value: number; onChange: (v: number) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => onChange(Math.max(0, value - 1))}
        style={[styles.stepBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
        hitSlop={6}
      >
        <Feather name="minus" size={18} color={colors.foreground} />
      </Pressable>
      <Text style={[styles.stepVal, { color: colors.foreground }]}>{value}</Text>
      <Pressable
        onPress={() => onChange(Math.min(30, value + 1))}
        style={[styles.stepBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
        hitSlop={6}
      >
        <Feather name="plus" size={18} color={colors.foreground} />
      </Pressable>
    </View>
  );
}

function AdminResultModal({ match, visible, onClose, onSaved, colors }: {
  match: Match | null;
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);

  React.useEffect(() => {
    if (match) {
      setHomeScore(match.homeScore ?? 0);
      setAwayScore(match.awayScore ?? 0);
    }
  }, [match]);

  const { mutate, isPending } = useUpdateMatchResult({
    mutation: {
      onSuccess: () => {
        onSaved();
        onClose();
      },
      onError: (err: any) => {
        Alert.alert("Error", err?.data?.error ?? "No se pudo guardar el resultado");
      },
    },
  });

  const handleSave = () => {
    if (!match) return;
    mutate({ id: match.id, data: { homeScore, awayScore, status: "finished" } });
  };

  const handleRevert = () => {
    if (!match) return;
    Alert.alert(
      "Revertir partido",
      "¿Volver el partido a Pendiente? Se eliminarán los puntos calculados.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Revertir",
          style: "destructive",
          onPress: () =>
            mutate({ id: match.id, data: { homeScore: null as any, awayScore: null as any, status: "scheduled" } }),
        },
      ]
    );
  };

  if (!match) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Ingresar Resultado</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {/* Teams + steppers */}
          <View style={styles.modalBody}>
            {/* Home team */}
            <View style={styles.teamCol}>
              {match.teamHomeFlagUrl ? (
                <Image source={{ uri: match.teamHomeFlagUrl }} style={styles.modalFlag} contentFit="cover" />
              ) : (
                <View style={[styles.flagPh, { backgroundColor: colors.surface2 }]}>
                  <Text style={[styles.flagPhTxt, { color: colors.mutedForeground }]}>
                    {match.teamHome.slice(0, 3).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={[styles.teamNameModal, { color: colors.foreground }]} numberOfLines={2}>
                {match.teamHome}
              </Text>
              <ScoreStepper value={homeScore} onChange={setHomeScore} colors={colors} />
            </View>

            <Text style={[styles.modalVs, { color: colors.mutedForeground }]}>VS</Text>

            {/* Away team */}
            <View style={styles.teamCol}>
              {match.teamAwayFlagUrl ? (
                <Image source={{ uri: match.teamAwayFlagUrl }} style={styles.modalFlag} contentFit="cover" />
              ) : (
                <View style={[styles.flagPh, { backgroundColor: colors.surface2 }]}>
                  <Text style={[styles.flagPhTxt, { color: colors.mutedForeground }]}>
                    {match.teamAway.slice(0, 3).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={[styles.teamNameModal, { color: colors.foreground }]} numberOfLines={2}>
                {match.teamAway}
              </Text>
              <ScoreStepper value={awayScore} onChange={setAwayScore} colors={colors} />
            </View>
          </View>

          {/* Actions */}
          <View style={[styles.modalActions, { borderTopColor: colors.border }]}>
            {match.status === "finished" && (
              <TouchableOpacity
                style={[styles.revertBtn, { borderColor: "#ef4444" }]}
                onPress={handleRevert}
                disabled={isPending}
              >
                <Feather name="rotate-ccw" size={14} color="#ef4444" />
                <Text style={[styles.revertBtnTxt, { color: "#ef4444" }]}>Revertir</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }, isPending && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={isPending}
            >
              {isPending ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <>
                  <Feather name="save" size={15} color={colors.primaryForeground} />
                  <Text style={[styles.saveBtnTxt, { color: colors.primaryForeground }]}>Guardar Resultado</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Result card ────────────────────────────────────────────────────────────
function ResultCard({ match, colors, isAdmin, onEdit }: {
  match: Match; colors: ReturnType<typeof useColors>;
  isAdmin: boolean; onEdit: (m: Match) => void;
}) {
  const { date, time } = formatMatchDate(match.matchDate);
  const isFinished = match.status === "finished";
  const isLive     = match.status === "live";

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Top row: grupo (izq) | fecha badge (centro) | fase + editar (der) */}
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          {match.groupName ? (
            <View style={[styles.badge, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}40` }]}>
              <Text style={[styles.badgeTxt, { color: colors.primary }]}>Grupo {match.groupName}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.topCenter}>
          <View style={[styles.metaBadge, { backgroundColor: `${colors.mutedForeground}12`, borderColor: `${colors.mutedForeground}26` }]}>
            <Feather name="calendar" size={11} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{date} · {time}</Text>
          </View>
        </View>
        <View style={styles.topRight}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={[styles.badge, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}40` }]}>
              <Text style={[styles.badgeTxt, { color: colors.primary }]}>{roundLabel(match.round)}</Text>
            </View>
            {isAdmin && (
              <Pressable
                onPress={() => onEdit(match)}
                hitSlop={8}
                style={[styles.editBtn, {
                  backgroundColor: isFinished ? "rgba(239,68,68,0.12)" : `${colors.primary}22`,
                  borderColor: isFinished ? "rgba(239,68,68,0.4)" : `${colors.primary}50`,
                }]}
              >
                <Feather name={isFinished ? "edit-2" : "circle"} size={11} color={isFinished ? "#ef4444" : colors.primary} />
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* Equipos */}
      <View style={styles.flagsRow}>
        <FlagCol flag={match.teamHomeFlagUrl} name={match.teamHome} colors={colors} />
        <View style={styles.centerCol}>
          {isFinished && match.homeScore != null ? (
            <Text style={[styles.scoreText, { color: colors.foreground }]}>
              {match.homeScore} – {match.awayScore}
            </Text>
          ) : isLive ? (
            <Text style={[styles.scoreText, { color: colors.live }]}>
              {match.homeScore ?? 0} – {match.awayScore ?? 0}
            </Text>
          ) : (
            <Text style={[styles.vsText, { color: colors.mutedForeground }]}>VS</Text>
          )}
          <View style={{ marginTop: 1 }}>
            <StatusBadge status={match.status} colors={colors} />
          </View>
        </View>
        <FlagCol flag={match.teamAwayFlagUrl} name={match.teamAway} colors={colors} />
      </View>

      {/* Bottom row: estadio (izq) | stat badges (der) */}
      <View style={styles.bottomRow}>
        <View style={styles.bottomLeft}>
          {(match.city || match.venue) && (
            <View style={[styles.venueBadge, { backgroundColor: `${colors.mutedForeground}10`, borderColor: `${colors.mutedForeground}22` }]}>
              {(() => {
                const flag = cityFlagUrl(match.city);
                return flag ? (
                  <Image source={{ uri: flag }} style={styles.venueFlag} contentFit="cover" />
                ) : (
                  <Feather name="map-pin" size={10} color={colors.mutedForeground} />
                );
              })()}
              <Text style={[styles.venueText, { color: colors.mutedForeground }]} numberOfLines={1}>
                {[match.city, match.venue].filter(Boolean).join(" · ")}
              </Text>
            </View>
          )}
        </View>
        {isFinished && match.exactCount != null && (
          <View style={styles.statBadgeRow}>
            <View style={[styles.statBadge, { backgroundColor: "rgba(0,216,150,0.12)", borderColor: "rgba(0,216,150,0.35)" }]}>
              <Feather name="check-circle" size={10} color="#00d896" />
              <Text style={[styles.statBadgeTxt, { color: "#00d896" }]}>{match.exactCount}</Text>
            </View>
            <View style={[styles.statBadge, { backgroundColor: "rgba(251,191,36,0.12)", borderColor: "rgba(251,191,36,0.35)" }]}>
              <Feather name="award" size={10} color="#fbbf24" />
              <Text style={[styles.statBadgeTxt, { color: "#fbbf24" }]}>{match.winnerCount}</Text>
            </View>
            <View style={[styles.statBadge, { backgroundColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.35)" }]}>
              <Feather name="x-circle" size={10} color="#ef4444" />
              <Text style={[styles.statBadgeTxt, { color: "#ef4444" }]}>{match.missCount}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Sub-tab pill ───────────────────────────────────────────────────────────
function TabPill({ label, active, onPress, colors }: {
  label: string; active: boolean; onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.tab,
        {
          borderColor: active ? colors.primary : "transparent",
          backgroundColor: active ? `${colors.primary}22` : colors.surface2,
        },
      ]}
    >
      <Text style={[styles.tabText, { color: active ? colors.primary : colors.mutedForeground }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Groups table ───────────────────────────────────────────────────────────
const GOLD   = "#fbbf24";
const SILVER = "#94a3b8";
const BRONZE = "#cd7c3e";

function GroupsView({ matches, predsByMatchId, colors }: {
  matches: Match[];
  predsByMatchId: Map<number, PredictionWithMatch>;
  colors: ReturnType<typeof useColors>;
}) {
  const router = useRouter();

  const groups = useMemo(() => {
    const seen = new Set<string>();
    for (const m of matches) {
      if (m.groupName && m.round === "group") seen.add(m.groupName);
    }
    return Array.from(seen).sort();
  }, [matches]);

  const [activeGroup, setActiveGroup] = useState<string>(() => groups[0] ?? "A");

  const standings = useMemo(
    () => computeStandings(matches, activeGroup),
    [matches, activeGroup]
  );

  const groupMatches = useMemo(
    () => matches.filter((m) => m.groupName === activeGroup && m.round === "group"),
    [matches, activeGroup]
  );

  const played = useMemo(
    () => groupMatches.filter((m) => m.status === "finished").length,
    [groupMatches]
  );

  return (
    <ScrollView
      contentContainerStyle={[styles.groupScroll, { paddingBottom: Platform.OS === "web" ? 120 : 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Group letter selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.groupTabRow}
      >
        {groups.map((g) => (
          <TouchableOpacity
            key={g}
            onPress={() => setActiveGroup(g)}
            style={[
              styles.groupTab,
              {
                backgroundColor: activeGroup === g ? `${colors.primary}22` : colors.surface2,
                borderColor:     activeGroup === g ? colors.primary : "transparent",
              },
            ]}
          >
            <Text style={[
              styles.groupTabText,
              { color: activeGroup === g ? colors.primary : colors.mutedForeground },
            ]}>
              {g}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Header */}
      <View style={styles.groupHeader}>
        <Text style={[styles.groupTitle, { color: colors.foreground }]}>Grupo {activeGroup}</Text>
        <Text style={[styles.groupSub, { color: colors.mutedForeground }]}>
          {played} partido{played !== 1 ? "s" : ""} jugado{played !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Standings card */}
      <View style={[styles.standingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Table header */}
        <View style={[styles.standingsRow, styles.standingsHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.colPos, styles.colHeader, { color: colors.mutedForeground }]}>#</Text>
          <View style={styles.colFlag} />
          <Text style={[styles.colTeam, styles.colHeader, { color: colors.mutedForeground }]}>Selección</Text>
          {(["PJ","PG","PE","PP","GF","GC","DG","PTS"] as const).map((h) => (
            <Text key={h} style={[
              styles.colStat, styles.colHeader,
              { color: h === "PTS" ? GOLD : colors.mutedForeground },
            ]}>
              {h}
            </Text>
          ))}
        </View>

        {standings.length === 0 ? (
          <View style={styles.groupEmpty}>
            <Text style={[styles.groupEmptyTxt, { color: colors.mutedForeground }]}>
              Sin partidos jugados aún
            </Text>
          </View>
        ) : (
          standings.map((row, i) => {
            const pos      = i + 1;
            const qualify  = pos <= 2;
            const maybe    = pos === 3;
            const accentColor = qualify ? colors.primary : maybe ? GOLD : "transparent";
            const nameColor   = qualify ? colors.foreground : colors.mutedForeground;

            return (
              <View
                key={row.team}
                style={[
                  styles.standingsRow,
                  i < standings.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  { borderLeftWidth: 3, borderLeftColor: accentColor },
                ]}
              >
                {/* Position */}
                <Text style={[styles.colPos, {
                  color: qualify ? colors.primary : maybe ? GOLD : colors.mutedForeground,
                  fontFamily: "Inter_700Bold",
                }]}>
                  {pos}
                </Text>

                {/* Flag */}
                <View style={styles.colFlag}>
                  {row.flagUrl ? (
                    <Image source={{ uri: row.flagUrl }} style={styles.standingFlag} contentFit="cover" />
                  ) : (
                    <View style={[styles.standingFlagPh, { backgroundColor: colors.surface2 }]}>
                      <Text style={[styles.flagPhTxt, { color: colors.mutedForeground }]}>
                        {row.team.slice(0, 3).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Team name */}
                <Text style={[styles.colTeam, { color: nameColor, fontFamily: qualify ? "Inter_700Bold" : "Inter_400Regular" }]} numberOfLines={1}>
                  {row.team}
                </Text>

                {/* Stats */}
                <Text style={[styles.colStat, { color: colors.foreground }]}>{row.PJ}</Text>
                <Text style={[styles.colStat, { color: row.PG > 0 ? colors.primary : colors.foreground }]}>{row.PG}</Text>
                <Text style={[styles.colStat, { color: colors.foreground }]}>{row.PE}</Text>
                <Text style={[styles.colStat, { color: row.PP > 0 ? "#ef4444" : colors.foreground }]}>{row.PP}</Text>
                <Text style={[styles.colStat, { color: colors.foreground }]}>{row.GF}</Text>
                <Text style={[styles.colStat, { color: colors.foreground }]}>{row.GC}</Text>
                <Text style={[styles.colStat, {
                  color: row.DG > 0 ? colors.primary : row.DG < 0 ? "#ef4444" : colors.foreground,
                  fontFamily: "Inter_600SemiBold",
                }]}>
                  {row.DG > 0 ? `+${row.DG}` : row.DG}
                </Text>
                <Text style={[styles.colStat, { color: GOLD, fontFamily: "Inter_700Bold" }]}>{row.PTS}</Text>
              </View>
            );
          })
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendTxt, { color: colors.mutedForeground }]}>Clasifican directamente (1° y 2°)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: GOLD }]} />
          <Text style={[styles.legendTxt, { color: colors.mutedForeground }]}>Posible clasificación (mejor 3er lugar)</Text>
        </View>
      </View>

      {/* Group matches */}
      <View style={styles.matchesSectionHeader}>
        <Feather name="calendar" size={14} color={colors.primary} />
        <Text style={[styles.matchesSectionTitle, { color: colors.foreground }]}>
          Partidos — Grupo {activeGroup}
        </Text>
      </View>

      {groupMatches.length === 0 ? (
        <View style={styles.groupEmpty}>
          <Text style={[styles.groupEmptyTxt, { color: colors.mutedForeground }]}>
            No hay partidos registrados para este grupo.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 6 }}>
          {groupMatches.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              prediction={predsByMatchId.get(m.id)}
              onPress={() => router.push(`/match/${m.id}`)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────
const RESULTS_TABS: { key: ResultsTab; label: string }[] = [
  { key: "ayer",   label: "Ayer"   },
  { key: "hoy",    label: "Hoy"    },
  { key: "semana", label: "Semana" },
  { key: "todos",  label: "Todos"  },
];

export default function ResultsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { token, user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [mainTab,    setMainTab]    = useState<MainTab>("resultados");
  const [activeTab,  setActiveTab]  = useState<ResultsTab>("hoy");
  const [editMatch,  setEditMatch]  = useState<Match | null>(null);

  const { data: matches, isLoading, refetch } = useListMatches();
  const { data: predictions } = useListMyPredictions({
    query: { enabled: !!token, queryKey: getListMyPredictionsQueryKey() },
  });

  const predsByMatchId = useMemo(() => {
    const map = new Map<number, PredictionWithMatch>();
    (predictions ?? []).forEach((p) => map.set(p.matchId, p));
    return map;
  }, [predictions]);

  const today     = getTodayHN();
  const yesterday = getYesterdayHN();

  const filtered = useMemo(() => {
    if (!matches) return [];
    if (activeTab === "todos")  return matches;
    if (activeTab === "ayer")   return matches.filter((m) => matchDayStr(m.matchDate) === yesterday);
    if (activeTab === "hoy")    return matches.filter((m) => matchDayStr(m.matchDate) === today);
    return matches.filter((m) => matchInWeekHN(m.matchDate));
  }, [matches, activeTab, today, yesterday]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <View style={styles.headerTitleRow}>
          <Feather name="flag" size={20} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {mainTab === "grupos" ? "Grupos" : "Resultados"}
          </Text>
        </View>

        {/* Main tabs: Resultados | Grupos */}
        <View style={[styles.mainTabRow, { borderColor: colors.border }]}>
          {([
            { key: "resultados" as MainTab, label: "Resultados", icon: "flag"   },
            { key: "grupos"     as MainTab, label: "Grupos",     icon: "shield" },
          ]).map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setMainTab(t.key)}
              style={[
                styles.mainTab,
                {
                  borderBottomWidth: 2,
                  borderBottomColor: mainTab === t.key ? colors.primary : "transparent",
                  paddingBottom: 10,
                },
              ]}
            >
              <Feather name={t.icon as any} size={13} color={mainTab === t.key ? colors.primary : colors.mutedForeground} />
              <Text style={[
                styles.mainTabText,
                { color: mainTab === t.key ? colors.primary : colors.mutedForeground },
              ]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sub-tabs only shown for Resultados */}
        {mainTab === "resultados" && (
          <View style={styles.tabRow}>
            {RESULTS_TABS.map((t) => (
              <TabPill
                key={t.key}
                label={t.label}
                active={activeTab === t.key}
                onPress={() => setActiveTab(t.key)}
                colors={colors}
              />
            ))}
          </View>
        )}
      </View>

      {/* ── Content ── */}
      {mainTab === "grupos" ? (
        matches ? (
          <GroupsView matches={matches} predsByMatchId={predsByMatchId} colors={colors} />
        ) : (
          <View style={styles.loadingWrap}>
            <Text style={{ color: colors.mutedForeground }}>Cargando…</Text>
          </View>
        )
      ) : (
        <FlatList
          data={isLoading ? (Array(6).fill(null) as null[]) : filtered}
          keyExtractor={(item, i) => item ? String((item as Match).id) : `sk-${i}`}
          contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 120 : 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.empty}>
                <Feather name="calendar" size={32} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No hay partidos en este período
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) =>
            item === null ? (
              <SkeletonMatchCard />
            ) : (
              <ResultCard
                match={item as Match}
                colors={colors}
                isAdmin={isAdmin}
                onEdit={setEditMatch}
              />
            )
          }
        />
      )}

      <AdminResultModal
        match={editMatch}
        visible={editMatch !== null}
        onClose={() => setEditMatch(null)}
        onSaved={() => void refetch()}
        colors={colors}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  header: { paddingHorizontal: 20, paddingBottom: 0, borderBottomWidth: 1, gap: 0 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },

  mainTabRow: { flexDirection: "row", gap: 0, marginBottom: 0 },
  mainTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  mainTabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  tabRow: { flexDirection: "row", gap: 6, paddingTop: 12, paddingBottom: 14 },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 4, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  tabText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  list: { paddingHorizontal: 12, paddingTop: 10, gap: 6 },

  card: { borderRadius: 8, borderWidth: 1, padding: 10 },
  topRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 6, gap: 6 },
  topLeft: { flex: 1, alignItems: "flex-start" },
  topCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  topRight: { flex: 1, alignItems: "flex-end" },
  metaBadge: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    borderRadius: 4, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "center",
  },
  metaText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  bottomLeft: { flexShrink: 1, flexGrow: 1 },
  venueBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderRadius: 4, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3,
  },
  venueFlag: { width: 12, height: 8, borderRadius: 2 },
  venueText: { fontSize: 10, fontFamily: "Inter_400Regular", flexShrink: 1 },
  badge: { borderRadius: 4, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTxt: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  flagsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  flagCol: { flex: 1, alignItems: "center", gap: 4 },
  flag: { width: 44, height: 30, borderRadius: 4 },
  flagPh: { width: 44, height: 30, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  flagPhTxt: { fontSize: 9, fontFamily: "Inter_700Bold" },
  teamName: { fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  centerCol: { alignItems: "center", justifyContent: "center", minWidth: 64, gap: 2 },
  scoreText: { fontSize: 20, fontFamily: "Inter_700Bold" },
  vsText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  dateText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Groups view
  groupScroll: { paddingHorizontal: 12, paddingTop: 14, gap: 14 },
  groupTabRow: { flexDirection: "row", gap: 6, paddingBottom: 2 },
  groupTab: {
    minWidth: 38, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 6, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  groupTabText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  groupHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  groupTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  groupSub:   { fontSize: 12, fontFamily: "Inter_400Regular" },
  groupEmpty: { padding: 24, alignItems: "center" },
  groupEmptyTxt: { fontSize: 13, fontFamily: "Inter_400Regular" },

  // Standings table
  standingsCard: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  standingsHeader: { paddingVertical: 8 },
  standingsRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 9, gap: 0,
  },
  colHeader: { fontFamily: "Inter_600SemiBold", fontSize: 9, textTransform: "uppercase" },
  colPos: { width: 20, textAlign: "center", fontSize: 12 },
  colFlag: { width: 30, alignItems: "center", marginRight: 6 },
  colTeam: { flex: 1, fontSize: 12, marginRight: 4 },
  colStat: { width: 26, textAlign: "center", fontSize: 11, fontFamily: "Inter_400Regular" },
  standingFlag: { width: 24, height: 16, borderRadius: 3 },
  standingFlagPh: { width: 24, height: 16, borderRadius: 3, alignItems: "center", justifyContent: "center" },

  legend: { gap: 6 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { fontSize: 12, fontFamily: "Inter_400Regular" },

  matchesSectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 4 },
  matchesSectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },

  // Prediction stats badges
  statBadgeRow: { flexDirection: "row", gap: 5, marginTop: 6 },
  statBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 4, borderWidth: 1,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  statBadgeTxt: { fontSize: 11, fontFamily: "Inter_700Bold" },

  // Admin edit button on card
  editBtn: {
    borderRadius: 4, borderWidth: 1, padding: 4,
    alignItems: "center", justifyContent: "center",
  },

  // Admin result modal
  modalOverlay: {
    flex: 1, justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalSheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderWidth: 1, borderBottomWidth: 0,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  modalBody: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-evenly",
    paddingHorizontal: 20, paddingVertical: 24,
  },
  teamCol: { flex: 1, alignItems: "center", gap: 10 },
  modalFlag: { width: 72, height: 48, borderRadius: 6 },
  teamNameModal: {
    fontSize: 13, fontFamily: "Inter_600SemiBold",
    textAlign: "center", maxWidth: 110,
  },
  modalVs: { fontSize: 18, fontFamily: "Inter_700Bold", marginHorizontal: 8 },
  modalActions: {
    flexDirection: "row", gap: 10, paddingHorizontal: 20,
    paddingTop: 16, borderTopWidth: 1, alignItems: "center",
  },
  revertBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  revertBtnTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  saveBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 12, paddingVertical: 14,
  },
  saveBtnTxt: { fontSize: 15, fontFamily: "Inter_700Bold" },

  // Stepper
  stepper: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepBtn: {
    width: 36, height: 36, borderRadius: 10, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  stepVal: { fontSize: 28, fontFamily: "Inter_700Bold", minWidth: 36, textAlign: "center" },
});
