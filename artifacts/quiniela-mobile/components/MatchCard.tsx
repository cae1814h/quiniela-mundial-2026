import { Feather } from "@expo/vector-icons";
import type { Match, PredictionWithMatch } from "@workspace/api-client-react";
import { Image } from "expo-image";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { cityFlagUrl } from "@/lib/cityFlag";

const ICON = 14;

export function formatMatchDate(dateStr: string) {
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return { date: "", time: "—" };
  const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  const day = parseInt(m[3], 10);
  const mon = months[parseInt(m[2], 10) - 1];
  return { date: `${day} ${mon}`, time: `${m[4]}:${m[5]} HN` };
}

export function isMatchLocked(matchDate: string) {
  const storedAsUtcMs = new Date(matchDate).getTime();
  const actualUtcMs = storedAsUtcMs + 6 * 60 * 60 * 1000;
  return Date.now() >= actualUtcMs - 5 * 60 * 1000;
}

// ─── Flag cell (bandera + nombre centrado) ────────────────────────────────────
function FlagCell({ flag, name, colors }: {
  flag?: string | null; name: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.flagCell}>
      {flag ? (
        <Image source={{ uri: flag }} style={styles.flag} contentFit="cover" />
      ) : (
        <View style={[styles.flagPh, { backgroundColor: colors.surface2 }]}>
          <Text style={[styles.flagPhText, { color: colors.mutedForeground }]}>
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

interface Props {
  match: Match;
  prediction?: PredictionWithMatch;
  onPress?: () => void;
}

export function MatchCard({ match, prediction, onPress }: Props) {
  const colors = useColors();
  const { date, time } = formatMatchDate(match.matchDate);
  const locked = isMatchLocked(match.matchDate);
  const isFinished = match.status === "finished";
  const isLive = match.status === "live";
  const hasPred = !!prediction;
  const pts = prediction?.pointsEarned ?? null;
  const predScore = hasPred ? `${prediction!.predictedHome}–${prediction!.predictedAway}` : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.78}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      {/* Top row: grupo (izquierda) + fase (derecha) */}
      <View style={styles.topRow}>
        <View style={styles.topCol}>
          {match.groupName && (
            <GroupBadge label={`Grupo ${match.groupName}`} colors={colors} />
          )}
        </View>
        <View style={styles.topColCenter}>
          <View style={[styles.metaBadge, { backgroundColor: `${colors.mutedForeground}12`, borderColor: `${colors.mutedForeground}26` }]}>
            <Feather name="calendar" size={11} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{date} · {time}</Text>
          </View>
        </View>
        <View style={styles.topColRight}>
          <RoundBadge label={roundLabel(match.round)} colors={colors} />
        </View>
      </View>

      {/* Teams area */}
      <View style={styles.teamsArea}>
        {/* Row 1: banderas + marcador/VS centrado a la misma altura */}
        <View style={styles.flagsRow}>
          <FlagCell flag={match.teamHomeFlagUrl} name={match.teamHome} colors={colors} />

          <View style={styles.centerCol}>
            {isFinished && match.homeScore != null ? (
              <>
                <Text style={[styles.score, { color: colors.foreground }]}>
                  {match.homeScore} – {match.awayScore}
                </Text>
                <Text style={[styles.finalLabel, { color: colors.mutedForeground }]}>Final</Text>
              </>
            ) : isLive ? (
              <View style={[styles.liveDot, { backgroundColor: colors.live }]} />
            ) : (
              <Text style={[styles.vsText, { color: colors.mutedForeground }]}>VS</Text>
            )}
            {/* Estado con 1pt de separación */}
            <View style={{ marginTop: 1 }}>
              <StatusBadge status={match.status} colors={colors} />
            </View>
            {/* Pronóstico a 3pt del estado */}
            {predScore && (
              <View style={[styles.predScorePill, { marginTop: 3, backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}40` }]}>
                <Text style={[styles.predScoreText, { color: colors.primary }]}>{predScore}</Text>
              </View>
            )}
          </View>

          <FlagCell flag={match.teamAwayFlagUrl} name={match.teamAway} colors={colors} />
        </View>

      </View>

      {/* Bottom: venue (left) + points badge (right) */}
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
        <PointsBadge hasPred={hasPred} pts={pts} locked={locked} isFinished={isFinished} isLive={isLive} colors={colors} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Group badge (verde, estilo PHP mc-badge-group) ───────────────────────────
function GroupBadge({ label, colors }: { label: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.roundBadge, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}40` }]}>
      <Text style={[styles.roundBadgeText, { color: colors.primary }]}>{label}</Text>
    </View>
  );
}

// ─── Round badge (mismo estilo verde que el grupo) ────────────────────────────
function RoundBadge({ label, colors }: { label: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.roundBadge, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}40` }]}>
      <Text style={[styles.roundBadgeText, { color: colors.primary }]} numberOfLines={1} ellipsizeMode="clip">{label}</Text>
    </View>
  );
}


// ─── Pulse dot for live ───────────────────────────────────────────────────────
function PulseDot({ color }: { color: string }) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.15, duration: 650, useNativeDriver: false }),
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: false }),
      ])
    ).start();
    return () => opacity.stopAnimation();
  }, []);
  return <Animated.View style={[styles.liveDotSm, { backgroundColor: color, opacity }]} />;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
export const STATUS_LIVE  = "#ef4444";
export const STATUS_DONE  = "#00d896";
export const STATUS_SCHED = "#3b82f6";

export function StatusBadge({ status, colors }: { status: string; colors: ReturnType<typeof useColors> }) {
  if (status === "live") {
    return (
      <View style={[styles.badge, { backgroundColor: `${STATUS_LIVE}22`, borderColor: `${STATUS_LIVE}55` }]}>
        <PulseDot color={STATUS_LIVE} />
        <Text style={[styles.badgeText, { color: STATUS_LIVE }]}>En juego</Text>
      </View>
    );
  }
  if (status === "finished") {
    return (
      <View style={[styles.badge, { backgroundColor: `${STATUS_DONE}18`, borderColor: `${STATUS_DONE}44` }]}>
        <Text style={[styles.badgeText, { color: STATUS_DONE }]}>Finalizado</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, { backgroundColor: `${STATUS_SCHED}18`, borderColor: `${STATUS_SCHED}44` }]}>
      <Text style={[styles.badgeText, { color: STATUS_SCHED }]}>Programado</Text>
    </View>
  );
}

// ─── Points badge (bottom right) ─────────────────────────────────────────────
export const VERDE = "#00d896";

export function PointsBadge({ hasPred, pts, locked, isFinished, isLive, colors }: {
  hasPred: boolean; pts: number | null; locked: boolean;
  isFinished: boolean; isLive: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  // No prediction yet
  if (!hasPred) {
    if (locked) {
      return (
        <View style={[styles.ptsBadge, { backgroundColor: `${colors.mutedForeground}15`, borderColor: `${colors.mutedForeground}30` }]}>
          <Feather name="lock" size={ICON} color={colors.mutedForeground} />
          <Text style={[styles.ptsTxt, { color: colors.mutedForeground }]}>Sin pronóstico</Text>
        </View>
      );
    }
    return (
      <View style={[styles.ptsBadge, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}44` }]}>
        <Feather name="crosshair" size={ICON} color={colors.primary} />
        <Text style={[styles.ptsTxt, { color: colors.primary }]}>Pronosticar</Text>
      </View>
    );
  }

  // Has prediction but match not finished yet → pending
  if (!isFinished) {
    const pendColor = isLive ? STATUS_LIVE : STATUS_SCHED;
    return (
      <View style={[styles.ptsBadge, { backgroundColor: `${pendColor}18`, borderColor: `${pendColor}44` }]}>
        <Feather name="clock" size={ICON} color={pendColor} />
        <Text style={[styles.ptsTxt, { color: pendColor }]}>Pendiente</Text>
      </View>
    );
  }

  // Match finished — show points earned
  if (pts === 3) {
    return (
      <View style={[styles.ptsBadge, { backgroundColor: `${VERDE}22`, borderColor: `${VERDE}55` }]}>
        <Feather name="award" size={ICON} color={VERDE} />
        <Text style={[styles.ptsTxt, { color: VERDE }]}>+3 puntos</Text>
      </View>
    );
  }
  if (pts === 1) {
    return (
      <View style={[styles.ptsBadge, { backgroundColor: `${colors.gold}22`, borderColor: `${colors.gold}55` }]}>
        <Feather name="check" size={ICON} color={colors.gold} />
        <Text style={[styles.ptsTxt, { color: colors.gold }]}>+1 punto</Text>
      </View>
    );
  }
  return (
    <View style={[styles.ptsBadge, { backgroundColor: `${colors.destructive}18`, borderColor: `${colors.destructive}44` }]}>
      <Feather name="x" size={ICON} color={colors.destructive} />
      <Text style={[styles.ptsTxt, { color: colors.destructive }]}>0 puntos</Text>
    </View>
  );
}

export function roundLabel(round: string): string {
  const labels: Record<string, string> = {
    group: "Fase de Grupos",
    round_of_32: "Ronda 32",
    round_of_16: "Octavos",
    quarterfinal: "Cuartos",
    semifinal: "Semifinal",
    third_place: "3er Lugar",
    final: "Final",
  };
  return labels[round] ?? round;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginBottom: 6,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
    gap: 6,
  },
  topCol: { flex: 1, alignItems: "flex-start" },
  topColCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  topColRight: { flex: 1, alignItems: "flex-end" },
  metaRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  metaSide: { flex: 1 },
  metaBadge: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    borderRadius: 4, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2,
    alignSelf: "center",
  },
  metaText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  venueBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderRadius: 4, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3,
  },
  venueFlag: { width: 12, height: 8, borderRadius: 2 },
  venueText: { fontSize: 10, fontFamily: "Inter_400Regular", flexShrink: 1 },
  roundBadge: {
    borderRadius: 4, borderWidth: 1, paddingHorizontal: 5, paddingVertical: 2, maxWidth: 105,
  },
  roundBadgeText: { fontSize: 9, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  badge: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    borderRadius: 4, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3,
  },
  badgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveDotSm: { width: 6, height: 6, borderRadius: 3 },
  teamsArea: { gap: 4 },
  flagsRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  flagCell: { flex: 1, alignItems: "center" },
  predRow: { alignItems: "center" },
  namesRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  nameSpacer: { minWidth: 64 },
  statusCenter: {
    alignItems: "center", paddingVertical: 6,
  },
  flag: { width: 44, height: 30, borderRadius: 4 },
  flagPh: {
    width: 44, height: 30, borderRadius: 4,
    alignItems: "center", justifyContent: "center",
  },
  flagPhText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  teamName: { fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "center" },
  centerCol: { alignItems: "center", justifyContent: "center", minWidth: 64, gap: 2 },
  vsText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  score: { fontSize: 20, fontFamily: "Inter_700Bold" },
  finalLabel: { fontSize: 9, fontFamily: "Inter_500Medium" },
  // Predicted score pill under VS
  predScorePill: {
    borderRadius: 4, borderWidth: 1,
    paddingHorizontal: 9, paddingVertical: 3, marginTop: 3,
  },
  predScoreText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  bottomRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: 6, gap: 8,
  },
  bottomLeft: { flexShrink: 1, flexGrow: 1 },
  // Points badge (bottom right)
  ptsBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderRadius: 4, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4,
  },
  ptsTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
