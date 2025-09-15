// app/(tabs)/index.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Switch,
  StyleSheet,
  Alert,
} from "react-native";

/** Types */
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

/** Lightweight UUID generator for demo */
const uuid = () => Math.random().toString(36).slice(2, 9);

/** Utility: human-friendly remaining time */
function timeLeft(expiryTs: number) {
  const diff = Math.max(0, expiryTs - Date.now());
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return `${hours}h ${minutes}m ${seconds}s`;
}

/** Icebreakers */
const ICEBREAKERS = [
  "Share a song you're vibing to right now.",
  "What's the one emoji that describes your day?",
  "Two truths and a lie — go!",
  "What's your go-to comfort food?",
  "If you had 10 minutes of fame, how would you use it?",
];

/** Mock location helper (replace with expo-location later) */
async function getMockLocation() {
  return { latitude: 14.676, longitude: 121.0437 }; // Manila center
}

/** In-memory backend (prototype only) */
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

/** Periodic cleanup (module-level prototype timer) */
setInterval(() => backend.removeExpired(), 30000);

/** ---------- Page component (Expo Router expects a default export) ---------- */
export default function Page(): JSX.Element {
  return <SparkApp />;
}

/** The prototype App component */
function SparkApp() {
  const [view, setView] = useState<"discover" | "create" | "chat">("discover");
  const [groups, setGroups] = useState<Group[]>([]);
  const [myLocation, setMyLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [nameHandle, setNameHandle] = useState("");

  useEffect(() => {
    (async () => {
      const loc = await getMockLocation();
      setMyLocation(loc);
      loadNearby(loc);
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
        <Text style={styles.title}>Spark</Text>
        <Text style={styles.subtitle}>Connections that light up, then fade.</Text>
      </View>

      {view === "discover" && (
        <DiscoverView groups={groups} onCreate={openCreate} onJoin={openChat} myLocation={myLocation} />
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

/** ---------- Discover View ---------- */
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
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={styles.h2}>Nearby Sparks</Text>
        <TouchableOpacity onPress={onCreate} style={styles.primaryBtn}>
          <Text style={{ color: "#fff" }}>New Spark</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(i) => i.id}
        ListEmptyComponent={<Text style={{ marginTop: 20 }}>No Sparks nearby — create one!</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => onJoin(item)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardMeta}>Expires in {timeLeft(item.expiresAt)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 12 }}>{item.anonymousAllowed ? "Anonymous allowed" : "Named only"}</Text>
              <Text style={{ fontSize: 12 }}>{formatDistance(item, myLocation)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <View style={{ marginTop: 10 }}>
        <Text style={{ fontSize: 12, color: "#666" }}>
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

/** ---------- Create Group View ---------- */
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
    const loc = myLocation || (await getMockLocation());
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
        <Text style={{ color: "#007aff" }}>◀ Back</Text>
      </TouchableOpacity>

      <Text style={styles.h2}>Create a Spark</Text>

      <TextInput
        placeholder="Spark name (e.g. 'Study grind room')"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginVertical: 8,
        }}
      >
        <Text>Allow anonymous posts</Text>
        <Switch value={anonAllowed} onValueChange={setAnonAllowed} />
      </View>

      <Text style={{ marginTop: 8 }}>Icebreaker</Text>
      <View style={{ marginVertical: 8 }}>
        <Text style={{ padding: 8, backgroundColor: "#f2f2f2", borderRadius: 6 }}>{icebreaker}</Text>
        <TouchableOpacity
          onPress={() =>
            setIcebreaker(ICEBREAKERS[Math.floor(Math.random() * ICEBREAKERS.length)])
          }
          style={{ marginTop: 6 }}
        >
          <Text style={{ color: "#007aff" }}>Shuffle icebreaker</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={create} style={styles.primaryBtn}>
        <Text style={{ color: "#fff" }}>Create Spark</Text>
      </TouchableOpacity>
    </View>
  );
}

/** ---------- Chat View ---------- */
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
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity onPress={onBack}>
          <Text style={{ color: "#007aff" }}>◀ Sparks</Text>
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontWeight: "600" }}>{group.name}</Text>
          <Text style={{ fontSize: 12 }}>Expires in {timeLeft(group.expiresAt)}</Text>
        </View>
        <View style={{ width: 48 }} />
      </View>

      <View
        style={{
          marginTop: 8,
          padding: 8,
          backgroundColor: "#fff",
          borderRadius: 6,
          borderWidth: 1,
          borderColor: "#eee",
        }}
      >
        <Text style={{ fontSize: 13, color: "#333", marginBottom: 6 }}>
          Icebreaker: {group.icebreaker}
        </Text>

        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          style={{ maxHeight: 300 }}
          renderItem={({ item }) => (
            <View style={[styles.message, item.anonymous ? styles.anonMessage : null]}>
              <Text style={{ fontSize: 12, fontWeight: "600" }}>
                {item.anonymous ? "Anonymous" : item.displayName}
              </Text>
              <Text style={{ marginTop: 4 }}>{item.text}</Text>
              <Text style={{ fontSize: 10, color: "#666", marginTop: 6 }}>
                {new Date(item.createdAt).toLocaleTimeString()}
              </Text>
            </View>
          )}
        />

        <View style={{ marginTop: 8 }}>
          <TextInput
            placeholder="Your handle (optional)"
            value={nameHandle}
            onChangeText={setNameHandle}
            style={styles.input}
          />
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <TextInput
              placeholder="Say something..."
              value={text}
              onChangeText={setText}
              style={[styles.input, { flex: 1, marginRight: 8 }]}
            />
            <TouchableOpacity onPress={send} style={styles.primaryBtnSmall}>
              <Text style={{ color: "#fff" }}>Send</Text>
            </TouchableOpacity>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 8,
              justifyContent: "space-between",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Switch value={anon} onValueChange={setAnon} />
              <Text style={{ marginLeft: 8 }}>
                {anon ? "Posting anonymously" : "Posting with handle"}
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: "#666" }}>Live updates • ephemeral</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/** Styles */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 14, backgroundColor: "#fafafa" },
  header: { marginBottom: 12 },
  title: { fontSize: 32, fontWeight: "700" },
  subtitle: { color: "#666" },
  section: { flex: 1 },
  h2: { fontSize: 18, fontWeight: "700" },
  primaryBtn: {
    backgroundColor: "#ff6b6b",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  primaryBtnSmall: {
    backgroundColor: "#ff6b6b",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  card: {
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#eee",
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardMeta: { fontSize: 12, color: "#666" },
  input: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: "#eee",
  },
  message: {
    padding: 10,
    backgroundColor: "#f7f7f7",
    borderRadius: 8,
    marginVertical: 6,
  },
  anonMessage: { backgroundColor: "#fffbe6" },
});