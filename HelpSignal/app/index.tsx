import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function HomeScreen() {
  const router = useRouter();

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(18)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.025,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Animated.View
        style={[
          styles.header,
          {
            opacity: fade,
            transform: [{ translateY: slide }],
          },
        ]}
      >
        <View style={styles.badge}>
          <Text style={styles.badgeText}>LIVE COMMUNITY RESPONSE</Text>
        </View>

        <Text style={styles.logo}>SilentSignal</Text>
        <Text style={styles.tagline}>
          Rapid. Eficient. Îți salvează viața.
        </Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.actions,
          {
            opacity: fade,
            transform: [{ translateY: slide }],
          },
        ]}
      >
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <TouchableOpacity
            activeOpacity={0.82}
            style={styles.emergencyBtn}
            onPress={() => router.push("/victimlocation")}
          >
            <Text style={styles.emergencyText}>🆘 Am nevoie de ajutor</Text>
            <Text style={styles.emergencySubtext}>Trimite un semnal în câteva secunde</Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          activeOpacity={0.82}
          style={styles.volunteerBtn}
          onPress={() => router.push("/VolunteerLogin")}
        >
          <Text style={styles.volunteerText}>🤝 Sunt voluntar</Text>
          <Text style={styles.volunteerSubtext}>Acces doar pentru respondenți validați</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: fade }]}>
        <Text style={styles.footerText}>
          Conectăm persoanele aflate în nevoie cu respondenți verificați.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1C2D",
    paddingHorizontal: 20,
    justifyContent: "space-between",
  },

  header: {
    marginTop: 105,
  },

  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#122B40",
    borderWidth: 1,
    borderColor: "#1F4B68",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 16,
  },

  badgeText: {
    color: "#7EC8E3",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  logo: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: 1,
  },

  tagline: {
    color: "#A9C1D9",
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
  },

  actions: {
    gap: 16,
  },

  emergencyBtn: {
    backgroundColor: "#E63946",
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#E63946",
    shadowOpacity: 0.45,
    shadowRadius: 14,
  },

  emergencyText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 17,
  },

  emergencySubtext: {
    color: "#FFE1E4",
    fontSize: 12,
    marginTop: 5,
    fontWeight: "700",
  },

  volunteerBtn: {
    backgroundColor: "#122B40",
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1F4B68",
  },

  volunteerText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },

  volunteerSubtext: {
    color: "#A9C1D9",
    fontSize: 12,
    marginTop: 5,
    fontWeight: "700",
  },

  footer: {
    marginBottom: 40,
  },

  footerText: {
    color: "#6C8CA6",
    fontSize: 12,
    textAlign: "center",
  },
});