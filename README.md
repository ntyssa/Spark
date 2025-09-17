# 🔥 Spark

**Spark** is a new kind of social media app built around **ephemeral communities** — short-lived groups where people connect authentically without the pressure of permanent profiles.  

Instead of chasing followers or curating a perfect feed, Spark lets you join or create temporary groups based on **events, places, moods, or goals**. After 24 hours, the community dissolves — leaving only the memories of real connections.

---

## ✨ Why Spark?
- **No Pressure:** No likes, follower counts, or clout chasing.  
- **Authentic:** People share freely when the spotlight isn’t permanent.  
- **In the Moment:** Join conversations that matter *right now*.  
- **Temporary by Design:** Groups auto-expire after 24 hours.  

---

## 🚀 Prototype Features (Implemented)
This repo contains a **React Native prototype** of Spark.  

✅ **Core Implementations**  
- 🔑 **Ephemeral Groups**: Each group auto-expires (`expiresAt`) and is deleted after 24h (background cleanup runs every 30s).  
- 🌍 **Location-based Discovery**: Groups are tied to coordinates, with a nearby search (`listGroupsNearby(lat, lng, radiusKm)`). Uses the **device geolocation API** for real GPS coordinates.  
- 🎭 **Anonymous Posting**: When creating a group, you can allow anonymous posts. Chat view includes a toggle (`Switch`) to send messages anonymously.  
- 🧩 **Icebreakers**: Groups can include icebreaker prompts. Prototype includes a built-in `ICEBREAKERS` array that shuffles suggestions.  
- ⏳ **Countdown Timer**: Each group shows time left (`timeLeft()`) until it expires.  
- 📡 **Live Chat Refresh**: Chat view refreshes every 3 seconds to simulate real-time updates.  

---

## 🧭 Roadmap (Next Steps)
- [ ] Replace in-memory backend with **Firebase** or **Supabase** for persistence.  
- [ ] Add **WebSockets** for true real-time messaging.  
- [ ] Implement **push notifications** when new groups appear nearby.  
- [ ] Add **mini-games & polls** for richer icebreakers.  
- [ ] Polish UI with themes, avatars, and emojis.  
- [ ] Deploy backend with **Dockerized microservices** for scalability.  

---

## 🛠️ Tech Stack (Prototype)
- **Frontend:** React Native (Expo)  
- **Backend (Mock):** In-memory datastore (`backend.ts`)  
- **Real-time Simulation:** `setInterval` refresh for messages  
- **State Management:** React hooks (`useState`, `useEffect`)  
- **UI Components:** React Native core primitives (`View`, `Text`, `TextInput`, `FlatList`, `Switch`, `TouchableOpacity`)  
- **Location Services:** Device geolocation API (replaces `getMockLocation()`)  

---

## 🎯 Use Cases
- “Study grind room” for late-night students  
- “Concert afterparty” for fans who just left a show  
- “Stuck in traffic” group for commuters  
- “Midnight motivation” circle for night owls  

---

## 💡 Tagline
**Spark – Connections that light up, then fade.**