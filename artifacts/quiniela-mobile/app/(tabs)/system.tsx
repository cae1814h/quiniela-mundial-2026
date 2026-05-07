import { Feather } from "@expo/vector-icons";
import { useListMyPredictions, useSendMessage, getListMyPredictionsQueryKey, getListMessagesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useMessages } from "@/context/MessagesContext";
import { useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";

type SystemTab = "perfil" | "mensajes" | "apariencia" | "informacion";

const SYSTEM_TABS: { key: SystemTab; label: string; icon: string }[] = [
  { key: "informacion", label: "Información", icon: "info" },
  { key: "perfil", label: "Perfil", icon: "user" },
  { key: "mensajes", label: "Mensajes", icon: "bell" },
  { key: "apariencia", label: "Apariencia", icon: "sliders" },
];

// ─── Compose form (admin) ──────────────────────────────────────────────────
function ComposeForm({ onClose, colors }: {
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const queryClient = useQueryClient();
  const [msgType, setMsgType] = useState<"publico" | "privado">("publico");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const { mutate: send, isPending } = useSendMessage();

  const handleSend = () => {
    if (!content.trim()) {
      Alert.alert("Error", "El contenido no puede estar vacío");
      return;
    }
    send(
      { data: { type: msgType, subject: subject.trim() || null, content: content.trim() } },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey() });
          onClose();
        },
        onError: () => {
          Alert.alert("Error", "No se pudo enviar el mensaje");
        },
      }
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.composeCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
        {/* Header */}
        <View style={styles.composeHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Feather name="edit-3" size={15} color={colors.primary} />
            <Text style={[styles.composeTitle, { color: colors.foreground }]}>Redactar mensaje</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Tipo toggle */}
        <View style={styles.typeRow}>
          {(["publico", "privado"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setMsgType(t)}
              style={[
                styles.typeBtn,
                {
                  backgroundColor: msgType === t ? `${colors.primary}22` : colors.surface2,
                  borderColor: msgType === t ? colors.primary : colors.border,
                },
              ]}
            >
              <Feather
                name={t === "publico" ? "globe" : "lock"}
                size={12}
                color={msgType === t ? colors.primary : colors.mutedForeground}
              />
              <Text style={[styles.typeTxt, { color: msgType === t ? colors.primary : colors.mutedForeground }]}>
                {t === "publico" ? "Público" : "Privado"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Subject */}
        <TextInput
          style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface2, borderColor: colors.border }]}
          placeholder="Asunto (opcional)"
          placeholderTextColor={colors.mutedForeground}
          value={subject}
          onChangeText={setSubject}
          maxLength={120}
        />

        {/* Content */}
        <TextInput
          style={[styles.input, styles.inputMulti, { color: colors.foreground, backgroundColor: colors.surface2, borderColor: colors.border }]}
          placeholder="Escribe el mensaje..."
          placeholderTextColor={colors.mutedForeground}
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Send button */}
        <TouchableOpacity
          onPress={handleSend}
          disabled={isPending}
          style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: isPending ? 0.6 : 1 }]}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Feather name="send" size={14} color="#fff" />
              <Text style={styles.sendTxt}>Enviar mensaje</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Perfil tab ────────────────────────────────────────────────────────────
function PerfilTab() {
  const colors = useColors();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { data: predictions } = useListMyPredictions({ query: { enabled: !!user, queryKey: getListMyPredictionsQueryKey() } });

  if (!user) return null;

  const initials = (user.name.charAt(0) + (user.name.split(" ")[1]?.charAt(0) ?? "")).toUpperCase();
  const totalPreds = predictions?.length ?? 0;
  const exactScores = predictions?.filter((p) => p.pointsEarned === 3).length ?? 0;
  const correctWinners = predictions?.filter((p) => p.pointsEarned === 1).length ?? 0;
  const failed = predictions?.filter((p) => p.pointsEarned === 0).length ?? 0;
  const pending = predictions?.filter((p) => p.pointsEarned === null).length ?? 0;

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "¿Seguro que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Avatar */}
      <View style={styles.profileTop}>
        <LinearGradient colors={[`${colors.primary}30`, `${colors.primary}08`]} style={styles.avatarRing}>
          {user.photoUrl ? (
            <Image source={{ uri: user.photoUrl }} style={styles.avatarCircle} contentFit="cover" />
          ) : (
            <View style={[styles.avatarCircle, { backgroundColor: `${colors.primary}18` }]}>
              <Text style={[styles.initials, { color: colors.primary }]}>{initials}</Text>
            </View>
          )}
        </LinearGradient>
        <Text style={[styles.profileName, { color: colors.foreground }]}>{user.name}</Text>
        <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>{user.email}</Text>
        {user.role === "admin" && (
          <View style={[styles.adminBadge, { backgroundColor: `${colors.gold}20`, borderColor: `${colors.gold}50` }]}>
            <Feather name="shield" size={11} color={colors.gold} />
            <Text style={[styles.adminTxt, { color: colors.gold }]}>Administrador</Text>
          </View>
        )}
      </View>

      {/* Points hero */}
      <View style={[styles.ptsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <LinearGradient colors={[`${colors.primary}10`, "transparent"]} style={StyleSheet.absoluteFill} />
        <Feather name="award" size={20} color={colors.primary} />
        <Text style={[styles.ptsNum, { color: colors.primary }]}>{user.totalPoints}</Text>
        <Text style={[styles.ptsLabel, { color: colors.mutedForeground }]}>Puntos totales</Text>
      </View>

      {/* Stats */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>MIS PRONÓSTICOS</Text>
      <View style={styles.statsGrid}>
        {[
          { label: "Total", value: totalPreds, color: colors.foreground },
          { label: "Exactos", value: exactScores, color: colors.primary },
          { label: "Ganador", value: correctWinners, color: colors.gold },
          { label: "Fallidos", value: failed, color: colors.destructive },
          { label: "Pendientes", value: pending, color: "#60a5fa" },
        ].map((s) => (
          <View key={s.label} style={[styles.statBox, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Account */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>CUENTA</Text>
      <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => router.push("/(tabs)/leaderboard")}
        >
          <Feather name="bar-chart-2" size={18} color={colors.primary} />
          <Text style={[styles.menuLabel, { color: colors.foreground }]}>Ver tabla general</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Feather name="log-out" size={18} color={colors.destructive} />
          <Text style={[styles.menuLabel, { color: colors.destructive }]}>Cerrar sesión</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Mensajes tab ──────────────────────────────────────────────────────────
function MensajesTab() {
  const colors = useColors();
  const { user } = useAuth();
  const { messages } = useMessages();
  const isLoading = messages === undefined;
  const [composing, setComposing] = useState(false);
  const isAdmin = user?.role === "admin";

  if (isLoading) {
    return (
      <View style={styles.centeredTab}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.tabContent, { gap: 10 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Compose button (admin only) */}
      {isAdmin && !composing && (
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setComposing(true);
          }}
          style={[styles.composeBtn, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}40` }]}
        >
          <Feather name="edit-3" size={14} color={colors.primary} />
          <Text style={[styles.composeBtnTxt, { color: colors.primary }]}>Redactar mensaje</Text>
        </TouchableOpacity>
      )}

      {/* Compose form */}
      {isAdmin && composing && (
        <ComposeForm colors={colors} onClose={() => setComposing(false)} />
      )}

      {/* Empty state */}
      {(!messages || messages.length === 0) && (
        <View style={styles.centeredTab}>
          <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}15` }]}>
            <Feather name="bell" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sin mensajes</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No tienes mensajes por el momento
          </Text>
        </View>
      )}

      {/* Message list */}
      {messages && messages.map((msg) => {
        const isPriv = msg.type === "privado";
        const isAdminMsg = msg.fromRole === "admin";
        const accentColor = isPriv ? colors.gold : colors.primary;
        const dt = new Date(msg.createdAt);
        const fecha =
          dt.toLocaleDateString("es-HN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Tegucigalpa" }) +
          " " +
          dt.toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit", timeZone: "America/Tegucigalpa" });

        return (
          <View
            key={msg.id}
            style={[styles.msgCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: accentColor }]}
          >
            <View style={styles.msgHeader}>
              <View style={styles.msgHeaderLeft}>
                <View style={[styles.msgTypeBadge, { backgroundColor: `${accentColor}15`, borderColor: `${accentColor}40` }]}>
                  <Feather name={isPriv ? "lock" : "globe"} size={9} color={accentColor} />
                  <Text style={[styles.msgTypeTxt, { color: accentColor }]}>
                    {isPriv ? "Privado" : "Público"}
                  </Text>
                </View>
                <Text style={[styles.msgFrom, { color: colors.foreground }]}>{msg.fromName}</Text>
                {isAdminMsg && (
                  <View style={[styles.adminPill, { backgroundColor: `${colors.gold}18`, borderColor: `${colors.gold}40` }]}>
                    <Text style={[styles.adminPillTxt, { color: colors.gold }]}>Admin</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.msgDate, { color: colors.mutedForeground }]}>{fecha}</Text>
            </View>
            {msg.subject ? (
              <Text style={[styles.msgSubject, { color: colors.foreground }]}>{msg.subject}</Text>
            ) : null}
            <Text style={[styles.msgContent, { color: colors.mutedForeground }]}>{msg.content}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ─── Apariencia tab ────────────────────────────────────────────────────────
function AparienciaTab() {
  const colors = useColors();
  const { mode, setMode } = useTheme();

  return (
    <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>MODO DE PANTALLA</Text>
      <View style={[styles.modeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.modeLeft}>
          <Feather name={mode === "dark" ? "moon" : "sun"} size={20} color={colors.primary} />
          <View style={{ gap: 2 }}>
            <Text style={[styles.modeLabel, { color: colors.foreground }]}>
              {mode === "dark" ? "Modo oscuro" : "Modo claro"}
            </Text>
            <Text style={[styles.modeSub, { color: colors.mutedForeground }]}>
              {mode === "dark" ? "Fondo oscuro, ideal para la noche" : "Fondo claro, ideal para el día"}
            </Text>
          </View>
        </View>
        <Switch
          value={mode === "dark"}
          onValueChange={(v) => {
            setMode(v ? "dark" : "light");
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          trackColor={{ false: colors.surface3, true: `${colors.primary}80` }}
          thumbColor={mode === "dark" ? colors.primary : colors.mutedForeground}
        />
      </View>
    </ScrollView>
  );
}

// ─── Información tab ───────────────────────────────────────────────────────
function InformacionTab() {
  const colors = useColors();

  const BRAND_BLUE = "#1a3a5c";
  const ACCENT     = "#2563eb";

  return (
    <ScrollView
      contentContainerStyle={[styles.tabContent, { gap: 0, paddingBottom: Platform.OS === "web" ? 120 : 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Corporate hero ─────────────────────────────────────────── */}
      <LinearGradient
        colors={["#0b1e36", "#0d2547", "#0f2e58"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.infoHero}
      >
        {/* Logotipo / monograma */}
        <View style={styles.infoLogoWrap}>
          <LinearGradient
            colors={[ACCENT, "#1d4ed8"]}
            style={styles.infoLogoGrad}
          >
            <Text style={styles.infoLogoTxt}>S</Text>
          </LinearGradient>
        </View>

        <Text style={styles.infoCompany}>SisysErint</Text>
        <Text style={styles.infoSlogan}>Soluciones Tecnológicas Empresariales</Text>

        {/* Divider */}
        <View style={[styles.infoDividerH, { backgroundColor: "rgba(255,255,255,0.12)", marginTop: 20 }]} />

        {/* App name badge */}
        <View style={styles.infoAppBadge}>
          <Feather name="globe" size={12} color="rgba(255,255,255,0.55)" />
          <Text style={styles.infoAppBadgeTxt}>FIFA World Cup 2026 — Quiniela</Text>
        </View>
      </LinearGradient>

      {/* ── Info cards ─────────────────────────────────────────────── */}
      <View style={[styles.infoSection, { backgroundColor: colors.background }]}>

        {/* Developer */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.infoCardIcon, { backgroundColor: `${ACCENT}18`, borderColor: `${ACCENT}30` }]}>
            <Feather name="code" size={18} color={ACCENT} />
          </View>
          <View style={styles.infoCardBody}>
            <Text style={[styles.infoCardLabel, { color: colors.mutedForeground }]}>DESARROLLADO POR</Text>
            <Text style={[styles.infoCardValue, { color: colors.foreground }]}>Cristian A. Espinoza</Text>
            <Text style={[styles.infoCardSub, { color: colors.mutedForeground }]}>Desarrollador de Software</Text>
          </View>
        </View>

        {/* Contact */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.infoCardIcon, { backgroundColor: `${ACCENT}18`, borderColor: `${ACCENT}30` }]}>
            <Feather name="mail" size={18} color={ACCENT} />
          </View>
          <View style={styles.infoCardBody}>
            <Text style={[styles.infoCardLabel, { color: colors.mutedForeground }]}>CONTACTO</Text>
            <Text style={[styles.infoCardValue, { color: colors.foreground }]}>soporte@sisyserint.com</Text>
            <Text style={[styles.infoCardSub, { color: colors.mutedForeground }]}>Soporte técnico y atención al cliente</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={[styles.infoDividerH, { backgroundColor: colors.border, marginVertical: 4 }]} />

        {/* Copyright */}
        <View style={[styles.infoCopyright, { borderColor: colors.border }]}>
          <Feather name="shield" size={13} color={colors.mutedForeground} />
          <Text style={[styles.infoCopyrightTxt, { color: colors.mutedForeground }]}>
            © 2026 SisysErint — Todos los derechos reservados
          </Text>
        </View>

        {/* Legal note */}
        <Text style={[styles.infoLegal, { color: colors.mutedForeground }]}>
          Esta aplicación y su contenido son propiedad exclusiva de SisysErint.
          Queda prohibida su reproducción total o parcial sin autorización expresa.
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────
export default function SystemScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<SystemTab>("perfil");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { markSeen, messages: allMessages } = useMessages();
  const isFocused = React.useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      isFocused.current = true;
      markSeen();
      return () => { isFocused.current = false; };
    }, [markSeen])
  );

  React.useEffect(() => {
    if (isFocused.current) markSeen();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMessages?.length]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <View style={styles.headerTitleRow}>
          <Feather name="settings" size={20} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Sistema</Text>
        </View>
        <View style={styles.tabRow}>
          {SYSTEM_TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setActiveTab(t.key)}
              style={[
                styles.tab,
                {
                  borderColor: activeTab === t.key ? colors.primary : "transparent",
                  backgroundColor: activeTab === t.key ? `${colors.primary}18` : colors.surface2,
                },
              ]}
            >
              <Feather
                name={t.icon as any}
                size={13}
                color={activeTab === t.key ? colors.primary : colors.mutedForeground}
              />
              <Text style={[styles.tabText, { color: activeTab === t.key ? colors.primary : colors.mutedForeground }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {activeTab === "perfil" && <PerfilTab />}
      {activeTab === "mensajes" && <MensajesTab />}
      {activeTab === "apariencia" && <AparienciaTab />}
      {activeTab === "informacion" && <InformacionTab />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, gap: 14 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  tabRow: { flexDirection: "row", gap: 6 },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    paddingHorizontal: 4, paddingVertical: 7, borderRadius: 4, borderWidth: 1,
  },
  tabText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  // Perfil
  tabContent: { padding: 20, gap: 14, paddingBottom: Platform.OS === "web" ? 120 : 100 },
  profileTop: { alignItems: "center", gap: 8, paddingVertical: 8 },
  avatarRing: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 28, fontFamily: "Inter_700Bold" },
  profileName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  profileEmail: { fontSize: 13, fontFamily: "Inter_400Regular" },
  adminBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderRadius: 4, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, marginTop: 2,
  },
  adminTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  ptsCard: {
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10,
    flexDirection: "row", alignItems: "center", gap: 10, overflow: "hidden",
  },
  ptsNum: { fontSize: 28, fontFamily: "Inter_700Bold", lineHeight: 34 },
  ptsLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1, marginBottom: -4 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statBox: {
    flex: 1, minWidth: "28%", borderRadius: 12, borderWidth: 1, padding: 12,
    alignItems: "center", gap: 4,
  },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  menuCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  menuItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 16, borderBottomWidth: 1,
  },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  // Compose
  composeBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10,
    justifyContent: "center",
  },
  composeBtnTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  composeCard: {
    borderRadius: 12, borderWidth: 1.5, padding: 16, gap: 10,
  },
  composeHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  composeTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderRadius: 6, borderWidth: 1, paddingVertical: 8,
  },
  typeTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  input: {
    borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, fontFamily: "Inter_400Regular",
  },
  inputMulti: { height: 100 },
  sendBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 8, paddingVertical: 12,
  },
  sendTxt: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  // Empty
  centeredTab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 40, paddingVertical: 40 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  // Mensajes
  msgCard: { borderRadius: 10, borderWidth: 1, borderLeftWidth: 3, padding: 13, gap: 6 },
  msgHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  msgHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, flexWrap: "wrap" },
  msgTypeBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    borderRadius: 4, borderWidth: 1, paddingHorizontal: 5, paddingVertical: 2,
  },
  msgTypeTxt: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  msgFrom: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  adminPill: { borderRadius: 4, borderWidth: 1, paddingHorizontal: 5, paddingVertical: 1 },
  adminPillTxt: { fontSize: 9, fontFamily: "Inter_700Bold" },
  msgDate: { fontSize: 9, fontFamily: "Inter_400Regular", flexShrink: 0 },
  msgSubject: { fontSize: 13, fontFamily: "Inter_700Bold" },
  msgContent: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  // Apariencia
  modeRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderRadius: 14, borderWidth: 1, padding: 16,
  },
  modeLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, marginRight: 12 },
  modeLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modeSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  // Información
  infoHero: {
    alignItems: "center", paddingHorizontal: 28, paddingTop: 28, paddingBottom: 24, gap: 4,
  },
  infoLogoWrap: {
    marginBottom: 8,
    shadowColor: "#2563eb", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 12, elevation: 10,
  },
  infoLogoGrad: {
    width: 48, height: 48, borderRadius: 13,
    alignItems: "center", justifyContent: "center",
  },
  infoLogoTxt: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff", lineHeight: 32 },
  infoCompany: {
    fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff",
    letterSpacing: 0.5, marginTop: 2,
  },
  infoSlogan: {
    fontSize: 11, fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.55)", letterSpacing: 0.3, textAlign: "center",
  },
  infoDividerH: { height: 1, width: "100%", marginVertical: 0 },
  infoAppBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  infoAppBadgeTxt: {
    fontSize: 11, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.55)",
  },
  infoSection: { padding: 20, gap: 12 },
  infoCard: {
    flexDirection: "row", alignItems: "center", gap: 16,
    borderRadius: 14, borderWidth: 1, padding: 16,
  },
  infoCardIcon: {
    width: 46, height: 46, borderRadius: 12, borderWidth: 1,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  infoCardBody: { flex: 1, gap: 2 },
  infoCardLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  infoCardValue: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  infoCardSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  infoCopyright: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 14, borderTopWidth: 1,
  },
  infoCopyrightTxt: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  infoLegal: {
    fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 17,
    textAlign: "center", paddingHorizontal: 8, paddingBottom: 8,
  },
});
