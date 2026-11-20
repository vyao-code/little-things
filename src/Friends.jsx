import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import "./Friends.css";

function getGrowthStage(progress) {
  if (progress < 25) {
    return {
      name: "Egg",
      emoji: "🥚",
      description: "Something little is beginning...",
    };
  }

  if (progress < 50) {
    return {
      name: "Hatchling",
      emoji: "🐟",
      description: "Your little fish has hatched!",
    };
  }

  if (progress < 75) {
    return {
      name: "Growing Fish",
      emoji: "🐠",
      description: "Look how much your fish has grown!",
    };
  }

  return {
    name: "Fully Grown",
    emoji: "🐡",
    description: "Your fish is almost ready to swim free!",
  };
}

function Friends() {
    async function searchFriends(event) {
        event.preventDefault();

        const query = searchTerm.trim().toLowerCase();

        if (!query) {
        setResults([]);
        setMessage("Enter a username to search.");
        return;
        }

        setLoading(true);
        setMessage("");

        try {
        const { data, error } = await supabase
            .from("profiles")
            .select("id, username, display_name")
            .ilike("username", `%${query}%`)
            .limit(10);

        if (error) throw error;

        setResults(data || []);

        if (!data || data.length === 0) {
            setMessage("No users found. Try another username!");
        }
        } catch (error) {
        console.error("Error searching for friends:", error);
        setMessage("Couldn't search right now: " + error.message);
        } finally {
        setLoading(false);
        }
    }

    async function sendFriendRequest(friendId) {
        setRequestMessages((current) => ({
            ...current,
            [friendId]: "Sending...",
        }));

        try {
            const { data: { user }, error: userError } =
            await supabase.auth.getUser();

            if (userError) throw userError;

            const { error } = await supabase
            .from("friend_requests")
            .insert({
                sender_id: user.id,
                receiver_id: friendId,
            });

            if (error) throw error;

            setRequestMessages((current) => ({
            ...current,
            [friendId]: "Request sent! ♡",
            }));
        } catch (error) {
            console.error("Error sending friend request:", error);

            setRequestMessages((current) => ({
            ...current,
            [friendId]: "Couldn't send request. You may already have a request with this person.",
            }));
        }
        }
  
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [requestMessages, setRequestMessages] = useState({});
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [friendProjects, setFriendProjects] = useState([]);
  const [friendProjectsLoading, setFriendProjectsLoading] = useState(false);

  useEffect(() => {
    loadIncomingRequests();
    loadFriends();
  }, []);

    async function loadIncomingRequests() {
        setRequestsLoading(true);

        try {
            const { data: { user }, error: userError } =
            await supabase.auth.getUser();

            if (userError) throw userError;

            const { data, error } = await supabase
            .from("friend_requests")
            .select(`
                id,
                sender_id,
                created_at,
                profiles!friend_requests_sender_id_fkey (
                username,
                display_name
                )
            `)
            .eq("receiver_id", user.id)
            .eq("status", "pending")
            .order("created_at", { ascending: false });

            if (error) throw error;

            setIncomingRequests(data || []);
        } catch (error) {
            console.error("Error loading friend requests:", error);
        } finally {
            setRequestsLoading(false);
        }
    }

    async function loadFriends() {
        setFriendsLoading(true);

        try {
            const { data: { user }, error: userError } =
            await supabase.auth.getUser();

            if (userError) throw userError;

            const { data: requests, error } = await supabase
            .from("friend_requests")
            .select("id, sender_id, receiver_id")
            .eq("status", "accepted")
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

            if (error) throw error;

            const friendIds = requests.map((request) =>
            request.sender_id === user.id
                ? request.receiver_id
                : request.sender_id
            );

            if (friendIds.length === 0) {
            setFriends([]);
            return;
            }

            const { data: profiles, error: profileError } = await supabase
            .from("profiles")
            .select("id, username, display_name")
            .in("id", friendIds);

            if (profileError) throw profileError;

            setFriends(profiles || []);
        } catch (error) {
            console.error("Error loading friends:", error);
        } finally {
            setFriendsLoading(false);
        }
        }

    async function viewFriendAquarium(friend) {
        setSelectedFriend(friend);
        setFriendProjects([]);
        setFriendProjectsLoading(true);

        try {
            // Load projects belonging to this friend
            const { data: projectData, error: projectError } = await supabase
            .from("projects")
            .select("*")
            .eq("owner_id", friend.id)
            .order("created_at", { ascending: true });

            if (projectError) throw projectError;

            let itemData = [];

            // Load tasks and milestones for those projects
            if (projectData.length > 0) {
            const projectIds = projectData.map((project) => project.id);

            const { data, error } = await supabase
                .from("project_items")
                .select("*")
                .in("project_id", projectIds);

            if (error) throw error;

            itemData = data || [];
            }

            // Organize projects and their tasks
            const formattedProjects = projectData.map((project) => {
            const items = itemData.filter(
                (item) => item.project_id === project.id
            );

            return {
                id: project.id,
                name: project.title,
                description: project.description || "",
                fish: project.fish,
                status: project.status,
                createdAt: new Date(project.created_at).getTime(),
                releasedAt: project.released_at,
                tasks: items
                .filter((item) => item.item_type === "task")
                .map((item) => ({
                    id: item.id,
                    title: item.title,
                    done: item.is_completed,
                })),
                milestones: items
                .filter((item) => item.item_type === "milestone")
                .map((item) => ({
                    id: item.id,
                    title: item.title,
                    done: item.is_completed,
                })),
            };
            });

            setFriendProjects(formattedProjects);
        } catch (error) {
            console.error("Error loading friend's aquarium:", error);
            alert("Couldn't load this friend's aquarium: " + error.message);
        } finally {
            setFriendProjectsLoading(false);
        }
        }
    
        async function respondToRequest(requestId, response) {
        try {
            const { error } = await supabase
            .from("friend_requests")
            .update({ status: response })
            .eq("id", requestId)
            .eq("status", "pending");

            if (error) throw error;

            await loadIncomingRequests();
        } catch (error) {
            console.error("Error responding to friend request:", error);
            alert("Couldn't update the friend request: " + error.message);
        }
    }

  if (selectedFriend) {
    return (
        <section className="friends-section friend-aquarium">
        <button
            className="back-to-friends"
            onClick={() => setSelectedFriend(null)}
        >
            ← Back to Friends
        </button>

        <div className="friend-aquarium-header">
            <div className="friend-avatar">🐠</div>
            <p className="eyebrow">A LITTLE PEEK INTO THEIR WORLD</p>
            <h2>
            {selectedFriend.display_name || selectedFriend.username}'s Aquarium
            </h2>
            <p>@{selectedFriend.username}</p>
        </div>

        {friendProjectsLoading ? (
            <p>Swimming over to their aquarium...</p>
        ) : friendProjects.length === 0 ? (
            <p>This aquarium is still waiting to show its projects! 🐚</p>
        ) : (
            <div className="swimming-aquarium">
            <div className="water-decoration bubble-one" />
            <div className="water-decoration bubble-two" />
            <div className="water-decoration bubble-three" />

            <div className="aquarium-caption">
                <span>✧</span> a little underwater world <span>✧</span>
            </div>

            <div className="aquarium-sand"></div>

            <div className="aquarium-coral coral-left">🪸</div>
            <div className="aquarium-coral coral-right">🪸</div>

            <div className="seagrass seagrass-left">
                <span></span><span></span><span></span><span></span><span></span>
            </div>

            <div className="seagrass seagrass-right">
                <span></span><span></span><span></span><span></span><span></span>
            </div>

            <div className="aquarium-bubbles">
                {Array.from({ length: 12 }).map((_, i) => (
                <span
                    key={i}
                    style={{
                    left: `${8 + (i * 17) % 85}%`,
                    animationDelay: `${-(i * 1.3) % 8}s`,
                    animationDuration: `${5 + (i % 4)}s`,
                    }}
                ></span>
                ))}
            </div>

            {friendProjects.map((project, index) => {
                const allItems = [
                ...(project.tasks || []),
                ...(project.milestones || []),
                ];

                const completedItems = allItems.filter((item) => item.done).length;

                const progress = allItems.length === 0
                ? 0
                : Math.round((completedItems / allItems.length) * 100);

                const growthStage = getGrowthStage(progress);

                return (
                <button
                    key={project.id}
                    className={`swimming-fish path-${index % 3} ${
                    progress < 25 ? "egg" : ""
                    }`}
                    title={`${project.name} — ${progress}% complete`}
                    aria-label={`View ${project.name}`}
                    style={{
                    "--start-y": `${15 + (index % 4) * 20}%`,
                    "--egg-offset": `${(index % 5) * 16}%`,
                    animationDuration: progress < 25
                        ? `${4 + (index % 3) * 1.5}s`
                        : `${18 + (index % 3) * 7}s`,
                    animationDelay: `${-index * 5}s`,
                    }}
                    onClick={() => {}}
                >
                    <span className="swimming-fish-emoji">
                    {growthStage.emoji}
                    </span>
                    <span className="swimming-fish-name">
                    {project.name}
                    </span>
                </button>
                );
            })}
            </div>
        )}
        </section>
    );
    }
  
    return (
    <section className="friends-section">
      <p className="eyebrow">YOUR LITTLE COMMUNITY</p>
      <h2>Find friends ♡</h2>
      <p>Find people by their username and grow together.</p>

      <section className="incoming-requests">
        <h3>Friend requests ♡</h3>

        {requestsLoading ? (
            <p>Checking for new requests...</p>
        ) : incomingRequests.length === 0 ? (
            <p>No new friend requests yet. Your little community is growing!</p>
        ) : (
            <div className="friend-results">
            {incomingRequests.map((request) => (
                <div className="friend-card" key={request.id}>
                <div className="friend-avatar">🐠</div>

                <div className="friend-info">
                    <strong>
                    {request.profiles?.display_name ||
                        request.profiles?.username}
                    </strong>
                    <span>@{request.profiles?.username}</span>
                </div>

                <div className="request-actions">
                    <button
                    onClick={() =>
                        respondToRequest(request.id, "accepted")
                    }
                    >
                    Accept ♡
                    </button>

                    <button
                    onClick={() =>
                        respondToRequest(request.id, "declined")
                    }
                    >
                    Decline
                    </button>
                </div>
                </div>
            ))}
            </div>
        )}
        </section>
    
      <section className="my-friends">
        <h3>My friends ♡</h3>

        {friendsLoading ? (
            <p>Loading your friends...</p>
        ) : friends.length === 0 ? (
            <p>
            Your aquarium community is just getting started.
            Find someone to grow with! 🐠
            </p>
        ) : (
            <div className="friend-results">
            {friends.map((friend) => (
                <div
                    className="friend-card clickable-friend"
                    key={friend.id}
                    onClick={() => viewFriendAquarium(friend)}
                >
                <div className="friend-avatar">🐠</div>

                <div className="friend-info">
                    <strong>
                    {friend.display_name || friend.username}
                    </strong>
                    <span>@{friend.username}</span>
                </div>
                </div>
            ))}
            </div>
        )}
      </section>

      <form onSubmit={searchFriends}>
        <input
          type="text"
          placeholder="Search by username..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <button type="submit">Search</button>
      </form>

      {message && <p>{message}</p>}

      {loading && <p>Looking for friends...</p>}

      <div className="friend-results">
        {results.map((friend) => (
            <div className="friend-card" key={friend.id}>
            <div className="friend-avatar">🐠</div>

            <div className="friend-info">
                <strong>{friend.display_name || friend.username}</strong>
                <span>@{friend.username}</span>
                {requestMessages[friend.id] && (
                <small>{requestMessages[friend.id]}</small>
                )}
            </div>

            <button
                className="friend-request-button"
                onClick={() => sendFriendRequest(friend.id)}
                disabled={Boolean(requestMessages[friend.id])}
            >
                Send request ♡
            </button>
            </div>
        ))}
      </div>
    </section>
  );
}

export default Friends;
