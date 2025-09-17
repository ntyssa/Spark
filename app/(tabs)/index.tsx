import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

/** ---------------- Types ---------------- */
type Group = {
  id: string;
  name: string;
  createdAt: number;
  expiresAt: number;
  lat: number;
  lng: number;
  anonymousAllowed: boolean;
  icebreaker?: string;
};
type Message = {
  id: string;
  text: string;
  createdAt: number;
  displayName: string;
  anonymous: boolean;
};

/** ---------------- Helpers ---------------- */
const uuid = () => Math.random().toString(36).slice(2, 9);

function timeLeft(expiryTs: number) {
  const diff = Math.max(0, expiryTs - Date.now());
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return `${hours}h ${minutes}m ${seconds}s`;
}

const ICEBREAKERS = [
  "Share a song you're vibing to right now.",
  "What's the one emoji that describes your day?",
  "Two truths and a lie — go!",
  "What's your go-to comfort food?",
  "If you had 10 minutes of fame, how would you use it?",
];

async function getDeviceLocation() {
  let { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Permission to access location was denied");
  }
  let location = await Location.getCurrentPositionAsync({});
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

/** ---------------- In-memory Backend ---------------- */
const backend: {
  groups: Group[];
  messages: Record<string, Message[]>;
  createGroup: (g: Group) => Group;
  listGroupsNearby: (lat: number, lng: number, radiusKm?: number) => Group[];
  postMessage: (groupId: string, message: Message) => Message;
  getMessages: (groupId: string) => Message[];
  removeExpired: () => void;
} = {
  groups: [],
  messages: {},
  createGroup(group) {
    this.groups.push(group);
    this.messages[group.id] = [];
    return group;
  },
  listGroupsNearby(lat, lng, radiusKm = 50) {
    return this.groups.filter((g) => {
      const dLat = g.lat - lat;
      const dLng = g.lng - lng;
      return Math.sqrt(dLat * dLat + dLng * dLng) * 111 <= radiusKm;
    });
  },
  postMessage(groupId, message) {
    if (!this.messages[groupId]) this.messages[groupId] = [];
    this.messages[groupId].push(message);
    return message;
  },
  getMessages(groupId) {
    return this.messages[groupId] || [];
  },
  removeExpired() {
    const now = Date.now();
    this.groups = this.groups.filter((g) => g.expiresAt > now);
    Object.keys(this.messages).forEach((groupId) => {
      const g = this.groups.find((x) => x.id === groupId);
      if (!g) delete this.messages[groupId];
    });
  },
};
setInterval(() => backend.removeExpired(), 30000);

/** ---------------- Main Page ---------------- */
export default function Page(): JSX.Element {
  return (
    <LinearGradient
      colors={["#fff6f6", "#ffe6e6", "#f9fafc"]}
      style={{ flex: 1 }}
    >
      <SparkApp />
    </LinearGradient>
  );
}

/** ---------------- App Component ---------------- */
function SparkApp() {
  const [view, setView] = useState<"discover" | "create" | "chat">("discover");
  const [groups, setGroups] = useState<Group[]>([]);
  const [myLocation, setMyLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [nameHandle, setNameHandle] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const loc = await getDeviceLocation();
        setMyLocation(loc);
        loadNearby(loc);
      } catch (e) {
        // Fallback: Manila center if permission denied or error
        setMyLocation({ latitude: 14.676, longitude: 121.0437 });
        loadNearby({ latitude: 14.676, longitude: 121.0437 });
      }
    })();

    const t: ReturnType<typeof setInterval> = setInterval(() => {
      if (myLocation) loadNearby(myLocation);
    }, 2000);
    return () => clearInterval(t);
  }, [myLocation]);

  function loadNearby(loc: { latitude: number; longitude: number }) {
    backend.removeExpired();
    const list = backend
      .listGroupsNearby(loc.latitude, loc.longitude, 50)
      .sort((a, b) => a.expiresAt - b.expiresAt);
    setGroups(list);
  }

  function openCreate() {
    setView("create");
  }

  function openDiscover() {
    setView("discover");
    setSelectedGroup(null);
  }

  function openChat(group: Group) {
    setSelectedGroup(group);
    setView("chat");
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔥 Spark</Text>
        <Text style={styles.subtitle}>Connections that light up, then fade.</Text>
      </View>

      {view === "discover" && (
        <DiscoverView
          groups={groups}
          onCreate={openCreate}
          onJoin={openChat}
          myLocation={myLocation}
        />
      )}

      {view === "create" && (
        <CreateGroupView
          onBack={openDiscover}
          onCreated={(g) => {
            setSelectedGroup(g);
            setView("chat");
            if (myLocation) loadNearby(myLocation);
          }}
          myLocation={myLocation}
        />
      )}

      {view === "chat" && selectedGroup && (
        <ChatView
          group={selectedGroup}
          onBack={() => setView("discover")}
          nameHandle={nameHandle}
          setNameHandle={setNameHandle}
        />
      )}
    </SafeAreaView>
  );
}

/** ---------------- Discover View ---------------- */
function DiscoverView({
  groups,
  onCreate,
  onJoin,
  myLocation,
}: {
  groups: Group[];
  onCreate: () => void;
  onJoin: (g: Group) => void;
  myLocation: { latitude: number; longitude: number } | null;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.discoverHeader}>
        <Text style={styles.h2}>Nearby Sparks</Text>
        <TouchableOpacity onPress={onCreate} style={styles.primaryBtn} activeOpacity={0.8}>
          <Text style={{ color: "#fff", fontWeight: "600" }}>+ New Spark</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(i) => i.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No Sparks nearby — create one!
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => onJoin(item)}
            activeOpacity={0.85}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardMeta}>Expires in {timeLeft(item.expiresAt)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={item.anonymousAllowed ? styles.anonAllowed : styles.namedOnly}>
                {item.anonymousAllowed ? "Anonymous allowed" : "Named only"}
              </Text>
              <Text style={styles.distanceText}>{formatDistance(item, myLocation)}</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      <View style={{ marginTop: 16 }}>
        <Text style={styles.tipText}>
          Tip: Sparks auto-expire 24 hours after creation.
        </Text>
      </View>
    </View>
  );
}

function formatDistance(g: Group | null, loc: { latitude: number; longitude: number } | null) {
  if (!loc || !g) return "";
  const dLat = g.lat - loc.latitude;
  const dLng = g.lng - loc.longitude;
  const km = Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 111);
  return `${km} km away`;
}

/** ---------------- Create Group View ---------------- */
function CreateGroupView({
  onBack,
  onCreated,
  myLocation,
}: {
  onBack: () => void;
  onCreated: (g: Group) => void;
  myLocation: { latitude: number; longitude: number } | null;
}) {
  const [name, setName] = useState("");
  const [anonAllowed, setAnonAllowed] = useState(true);
  const [icebreaker, setIcebreaker] = useState(ICEBREAKERS[0]);

  async function create() {
    let loc = myLocation;
    if (!loc) {
      try {
        loc = await getDeviceLocation();
      } catch {
        loc = { latitude: 14.676, longitude: 121.0437 };
      }
    }
    const id = uuid();
    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000;
    const group: Group = {
      id,
      name: name || "Untitled Spark",
      createdAt: now,
      expiresAt,
      lat: loc.latitude,
      lng: loc.longitude,
      anonymousAllowed: anonAllowed,
      icebreaker,
    };
    backend.createGroup(group);
    onCreated(group);
  }

  return (
    <View style={styles.section}>
      <TouchableOpacity onPress={onBack} style={{ marginBottom: 10 }}>
        <Text style={styles.backBtn}>◀ Back</Text>
      </TouchableOpacity>

      <Text style={styles.h2}>Create a Spark</Text>

      <TextInput
        placeholder="Spark name (e.g. 'Study grind room')"
        value={name}
        onChangeText={setName}
        style={styles.input}
        placeholderTextColor="#bbb"
      />

      <View style={styles.anonSwitchRow}>
        <Text>Allow anonymous posts</Text>
        <Switch value={anonAllowed} onValueChange={setAnonAllowed} />
      </View>

      <Text style={{ marginTop: 8 }}>Icebreaker</Text>
      <View style={{ marginVertical: 8 }}>
        <Text style={styles.icebreakerBox}>{icebreaker}</Text>
        <TouchableOpacity
          onPress={() =>
            setIcebreaker(ICEBREAKERS[Math.floor(Math.random() * ICEBREAKERS.length)])
          }
          style={{ marginTop: 6 }}
        >
          <Text style={styles.shuffleBtn}>Shuffle icebreaker</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={create} style={styles.primaryBtn} activeOpacity={0.8}>
        <Text style={{ color: "#fff", fontWeight: "600" }}>Create Spark</Text>
      </TouchableOpacity>
    </View>
  );
}

/** ---------------- Chat View ---------------- */
function ChatView({
  group,
  onBack,
  nameHandle,
  setNameHandle,
}: {
  group: Group;
  onBack: () => void;
  nameHandle: string;
  setNameHandle: (v: string) => void;
}) {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => backend.getMessages(group.id));
  const [anon, setAnon] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    tickRef.current = setInterval(() => {
      setMessages([...backend.getMessages(group.id)]);
    }, 800);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [group.id]);

  function send() {
    if (!text.trim()) return;
    if (anon && !group.anonymousAllowed) {
      Alert.alert("Anonymous posts are not allowed in this Spark.");
      return;
    }
    const msg: Message = {
      id: uuid(),
      text: text.trim(),
      createdAt: Date.now(),
      displayName: anon ? "Anonymous" : nameHandle || "Guest",
      anonymous: anon,
    };
    backend.postMessage(group.id, msg);
    setText("");
    setMessages(backend.getMessages(group.id));
  }

  return (
    <View style={styles.section}>
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backBtn}>◀ Sparks</Text>
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.chatTitle}>{group.name}</Text>
          <Text style={styles.chatExpires}>Expires in {timeLeft(group.expiresAt)}</Text>
        </View>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.chatBox}>
        <Text style={styles.icebreakerLabel}>
          <Text style={{ fontWeight: "600" }}>Icebreaker:</Text> {group.icebreaker}
        </Text>

        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          style={{ maxHeight: 320 }}
          renderItem={({ item }) => (
            <View
              style={[
                styles.message,
                item.anonymous ? styles.anonMessage : styles.namedMessage,
                { flexDirection: "row", alignItems: "flex-start" },
              ]}
            >
              <View style={styles.avatarCircle}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  {item.anonymous
                    ? "🤫"
                    : (item.displayName || "G").slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={item.anonymous ? styles.anonName : styles.namedName}>
                  {item.anonymous ? "Anonymous" : item.displayName}
                </Text>
                <Text style={styles.messageText}>{item.text}</Text>
                <Text style={styles.messageTime}>
                  {new Date(item.createdAt).toLocaleTimeString()}
                </Text>
              </View>
            </View>
          )}
        />

        <View style={{ marginTop: 10 }}>
          <TextInput
            placeholder="Your handle (optional)"
            value={nameHandle}
            onChangeText={setNameHandle}
            style={styles.input}
            placeholderTextColor="#bbb"
          />
          <View style={styles.inputRow}>
            <TextInput
              placeholder="Say something…"
              value={text}
              onChangeText={setText}
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              placeholderTextColor="#bbb"
            />
            <TouchableOpacity onPress={send} style={styles.primaryBtnSmall} activeOpacity={0.8}>
              <Text style={{ color: "#fff", fontWeight: "600" }}>Send</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.anonSwitchRow}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Switch value={anon} onValueChange={setAnon} />
              <Text style={{ marginLeft: 8 }}>
                {anon ? "Posting anonymously" : "Posting with handle"}
              </Text>
            </View>
            <Text style={styles.liveText}>Live updates • ephemeral</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/** ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 14, backgroundColor: "transparent" },
  header: {
    marginBottom: 18,
    alignItems: "center",
    paddingTop: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: "900",
    color: "#ff6b6b",
    letterSpacing: 1,
    textShadowColor: "#fff0",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: { color: "#888", fontSize: 15, marginTop: 2 },
  section: { flex: 1 },
  h2: { fontSize: 20, fontWeight: "800", color: "#222" },
  discoverHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  primaryBtn: {
    backgroundColor: "#ff6b6b",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    shadowColor: "#ff6b6b",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  primaryBtnSmall: {
    backgroundColor: "#ff6b6b",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    shadowColor: "#ff6b6b",
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 1,
  },
  card: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#f5dede",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#ff6b6b",
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: { fontSize: 17, fontWeight: "800", color: "#222" },
  cardMeta: { fontSize: 12, color: "#888", marginTop: 2 },
  anonAllowed: { fontSize: 12, color: "#ff6b6b", fontWeight: "600" },
  namedOnly: { fontSize: 12, color: "#007aff", fontWeight: "600" },
  distanceText: { fontSize: 12, color: "#888" },
  emptyText: { marginTop: 32, color: "#bbb", textAlign: "center" },
  tipText: { fontSize: 12, color: "#aaa", textAlign: "center" },
  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: "#eee",
    fontSize: 15,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  anonSwitchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  icebreakerBox: {
    padding: 8,
    backgroundColor: "#f2f2f2",
    borderRadius: 6,
    color: "#333",
    fontSize: 14,
  },
  shuffleBtn: { color: "#007aff", fontWeight: "600" },
  backBtn: { color: "#007aff", fontWeight: "600", fontSize: 16 },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  chatTitle: { fontWeight: "700", fontSize: 16 },
  chatExpires: { fontSize: 12, color: "#888" },
  chatBox: {
    marginTop: 8,
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  icebreakerLabel: { fontSize: 13, color: "#333", marginBottom: 8 },
  message: {
    padding: 10,
    borderRadius: 10,
    marginVertical: 6,
    minHeight: 54,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  anonMessage: {
    backgroundColor: "#fffbe6",
    borderLeftWidth: 4,
    borderLeftColor: "#ff6b6b",
  },
  namedMessage: {
    backgroundColor: "#f7f7f7",
    borderLeftWidth: 4,
    borderLeftColor: "#b2e6ff",
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#ff6b6b",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 2,
    marginTop: 2,
    shadowColor: "#ff6b6b",
    shadowOpacity: 0.10,
    shadowRadius: 2,
    elevation: 1,
  },
  anonName: { fontSize: 12, fontWeight: "700", color: "#ff6b6b" },
  namedName: { fontSize: 12, fontWeight: "700", color: "#333" },
  messageText: { marginTop: 2, fontSize: 15 },
  messageTime: { fontSize: 10, color: "#aaa", marginTop: 4 },
  liveText: { fontSize: 12, color: "#aaa" },
});