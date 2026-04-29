export const options = {
  title: "Hartă voluntari",
  headerBackVisible: false,
  gestureEnabled: false,
};

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Callout, Marker, Region } from "react-native-maps";

const GET_ALERTS_URL =
  "https://konfeejvlrpykdwrqrkg.supabase.co/functions/v1/get-alert";

const UPDATE_ALERT_STATUS_URL =
  "https://konfeejvlrpykdwrqrkg.supabase.co/functions/v1/update-alert-status";

const GET_STATS_URL =
  "https://konfeejvlrpykdwrqrkg.supabase.co/functions/v1/get-volunteer-stats";

const SUPABASE_URL = "https://konfeejvlrpykdwrqrkg.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvbmZlZWp2bHJweWtkd3JxcmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3Nzk2NjMsImV4cCI6MjA4NzM1NTY2M30.g9Ho7Hhekce2pYcrzrXesUFSRBLbAM-S9701COssu7s";

const ROMANIA_FALLBACK_REGION: Region = {
  latitude: 45.9432,
  longitude: 24.9668,
  latitudeDelta: 4.5,
  longitudeDelta: 4.5,
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

type Member = {
  isVerified: boolean;
  role: string;
  institution?: string;
  fullName?: string;
  email?: string;
};

type AlertItem = {
  id: string;
  created_at: string;
  status: string;
  type_id?: string;
  type_label: string;
  icon: string;
  severity: number;
  lat: number;
  lng: number;
  required_role: string;
  description?: string | null;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  assigned_at?: string | null;
  resolution_note?: string | null;
};

export default function VolunteerMapScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView | null>(null);
  const [topVolunteers, setTopVolunteers] = useState<any[]>([]);
  const [member, setMember] = useState<Member | null>(null);
  const [region, setRegion] = useState<Region>(ROMANIA_FALLBACK_REGION);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [currentCase, setCurrentCase] = useState<AlertItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [stats, setStats] = useState({
    cases_assigned: 0,
    cases_resolved: 0,
  });

  const [seenSet] = useState(() => new Set<string>());

  useEffect(() => {
    (async () => {
      try {
        const stay = await AsyncStorage.getItem("stay_logged_in");
        const raw = await AsyncStorage.getItem("auth_member");
        const parsed: Member | null = raw ? JSON.parse(raw) : null;

        if (stay !== "1" || !parsed?.isVerified || !parsed?.role) {
          router.replace("/");
          return;
        }

        setMember(parsed);

        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({});
          const nextRegion: Region = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.12,
            longitudeDelta: 0.12,
          };

          setRegion(nextRegion);

          setTimeout(() => {
            mapRef.current?.animateToRegion(nextRegion, 800);
          }, 300);
        }

        setLoading(false);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        Alert.alert("Eroare", `Nu pot porni harta: ${msg}`);
        router.replace("/");
      }
    })();
  }, [router]);

  async function fetchStats() {
    if (!member?.email) return;

    try {
      const res = await fetch(
        `${GET_STATS_URL}?email=${encodeURIComponent(member.email)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            apikey: SUPABASE_ANON_KEY,
          },
        }
      );

      const raw = await res.text();
      let data: any = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {}

      if (res.ok && data?.stats) {
        setStats({
          cases_assigned: data.stats.cases_assigned ?? 0,
          cases_resolved: data.stats.cases_resolved ?? 0,
        });
      }
    } catch (e) {
      console.log("Stats error:", e);
    }
  }
async function openProfile() {
  if (!member) {
    Alert.alert("Eroare", "Nu ești logat ca voluntar.");
    return;
  }

  const safeEmail =
    member.email && member.email.trim()
      ? member.email.trim()
      : `${member.role || "volunteer"}-${member.fullName || "user"}@voluntar.local`
          .toLowerCase()
          .replace(/\s+/g, "-");

  setProfileVisible(true);
  setHistoryLoading(true);

  try {
    const resHistory = await fetch(
      `${SUPABASE_URL}/rest/v1/volunteer_history?volunteer_email=eq.${encodeURIComponent(
        safeEmail
      )}&order=created_at.desc`,
      {
        method: "GET",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    const historyData = await resHistory.json().catch(() => []);
    setHistory(Array.isArray(historyData) ? historyData : []);

    const resTop = await fetch(`${SUPABASE_URL}/rest/v1/top_volunteers`, {
      method: "GET",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    const topData = await resTop.json().catch(() => []);
    setTopVolunteers(Array.isArray(topData) ? topData : []);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    Alert.alert("Eroare", `Nu pot încărca profilul: ${msg}`);
  } finally {
    setHistoryLoading(false);
  }
}
  async function refreshAlerts() {
    if (!member?.role) return;

    try {
      const res = await fetch(
        `${GET_ALERTS_URL}?role=${encodeURIComponent(member.role)}&status=open`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            apikey: SUPABASE_ANON_KEY,
          },
        }
      );

      const raw = await res.text();
      let data: any = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {}

      if (!res.ok) {
        Alert.alert("Eroare", data?.message ?? raw ?? "Nu pot încărca alertele.");
        return;
      }

      const next: AlertItem[] = Array.isArray(data?.alerts) ? data.alerts : [];

      if (!currentCase) {
        setAlerts(next);
      }

      const newOnes = next.filter((a) => a?.id && !seenSet.has(a.id));

      if (!currentCase && newOnes.length > 0) {
        const a = newOnes[0];
        newOnes.forEach((x) => seenSet.add(x.id));

        Alert.alert(
          "Alertă nouă",
          `${a.icon} ${a.type_label}\nGravitate: ${a.severity}/5`
        );

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Alertă nouă",
            body: `${a.icon} ${a.type_label} • Gravitate ${a.severity}/5`,
            sound: true,
          },
          trigger: null,
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Eroare", `Nu pot încărca alertele: ${msg}`);
    }
  }

  async function updateAlertStatus(
    action: "assign" | "resolve",
    alert: AlertItem,
    resolution_note = ""
  ) {
    if (!member) {
      Alert.alert("Eroare", "Nu ești logat ca voluntar.");
      return;
    }

    const safeEmail =
      member.email && member.email.trim()
        ? member.email.trim()
        : `${member.role || "volunteer"}-${member.fullName || "user"}@voluntar.local`
            .toLowerCase()
            .replace(/\s+/g, "-");

    const safeName =
      member.fullName && member.fullName.trim()
        ? member.fullName.trim()
        : "Voluntar";

    setActionLoading(true);

    try {
      const res = await fetch(UPDATE_ALERT_STATUS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          action,
          alert_id: alert.id,
          volunteer_email: safeEmail,
          volunteer_name: safeName,
          resolution_note,
        }),
      });

      const raw = await res.text();
      let data: any = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {}

      if (!res.ok) {
        Alert.alert("Eroare", data?.message ?? raw ?? "Acțiunea nu a reușit.");
        return;
      }

      if (action === "assign") {
        const assignedAlert = data?.alert ?? {
          ...alert,
          status: "assigned",
          assigned_to: safeEmail,
          assigned_to_name: safeName,
          assigned_at: new Date().toISOString(),
        };

        setCurrentCase(assignedAlert);
        setAlerts([]);

        await fetchStats();

        Alert.alert(
          "Caz preluat",
          `${alert.icon} ${alert.type_label}\nTe ocupi acum de acest caz.`
        );
      }

      if (action === "resolve") {
        Alert.alert("Caz finalizat", "Cazul a fost marcat ca rezolvat.");
        setCurrentCase(null);

        await fetchStats();
        await refreshAlerts();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Eroare", `Nu pot actualiza cazul: ${msg}`);
    } finally {
      setActionLoading(false);
    }
  }

  function confirmAssign(alert: AlertItem) {
    if (currentCase) {
      Alert.alert(
        "Ai deja un caz activ",
        "Finalizează cazul curent înainte să preiei altul."
      );
      return;
    }

    Alert.alert(
      "Preiei cazul?",
      `${alert.icon} ${alert.type_label}\nGravitate: ${alert.severity}/5`,
      [
        { text: "Anulează", style: "cancel" },
        {
          text: "Preiau cazul",
          onPress: () => updateAlertStatus("assign", alert),
        },
      ]
    );
  }

  function confirmResolve() {
    if (!currentCase) return;

    Alert.prompt(
      "Finalizezi cazul?",
      "Scrie pe scurt ce s-a întâmplat:",
      [
        { text: "Anulează", style: "cancel" },
        {
          text: "Finalizează",
          style: "destructive",
          onPress: (text?: string) => {
            updateAlertStatus("resolve", currentCase, text || "");
          },
        },
      ],
      "plain-text",
      ""
    );
  }

  useEffect(() => {
    if (!member?.role) return;

    let channel: any;

    (async () => {
      try {
        await Notifications.requestPermissionsAsync();

        channel = supabase
          .channel(`alerts-${member.role}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "alerts",
            },
            async () => {
              await refreshAlerts();
              await fetchStats();
            }
          )
          .subscribe();

        await refreshAlerts();
        await fetchStats();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.log("Realtime setup error:", msg);
      }
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [member?.role, member?.email, currentCase?.id]);

  useEffect(() => {
    if (!member?.role) return;

    const t = setInterval(async () => {
      await refreshAlerts();
      await fetchStats();
    }, 30000);

    return () => clearInterval(t);
  }, [member?.role, member?.email, currentCase?.id]);

  async function recenterToMyLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert("Locație indisponibilă", "Nu am acces la locația dispozitivului.");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const nextRegion: Region = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.12,
        longitudeDelta: 0.12,
      };

      setRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 800);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Eroare", `Nu pot centra harta: ${msg}`);
    }
  }

  function zoomIn() {
    const nextRegion: Region = {
      ...region,
      latitudeDelta: Math.max(region.latitudeDelta / 2, 0.002),
      longitudeDelta: Math.max(region.longitudeDelta / 2, 0.002),
    };

    setRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 250);
  }

  function zoomOut() {
    const nextRegion: Region = {
      ...region,
      latitudeDelta: Math.min(region.latitudeDelta * 2, 80),
      longitudeDelta: Math.min(region.longitudeDelta * 2, 80),
    };

    setRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 250);
  }

  async function logout() {
    await AsyncStorage.removeItem("auth_member");
    await AsyncStorage.removeItem("stay_logged_in");
    router.replace("/");
  }

  const visibleAlerts = currentCase ? [currentCase] : alerts;

  if (loading || !member) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.centerText}>Se încarcă harta...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
  <View style={{ flex: 1 }}>
    <Text style={styles.mapKicker}>VOLUNTEER MODE</Text>
    <Text style={styles.title}>Hartă voluntari</Text>

    <Text style={styles.subtitle}>
      {member.fullName ? `${member.fullName} • ` : ""}
      {member.institution || "ONG"}
    </Text>

    <Text style={styles.statsText}>
      {stats.cases_resolved} finalizate / {stats.cases_assigned} preluate
    </Text>
  </View>

  <View style={styles.topActions}>
    <TouchableOpacity style={styles.profileBtn} onPress={openProfile}>
      <Text style={styles.profileBtnText}>Profil</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
      <Text style={styles.logoutBtnText}>Logout</Text>
    </TouchableOpacity>
  </View>
</View>

      {currentCase && (
        <View style={styles.currentCaseBanner}>
          <Text style={styles.currentCaseTitle}>Cazul meu</Text>
          <Text style={styles.currentCaseText}>
            {currentCase.icon} {currentCase.type_label} • Gravitate{" "}
            {currentCase.severity}/5
          </Text>

          {!!currentCase.description && (
            <Text style={styles.currentCaseDesc}>{currentCase.description}</Text>
          )}
        </View>
      )}

      <MapView
        ref={r => { mapRef.current = r; }}
        style={{ flex: 1 }}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation
        showsMyLocationButton
      >
        {visibleAlerts.map((a) => (
          <Marker
            key={a.id}
            coordinate={{ latitude: a.lat, longitude: a.lng }}
          >
            <Callout onPress={() => !currentCase && confirmAssign(a)}>
              <View style={{ width: 250 }}>
                <Text style={{ fontWeight: "900", marginBottom: 4 }}>
                  {a.icon} {a.type_label}
                </Text>

                <Text>Rol: {a.required_role}</Text>
                <Text>Gravitate: {a.severity}/5</Text>

                {!!a.description && <Text>{a.description}</Text>}

                {!currentCase && (
                  <Text style={{ marginTop: 8, fontWeight: "900" }}>
                    Apasă aici pentru a prelua cazul
                  </Text>
                )}
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <View style={styles.mapControls}>
        <TouchableOpacity style={styles.mapControlBtn} onPress={zoomIn}>
          <Text style={styles.mapControlText}>＋</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.mapControlBtn} onPress={zoomOut}>
          <Text style={styles.mapControlText}>－</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.mapControlBtnWide} onPress={recenterToMyLocation}>
          <Text style={styles.mapControlText}>📍 Locația mea</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPanel}>
        {currentCase ? (
          <TouchableOpacity
            style={[styles.resolveBtn, actionLoading && styles.disabledBtn]}
            onPress={confirmResolve}
            disabled={actionLoading}
          >
            <Text style={styles.bigBtnText}>
              {actionLoading ? "Se procesează..." : "Finalizează cazul"}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.refreshBtn} onPress={refreshAlerts}>
              <Text style={styles.refreshText}>🔄 Refresh</Text>
            </TouchableOpacity>

            <Text style={styles.countText}>
              Alerte valabile: {alerts.length}
            </Text>
          </>
        )}
      </View>
     <Modal visible={profileVisible} animationType="slide">
  <View style={styles.profileContainer}>
    <View style={styles.profileHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.mapKicker}>PROFIL VOLUNTAR</Text>
        <Text style={styles.profileTitle}>
          {member?.fullName || "Voluntar"}
        </Text>
        <Text style={styles.profileSubtitle}>
          {member?.institution || "ONG"} • respondenți validați
        </Text>
      </View>

      <TouchableOpacity
        style={styles.profileCloseBtn}
        onPress={() => setProfileVisible(false)}
      >
        <Text style={styles.profileCloseText}>Închide</Text>
      </TouchableOpacity>
    </View>

    <View style={styles.profileStatsRow}>
      <View style={styles.profileStatCard}>
        <Text style={styles.profileStatNumber}>{stats.cases_assigned}</Text>
        <Text style={styles.profileStatLabel}>Preluate</Text>
      </View>

      <View style={styles.profileStatCard}>
        <Text style={styles.profileStatNumber}>{stats.cases_resolved}</Text>
        <Text style={styles.profileStatLabel}>Finalizate</Text>
      </View>
    </View>

    {historyLoading ? (
      <View style={styles.profileLoading}>
        <ActivityIndicator />
        <Text style={styles.profileLoadingText}>Se încarcă profilul...</Text>
      </View>
    ) : (
      <ScrollView contentContainerStyle={styles.profileContent}>
        <Text style={styles.sectionHeading}>Istoric intervenții</Text>

        {history.length === 0 ? (
          <Text style={styles.emptyHistory}>
            Nu există intervenții în istoric încă.
          </Text>
        ) : (
          history.map((item) => (
            <View key={item.id} style={styles.historyCard}>
              <View style={styles.historyTop}>
                <Text style={styles.historyMain}>
                  {item.icon} {item.type_label}
                </Text>
                <Text style={styles.severityBadge}>
                  {item.severity}/5
                </Text>
              </View>

              {!!item.description && (
                <Text style={styles.historyDesc}>
                  Cerere: {item.description}
                </Text>
              )}

              {!!item.resolution_note && (
                <Text style={styles.historyNote}>
                  Rezolvare: {item.resolution_note}
                </Text>
              )}
            </View>
          ))
        )}

        <Text style={styles.sectionHeading}>Top voluntari</Text>

        {topVolunteers.length === 0 ? (
          <Text style={styles.emptyHistory}>
            Nu există voluntari în clasament încă.
          </Text>
        ) : (
          topVolunteers.map((v, i) => (
            <View key={v.email} style={styles.leaderCard}>
              <View style={styles.rankCircle}>
                <Text style={styles.rankText}>#{i + 1}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.leaderName}>
                  {v.full_name || "Voluntar"}
                </Text>
                <Text style={styles.leaderSubtext}>
                  intervenții finalizate
                </Text>
              </View>

              <Text style={styles.leaderScore}>
                {v.cases_resolved}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    )}
  </View>
</Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1C2D" },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B1C2D",
  },
  centerText: { marginTop: 10, color: "#A9C1D9" },

  topBar: {
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0B1C2D",
    borderBottomWidth: 1,
    borderBottomColor: "#122B40",
  },

  mapKicker: {
    color: "#7EC8E3",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 3,
  },

  title: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  subtitle: { color: "#A9C1D9", marginTop: 4, fontSize: 12 },
  statsText: {
    color: "#7EC8E3",
    fontSize: 12,
    marginTop: 3,
    fontWeight: "800",
  },

  topActions: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 10,
  },

  profileBtn: {
    backgroundColor: "#122B40",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F4B68",
  },
  profileBtnText: { color: "#FFFFFF", fontWeight: "900", fontSize: 12 },

  logoutBtn: {
    backgroundColor: "#E63946",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  logoutBtnText: { color: "#FFFFFF", fontWeight: "900", fontSize: 12 },

  btn: {
    backgroundColor: "#E63946",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginLeft: 10,
  },
  btnText: { color: "#FFFFFF", fontWeight: "900" },

  currentCaseBanner: {
    backgroundColor: "#122B40",
    borderBottomWidth: 1,
    borderBottomColor: "#E63946",
    padding: 12,
  },
  currentCaseTitle: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },
  currentCaseText: { color: "#FFFFFF", marginTop: 4, fontWeight: "700" },
  currentCaseDesc: { color: "#A9C1D9", marginTop: 4 },

  mapControls: {
    position: "absolute",
    right: 12,
    top: 175,
    gap: 10,
  },
  mapControlBtn: {
    backgroundColor: "rgba(11,28,45,0.92)",
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  mapControlBtnWide: {
    backgroundColor: "rgba(11,28,45,0.92)",
    minWidth: 48,
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  mapControlText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  bottomPanel: {
    padding: 14,
    backgroundColor: "#0B1C2D",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#122B40",
  },
  refreshBtn: {
    backgroundColor: "#122B40",
    borderWidth: 1,
    borderColor: "#1F4B68",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  refreshText: { color: "#FFFFFF", fontWeight: "800" },
  countText: { color: "#A9C1D9", fontWeight: "800" },

  resolveBtn: {
    flex: 1,
    backgroundColor: "#E63946",
    paddingVertical: 17,
    borderRadius: 16,
    alignItems: "center",
  },
  bigBtnText: { color: "#FFFFFF", fontWeight: "900", fontSize: 17 },
  disabledBtn: { opacity: 0.6 },

  profileContainer: {
    flex: 1,
    backgroundColor: "#0B1C2D",
    paddingTop: 55,
  },
  profileHeader: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#122B40",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  profileTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  profileSubtitle: {
    color: "#A9C1D9",
    marginTop: 4,
    fontSize: 13,
  },
  profileStats: {
    color: "#A9C1D9",
    marginTop: 4,
    fontWeight: "800",
  },
  profileCloseBtn: {
    backgroundColor: "#E63946",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  profileCloseText: { color: "#FFFFFF", fontWeight: "900" },

  profileStatsRow: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
  },
  profileStatCard: {
    flex: 1,
    backgroundColor: "#122B40",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1F4B68",
  },
  profileStatNumber: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
  },
  profileStatLabel: {
    color: "#A9C1D9",
    marginTop: 4,
    fontWeight: "800",
  },

  profileLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  profileLoadingText: {
    color: "#A9C1D9",
    marginTop: 10,
  },
  profileContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeading: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 18,
    marginBottom: 10,
    marginTop: 6,
  },
  emptyHistory: {
    color: "#A9C1D9",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 20,
    fontWeight: "700",
  },
  historyCard: {
    backgroundColor: "#122B40",
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1F4B68",
  },
  historyTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  historyMain: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },
  severityBadge: {
    color: "#FFFFFF",
    backgroundColor: "#E63946",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    fontWeight: "900",
    fontSize: 12,
  },
  historyText: {
    color: "#A9C1D9",
    marginBottom: 4,
  },
  historyDesc: {
    color: "#A9C1D9",
    marginTop: 6,
    lineHeight: 18,
  },
  historyNote: {
    color: "#7CFF9B",
    marginTop: 8,
    fontWeight: "800",
    lineHeight: 18,
  },

  leaderCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#122B40",
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1F4B68",
  },
  rankCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E63946",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rankText: { color: "#FFFFFF", fontWeight: "900", fontSize: 12 },
  leaderName: { color: "#FFFFFF", fontWeight: "900" },
  leaderSubtext: {
    color: "#A9C1D9",
    fontSize: 12,
    marginTop: 2,
  },
  leaderScore: {
    color: "#7CFF9B",
    fontWeight: "900",
    fontSize: 20,
  },
});