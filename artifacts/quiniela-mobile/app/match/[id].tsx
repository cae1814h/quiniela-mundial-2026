import { Feather } from "@expo/vector-icons";
import {
  useGetMatch,
  useListMyPredictions,
  useUpsertPrediction,
  getGetMatchQueryKey,
  getListMyPredictionsQueryKey,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { roundLabel, formatMatchDate, isMatchLocked } from "@/components/MatchCard";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { cityFlagUrl } from "@/lib/cityFlag";

function FlagTeam({ flag, name }: { flag?: string | null; name: string; align?: "left" | "right" }) {
  const colors = useColors();
  return (
    <View style={styles.teamCol}>
      {flag ? (
        <Image source={{ uri: flag }} style={styles.bigFlag} contentFit="cover" />
      ) : (
        <View style={[styles.bigFlagPh, { backgroundColor: colors.surface2 }]}>
          <Text style={[styles.flagPhTxt, { color: colors.mutedForeground }]}>
            {name.slice(0, 3).toUpperCase()}
          </Text>
        </View>
      )}
      <Text style={[styles.teamName, { color: colors.foreground }]} numberOfLines={2} textBreakStrategy="simple">
        {name}
      </Text>
    </View>
  );
}

function ScoreInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  const colors = useColors();
  const handleMinus = () => {
    const n = Math.max(0, parseInt(value || "0", 10) - 1);
    onChange(String(n));
  };
  const handlePlus = () => {
    const n = Math.min(20, parseInt(value || "0", 10) + 1);
    onChange(String(n));
  };
  return (
    <View style={styles.scoreInputWrap}>
      <TouchableOpacity
        onPress={handleMinus}
        disabled={disabled}
        style={[styles.stepBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
        activeOpacity={0.7}
      >
        <Feather name="minus" size={18} color={disabled ? colors.mutedForeground : colors.foreground} />
      </TouchableOpacity>
      <TextInput
        style={[styles.scoreField, { color: colors.foreground, backgroundColor: colors.surface2, borderColor: colors.primary }]}
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9]/g, "").slice(0, 2))}
        keyboardType="number-pad"
        editable={!disabled}
        maxLength={2}
        textAlign="center"
      />
      <TouchableOpacity
        onPress={handlePlus}
        disabled={disabled}
        style={[styles.stepBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
        activeOpacity={0.7}
      >
        <Feather name="plus" size={18} color={disabled ? colors.mutedForeground : colors.foreground} />
      </TouchableOpacity>
    </View>
  );
}

// ── Finished match prediction result block ──────────────────────────────────
function FinishedPredBlock({ pred, pts, firstName, colors }: {
  pred: any; pts: number | null; firstName: string; colors: any;
}) {
  let ptColor = colors.destructive;
  let ptBg    = "rgba(239,68,68,0.13)";
  let ptBdr   = "rgba(239,68,68,0.28)";
  let ptsMsgBg = "rgba(239,68,68,0.07)";
  let ptsLabel = "0 puntos";
  let line1 = `Lo sentimos ${firstName},`;
  let line2 = "Esta vez no se pudo. Seguro que a la próxima te irá bien, ¡sigue pronosticando!";

  if (pts === 3) {
    ptColor = colors.primary; ptBg = "rgba(0,216,150,0.13)"; ptBdr = "rgba(0,216,150,0.28)"; ptsMsgBg = "rgba(0,216,150,0.07)";
    ptsLabel = "+3 puntos";
    line1 = `¡Felicidades ${firstName}!`;
    line2 = "Acertaste el ganador y marcador de este partido, ganaste 3 puntos.";
  } else if (pts === 1) {
    ptColor = colors.gold; ptBg = "rgba(251,191,36,0.13)"; ptBdr = "rgba(251,191,36,0.28)"; ptsMsgBg = "rgba(251,191,36,0.07)";
    ptsLabel = "+1 punto";
    line1 = `¡Felicidades ${firstName}!`;
    line2 = "Acertaste el ganador de este partido, ganaste 1 punto.";
  }

  const scoreStr = `${pred.predictedHome} – ${pred.predictedAway}`;

  return (
    <View style={styles.resultBlock}>
      {/* Icon + title — always green */}
      <View style={[styles.resultIconCircle, { borderColor: "#00d896", backgroundColor: "rgba(0,216,150,0.13)" }]}>
        <Feather name="check-circle" size={22} color="#00d896" />
      </View>
      <Text style={[styles.resultTitle, { color: colors.foreground }]}>Partido finalizado</Text>

      {/* Score card */}
      <View style={{ alignItems: "center", gap: 6 }}>
        <Text style={[styles.resultSubLabel, { color: colors.mutedForeground }]}>Mi pronóstico</Text>
        <View style={[styles.scoreBadgeCard, { borderColor: ptColor, backgroundColor: ptBg }]}>
          <Feather name="award" size={14} color={ptColor} />
          <Text style={[styles.scoreBadgeScore, { color: ptColor }]}>{scoreStr}</Text>
          <View style={[styles.ptsPill, { borderColor: ptBdr, backgroundColor: ptBg }]}>
            <Text style={[styles.ptsPillTxt, { color: ptColor }]}>{ptsLabel}</Text>
          </View>
        </View>
      </View>

      {/* Congrats message */}
      {pts !== null && (
        <View style={[styles.congratsBox, { borderColor: ptBdr, backgroundColor: ptsMsgBg }]}>
          <Text style={[styles.congratsLine1, { color: ptColor }]}>{line1}</Text>
          <Text style={[styles.congratsLine2, { color: ptColor }]}>{line2}</Text>
        </View>
      )}
      {pts === null && (
        <Text style={[styles.lockSub, { color: colors.mutedForeground }]}>Puntos pendientes de calcular</Text>
      )}
    </View>
  );
}

// ── Pending prediction block (has pred, match not finished) ─────────────────
function PendingPredBlock({ pred, colors }: { pred: any; colors: any }) {
  const pendingColor = "#60a5fa";
  const pendingBg    = "rgba(96,165,250,0.13)";
  const pendingBdr   = "rgba(96,165,250,0.28)";
  const scoreStr = `${pred.predictedHome} – ${pred.predictedAway}`;

  return (
    <View style={styles.resultBlock}>
      {/* Icon + title */}
      <View style={[styles.resultIconCircle, { borderColor: pendingColor, backgroundColor: pendingBg }]}>
        <Feather name="clock" size={22} color={pendingColor} />
      </View>
      <Text style={[styles.resultTitle, { color: colors.foreground }]}>Pronóstico registrado</Text>

      {/* Score card */}
      <View style={{ alignItems: "center", gap: 6 }}>
        <Text style={[styles.resultSubLabel, { color: colors.mutedForeground }]}>Mi pronóstico</Text>
        <View style={[styles.scoreBadgeCard, { borderColor: pendingColor, backgroundColor: pendingBg }]}>
          <Feather name="star" size={14} color={pendingColor} />
          <Text style={[styles.scoreBadgeScore, { color: pendingColor }]}>{scoreStr}</Text>
          <View style={[styles.ptsPill, { borderColor: pendingBdr, backgroundColor: pendingBg }]}>
            <Text style={[styles.ptsPillTxt, { color: pendingColor }]}>En espera</Text>
          </View>
        </View>
      </View>

      {/* Info message */}
      <View style={[styles.congratsBox, { borderColor: pendingBdr, backgroundColor: "rgba(96,165,250,0.07)" }]}>
        <Text style={[styles.congratsLine2, { color: pendingColor }]}>
          Tu pronóstico está registrado. Ya no puedes modificarlo (ventana de cambios cerrada 5 min antes del partido).
        </Text>
      </View>
    </View>
  );
}

export default function MatchDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchId = parseInt(id ?? "0", 10);
  const { token, user } = useAuth();
  const qc = useQueryClient();

  const { data: match, isLoading } = useGetMatch(matchId, {
    query: { enabled: !!matchId, queryKey: getGetMatchQueryKey(matchId) },
  });

  const { data: predictions } = useListMyPredictions({
    query: { enabled: !!token, queryKey: getListMyPredictionsQueryKey() },
  });

  const myPred = useMemo(
    () => predictions?.find((p) => p.matchId === matchId),
    [predictions, matchId]
  );

  const [homeInput, setHomeInput] = useState(myPred ? String(myPred.predictedHome) : "0");
  const [awayInput, setAwayInput] = useState(myPred ? String(myPred.predictedAway) : "0");

  React.useEffect(() => {
    if (myPred) {
      setHomeInput(String(myPred.predictedHome));
      setAwayInput(String(myPred.predictedAway));
    }
  }, [myPred?.id]);

  const { mutate: savePred, isPending: saving } = useUpsertPrediction({
    mutation: {
      onSuccess: (_, vars) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        qc.invalidateQueries({ queryKey: ["/api/predictions"] });
        Alert.alert(
          "¡Pronóstico guardado!",
          `Tu pronóstico ${vars.data.predictedHome} – ${vars.data.predictedAway} fue registrado correctamente.`,
          [{ text: "OK", onPress: () => router.back() }]
        );
      },
      onError: (err: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Error", err?.data?.error ?? "No se pudo guardar el pronóstico");
      },
    },
  });

  if (isLoading || !match) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const locked = isMatchLocked(match.matchDate);
  const isFinished = match.status === "finished";
  const isLive = match.status === "live";
  const isScheduled = match.status === "scheduled";
  const hasPred = !!myPred;
  const pts = myPred?.pointsEarned ?? null;
  const { date, time } = formatMatchDate(match.matchDate);
  const firstName = user?.name?.split(" ")[0] ?? "jugador";

  const canPredict = isScheduled && !locked;

  const handleSave = () => {
    const home = parseInt(homeInput || "0", 10);
    const away = parseInt(awayInput || "0", 10);
    savePred({ data: { matchId, predictedHome: home, predictedAway: away } });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 12, paddingTop: 12 }} showsVerticalScrollIndicator={false}>

          <View style={[styles.frameCard, { borderColor: colors.border }]}>

          {/* Match hero */}
          <LinearGradient
            colors={[colors.card, colors.background]}
            style={styles.hero}
          >
            <View style={styles.heroMeta}>
              <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                {match.groupName && (
                  <View style={[styles.chip, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}40` }]}>
                    <Text style={[styles.chipText, { color: colors.primary, fontSize: 13 }]}>Grupo {match.groupName}</Text>
                  </View>
                )}
                {isLive && (
                  <View style={[styles.chip, { backgroundColor: "rgba(255,68,68,0.15)", borderColor: "rgba(255,68,68,0.35)" }]}>
                    <View style={[styles.liveDot, { backgroundColor: colors.live }]} />
                    <Text style={[styles.chipText, { color: colors.live }]}>En juego</Text>
                  </View>
                )}
              </View>
              <View style={[styles.chip, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}40` }]}>
                <Text style={[styles.chipText, { color: colors.primary, fontSize: 13 }]}>{roundLabel(match.round)}</Text>
              </View>
            </View>

            {/* Teams + score */}
            <View style={styles.teamsRow}>
              <FlagTeam flag={match.teamHomeFlagUrl} name={match.teamHome} align="left" />
              <View style={styles.centerScore}>
                {isFinished && match.homeScore != null ? (
                  <>
                    <Text style={[styles.bigScore, { color: colors.foreground }]}>
                      {match.homeScore} – {match.awayScore}
                    </Text>
                    <Text style={[styles.finalTxt, { color: colors.mutedForeground }]}>Final</Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.vsText, { color: colors.mutedForeground }]}>VS</Text>
                    <View style={[styles.dateChip, { backgroundColor: colors.surface2 }]}>
                      <Feather name="clock" size={10} color={colors.mutedForeground} />
                      <Text style={[styles.dateChipTxt, { color: colors.mutedForeground }]}>{time}</Text>
                    </View>
                  </>
                )}
              </View>
              <FlagTeam flag={match.teamAwayFlagUrl} name={match.teamAway} align="right" />
            </View>

            {/* Venue: bottom-left with country flag */}
            {(match.city || match.venue) && (
              <View style={styles.infoRow}>
                {(() => {
                  const flag = cityFlagUrl(match.city);
                  return flag ? (
                    <Image source={{ uri: flag }} style={{ width: 14, height: 10, borderRadius: 2 }} contentFit="cover" />
                  ) : (
                    <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                  );
                })()}
                <Text style={[styles.infoTxt, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {[match.city, match.venue].filter(Boolean).join(" · ")}
                </Text>
              </View>
            )}
          </LinearGradient>

          {/* Prediction section */}
          <View style={styles.section}>
            {!token ? (
              /* Not logged in */
              <View style={[styles.lockCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="user" size={28} color={colors.mutedForeground} />
                <Text style={[styles.lockTitle, { color: colors.foreground }]}>Inicia sesión</Text>
                <Text style={[styles.lockSub, { color: colors.mutedForeground }]}>para hacer tu pronóstico</Text>
                <TouchableOpacity
                  style={[styles.loginBtn, { backgroundColor: colors.primary }]}
                  onPress={() => router.push("/(auth)/login")}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.loginBtnTxt, { color: colors.primaryForeground }]}>Iniciar sesión</Text>
                </TouchableOpacity>
              </View>

            ) : isFinished && hasPred ? (
              /* Finished + has prediction → full result card */
              <View style={[styles.resultCardWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <FinishedPredBlock pred={myPred!} pts={pts} firstName={firstName} colors={colors} />
              </View>

            ) : isFinished && !hasPred ? (
              /* Finished + no prediction */
              <View style={[styles.lockCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="check-circle" size={28} color={colors.primary} />
                <Text style={[styles.lockTitle, { color: colors.foreground }]}>Partido finalizado</Text>
                <Text style={[styles.lockSub, { color: colors.mutedForeground }]}>No realizaste un pronóstico para este partido</Text>
              </View>

            ) : hasPred && !canPredict ? (
              /* Has prediction, match pending */
              <View style={[styles.resultCardWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <PendingPredBlock pred={myPred!} colors={colors} />
              </View>

            ) : isLive ? (
              /* Live, no prediction */
              <View style={[styles.lockCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="radio" size={28} color="#ef4444" />
                <Text style={[styles.lockTitle, { color: colors.foreground }]}>Partido en juego</Text>
                <Text style={[styles.lockSub, { color: colors.mutedForeground }]}>Las predicciones están cerradas</Text>
              </View>

            ) : locked && !hasPred ? (
              /* Time-locked, no prediction */
              <View style={[styles.lockCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="lock" size={28} color={colors.mutedForeground} />
                <Text style={[styles.lockTitle, { color: colors.foreground }]}>Pronósticos cerrados</Text>
                <Text style={[styles.lockSub, { color: colors.mutedForeground }]}>Las predicciones se cierran 5 min antes del partido</Text>
              </View>

            ) : canPredict ? (
              /* Can predict / edit */
              <View style={[styles.predCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.predTitle, { color: colors.foreground }]}>
                  {hasPred ? "Editar pronóstico" : "Hacer pronóstico"}
                </Text>
                <Text style={[styles.predSub, { color: colors.mutedForeground }]}>{match.teamHome} vs {match.teamAway}</Text>
                <View style={styles.inputsRow}>
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text style={[styles.inputTeamLabel, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {match.teamHome}
                    </Text>
                    <ScoreInput value={homeInput} onChange={setHomeInput} disabled={false} />
                  </View>
                  <Text style={[styles.dashSep, { color: colors.mutedForeground }]}>–</Text>
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text style={[styles.inputTeamLabel, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {match.teamAway}
                    </Text>
                    <ScoreInput value={awayInput} onChange={setAwayInput} disabled={false} />
                  </View>
                </View>

                <View style={[styles.scoringInfo, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                  <InfoRow icon="award" label="Marcador exacto" value="+3 pts" color={colors.primary} colors={colors} />
                  <InfoRow icon="check" label="Ganador/Empate correcto" value="+1 pt" color={colors.gold} colors={colors} />
                  <InfoRow icon="x" label="Pronóstico erróneo" value="0 pts" color={colors.destructive} colors={colors} />
                </View>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.primaryForeground} />
                  ) : (
                    <>
                      <Feather name={hasPred ? "edit-2" : "crosshair"} size={16} color={colors.primaryForeground} />
                      <Text style={[styles.saveBtnTxt, { color: colors.primaryForeground }]}>
                        {hasPred ? "Actualizar pronóstico" : "Guardar pronóstico"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

            ) : null}
          </View>

          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function InfoRow({ icon, label, value, color, colors }: { icon: string; label: string; value: string; color: string; colors: any }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 }}>
      <Feather name={icon as any} size={13} color={color} />
      <Text style={{ flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>{label}</Text>
      <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  frameCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  hero: { padding: 20, paddingTop: 17, gap: 16 },
  heroMeta: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4,
  },
  chipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  teamsRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  teamCol: { flex: 1, alignItems: "center", gap: 8 },
  bigFlag: { width: 56, height: 38, borderRadius: 5 },
  bigFlagPh: { width: 56, height: 38, borderRadius: 5, alignItems: "center", justifyContent: "center" },
  flagPhTxt: { fontSize: 11, fontFamily: "Inter_700Bold" },
  teamName: { fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 18, textAlign: "center" },
  centerScore: { alignItems: "center", minWidth: 70 },
  bigScore: { fontSize: 28, fontFamily: "Inter_700Bold" },
  finalTxt: { fontSize: 11, fontFamily: "Inter_500Medium" },
  vsText: { fontSize: 20, fontFamily: "Inter_700Bold" },
  dateChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginTop: 4,
  },
  dateChipTxt: { fontSize: 11, fontFamily: "Inter_500Medium" },
  dateRow: { alignItems: "center", marginTop: 8, marginBottom: 4 },
  dateBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 6, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4,
  },
  dateBadgeTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-start" },
  infoTxt: { fontSize: 12, fontFamily: "Inter_400Regular" },
  section: { padding: 16 },

  // Lock card (simple states)
  lockCard: {
    borderRadius: 16, borderWidth: 1, padding: 24,
    alignItems: "center", gap: 10,
  },
  lockTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  lockSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  loginBtn: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },
  loginBtnTxt: { fontSize: 15, fontFamily: "Inter_700Bold" },

  // Result card wrapper (finished / pending)
  resultCardWrap: {
    borderRadius: 16, borderWidth: 1, padding: 20,
  },
  resultBlock: {
    alignItems: "center", gap: 14,
  },
  resultIconCircle: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  resultTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  resultSubLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // Score badge card
  scoreBadgeCard: {
    borderRadius: 14, borderWidth: 1.5,
    paddingHorizontal: 32, paddingVertical: 16,
    alignItems: "center", gap: 8,
    minWidth: 180,
  },
  scoreBadgeScore: { fontSize: 36, fontFamily: "Inter_700Bold", lineHeight: 40 },
  ptsPill: {
    borderRadius: 7, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 3,
  },
  ptsPillTxt: { fontSize: 13, fontFamily: "Inter_700Bold" },

  // Congrats / info message box
  congratsBox: {
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 12,
    alignItems: "center", gap: 2,
    width: "100%",
  },
  congratsLine1: { fontSize: 14, fontFamily: "Inter_700Bold", textAlign: "center" },
  congratsLine2: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center", lineHeight: 20 },

  // Prediction form card
  predCard: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 18 },
  predTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  predSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: -10 },
  inputsRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  dashSep: { fontSize: 28, fontFamily: "Inter_700Bold" },
  inputTeamLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 10, textAlign: "center" },
  scoreInputWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepBtn: {
    width: 38, height: 38, borderRadius: 10, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  scoreField: {
    width: 56, height: 56, borderRadius: 12, borderWidth: 2,
    fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center",
  },
  scoringInfo: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
  saveBtn: {
    borderRadius: 12, paddingVertical: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  saveBtnTxt: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
