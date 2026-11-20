import { useEffect, useState } from "react";
import "./App.css";
import Auth from "./Auth";
import { supabase } from "./lib/supabaseClient";
import Friends from "./Friends";

const starterFish = ["🐠", "🐟", "🐡", "🪼", "🐬", "🦀"];

function formatProjectFromDatabase(project, items = []) {
  return {
    id: project.id,
    name: project.title,
    description: project.description || "",
    fish: project.fish,
    createdAt: new Date(project.created_at).getTime(),
    lastFed: new Date(project.last_fed).getTime(),
    releasedAt: project.released_at
      ? new Date(project.released_at).getTime()
      : null,
    visibility: project.visibility,
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
}

function getMood(project, missedDailyHabits = false) {
  if (missedDailyHabits) return "hungry";

  const daysSinceFed =
    (Date.now() - project.lastFed) / (1000 * 60 * 60 * 24);

  if (daysSinceFed >= 3) return "dying";
  if (daysSinceFed >= 2) return "sick";
  if (daysSinceFed >= 1) return "hungry";
  return "happy";
}

function getProgress(project) {
  const total = project.tasks.length + project.milestones.length;
  if (total === 0) return 0;

  const completed =
    project.tasks.filter((task) => task.done).length +
    project.milestones.filter((milestone) => milestone.done).length;

  return Math.round((completed / total) * 100);
}

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

function App() {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [newVisibility, setNewVisibility] = useState("private");
    const [activeTab, setActiveTab] = useState("aquarium");

    useEffect(() => {
      let mounted = true;

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (mounted) {
          setUser(session?.user ?? null);
          setAuthLoading(false);
        }
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        setAuthLoading(false);
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    }, []);

  const [projects, setProjects] = useState([]);
  const [released, setReleased] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState("");

  useEffect(() => {
    if (!user) return;

    async function loadProjects() {
      setProjectsLoading(true);
      setProjectsError("");

      try {
        // Get this user's projects
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("*")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: true });

        if (projectError) throw projectError;

        // Get the tasks and milestones for those projects
        let itemData = [];

        if (projectData.length > 0) {
          const projectIds = projectData.map((project) => project.id);

          const { data, error: itemError } = await supabase
            .from("project_items")
            .select("*")
            .in("project_id", projectIds);

          if (itemError) throw itemError;

          itemData = data;
        }

        // Convert database records into the format our aquarium uses
        const formattedProjects = projectData.map((project) =>
          formatProjectFromDatabase(
            project,
            itemData.filter((item) => item.project_id === project.id)
          )
        );

        setProjects(
          formattedProjects.filter((project) => !project.releasedAt)
        );

        setReleased(
          formattedProjects.filter((project) => project.releasedAt)
        );
      } catch (error) {
        console.error("Error loading projects:", error);
        setProjectsError(error.message);
      } finally {
        setProjectsLoading(false);
      }
    }

    loadProjects();
  }, [user]);

  const [selectedProject, setSelectedProject] = useState(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTask, setNewTask] = useState("");
  const [newMilestone, setNewMilestone] = useState("");
  const [dailyHabits, setDailyHabits] = useState([]);
  const [newDailyHabit, setNewDailyHabit] = useState("");
  const [dailyHabitsLoading, setDailyHabitsLoading] = useState(false);
  const [missedDailyHabits, setMissedDailyHabits] = useState(false);

  async function changeProjectVisibility(projectId, visibility) {
    try {
      const { error } = await supabase
        .from("projects")
        .update({ visibility })
        .eq("id", projectId);

      if (error) throw error;

      updateProject(projectId, (project) => ({
        ...project,
        visibility,
      }));
    } catch (error) {
      console.error("Error updating project privacy:", error);
      alert("Couldn't update project privacy: " + error.message);
    }
  }

  async function createProject(event) {
    event.preventDefault();

    if (!newName.trim()) return;

    const fish = starterFish[
      Math.floor(Math.random() * starterFish.length)
    ];

    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          owner_id: user.id,
          title: newName.trim(),
          description: newDescription.trim(),
          fish,
          status: "active",
          visibility: newVisibility,
          last_fed: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const newProject = formatProjectFromDatabase(data);

      setProjects((current) => [...current, newProject]);

      setNewName("");
      setNewDescription("");
      setShowNewProject(false);
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Couldn't save your project: " + error.message);
    }
  }

  function updateProject(id, updater) {
    setProjects((current) =>
      current.map((project) =>
        project.id === id ? updater(project) : project
      )
    );
  }

  async function toggleDailyHabit(habit) {
    const today = [
      new Date().getFullYear(),
      String(new Date().getMonth() + 1).padStart(2, "0"),
      String(new Date().getDate()).padStart(2, "0"),
    ].join("-");

    try {
      if (habit.completedToday) {
        const { error } = await supabase
          .from("daily_habit_completions")
          .delete()
          .eq("habit_id", habit.id)
          .eq("completed_on", today);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("daily_habit_completions")
          .insert({
            habit_id: habit.id,
            completed_on: today,
          });

        if (error) throw error;
      }

      setDailyHabits((current) =>
        current.map((item) =>
          item.id === habit.id
            ? { ...item, completedToday: !item.completedToday }
            : item
        )
      );
    } catch (error) {
      console.error("Error updating daily habit:", error);
      alert("Couldn't update your daily habit: " + error.message);
    }
  }

  async function addDailyHabit(event) {
    event.preventDefault();

    if (!newDailyHabit.trim() || !selectedProject) return;

    try {
      const { data, error } = await supabase
        .from("daily_habits")
        .insert({
          project_id: selectedProject.id,
          title: newDailyHabit.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      setDailyHabits((current) => [
        ...current,
        {
          ...data,
          completedToday: false,
        },
      ]);

      setNewDailyHabit("");
    } catch (error) {
      console.error("Error adding daily habit:", error);
      alert("Couldn't save your daily habit: " + error.message);
    }
  }

  async function addTask(event) {
    event.preventDefault();

    if (!newTask.trim() || !selectedProject) return;

    try {
      const { data, error } = await supabase
        .from("project_items")
        .insert({
          project_id: selectedProject.id,
          item_type: "task",
          title: newTask.trim(),
          is_completed: false,
        })
        .select()
        .single();

      if (error) throw error;

      updateProject(selectedProject.id, (project) => ({
        ...project,
        tasks: [
          ...project.tasks,
          {
            id: data.id,
            title: data.title,
            done: data.is_completed,
          },
        ],
      }));

      setNewTask("");
    } catch (error) {
      console.error("Error adding task:", error);
      alert("Couldn't save your task: " + error.message);
    }
  }

  async function addMilestone(event) {
    event.preventDefault();

    if (!newMilestone.trim() || !selectedProject) return;

    try {
      const { data, error } = await supabase
        .from("project_items")
        .insert({
          project_id: selectedProject.id,
          item_type: "milestone",
          title: newMilestone.trim(),
          is_completed: false,
        })
        .select()
        .single();

      if (error) throw error;

      updateProject(selectedProject.id, (project) => ({
        ...project,
        milestones: [
          ...project.milestones,
          {
            id: data.id,
            title: data.title,
            done: data.is_completed,
          },
        ],
      }));

      setNewMilestone("");
    } catch (error) {
      console.error("Error adding milestone:", error);
      alert("Couldn't save your milestone: " + error.message);
    }
  }

  async function toggleItem(projectId, type, itemId) {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const updated = {
      ...project,
      [type]: project[type].map((item) =>
        item.id === itemId ? { ...item, done: !item.done } : item
      ),
      lastFed: Date.now(),
    };

    const progress = getProgress(updated);

    const isCompleted =
      progress === 100 &&
      updated.tasks.length + updated.milestones.length > 0;

    const now = new Date().toISOString();

    try {
      // Save the checkbox change
      const item = updated[type].find((item) => item.id === itemId);

      const { error: itemError } = await supabase
        .from("project_items")
        .update({ is_completed: item.done })
        .eq("id", itemId);

      if (itemError) throw itemError;

      // Update the project's care date and completion status
      const projectUpdate = {
        last_fed: now,
      };

      if (isCompleted) {
        projectUpdate.status = "completed";
        projectUpdate.released_at = now;
      }

      const { error: projectError } = await supabase
        .from("projects")
        .update(projectUpdate)
        .eq("id", projectId);

      if (projectError) throw projectError;

      if (isCompleted) {
        setProjects((current) =>
          current.filter((p) => p.id !== projectId)
        );

        setReleased((current) => [
          ...current,
          { ...updated, releasedAt: Date.now() },
        ]);

        setSelectedProject(null);
      } else {
        setProjects((current) =>
          current.map((p) => (p.id === projectId ? updated : p))
        );
      }
    } catch (error) {
      console.error("Error updating project:", error);
      alert("Couldn't save your progress: " + error.message);
    }
  }

  function deleteProject(id) {
    setProjects((current) => current.filter((project) => project.id !== id));
    setSelectedProject(null);
  }

  function clearAquarium() {
  if (projects.length === 0) return;

  const confirmed = window.confirm(
    "Are you sure you want to clear the aquarium? All active projects and their progress will be deleted. Your finished fish will be safe."
  );

  if (!confirmed) return;

  setProjects([]);
  setSelectedProject(null);
  }

  function clearFinishedProjects() {
    if (released.length === 0) return;

    const confirmed = window.confirm(
      "Are you sure you want to clear your finished collection? This cannot be undone."
    );

    if (!confirmed) return;

    setReleased([]);
  }

  const activeProject =
    projects.find((project) => project.id === selectedProject?.id) ||
    released.find((fish) => fish.id === selectedProject?.id) ||
    null;

  const activeProgress = activeProject
    ? getProgress(activeProject)
    : 0;

  const activeGrowthStage = getGrowthStage(activeProgress);

  useEffect(() => {
    if (!activeProject) {
      setDailyHabits([]);
      return;
    }

    async function loadDailyHabits() {
      setDailyHabitsLoading(true);

      try {
        const { data: habits, error: habitsError } = await supabase
          .from("daily_habits")
          .select("*")
          .eq("project_id", activeProject.id)
          .order("created_at", { ascending: true });

        if (habitsError) throw habitsError;

        const habitIds = habits.map((habit) => habit.id);

        const getDateString = (date) =>
          [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0"),
          ].join("-");

        const today = getDateString(new Date());

        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = getDateString(yesterdayDate);

        let completions = [];

        if (habitIds.length > 0) {
          const { data, error } = await supabase
            .from("daily_habit_completions")
            .select("*")
            .in("habit_id", habitIds)
            .in("completed_on", [today, yesterday]);

          if (error) throw error;

          completions = data || [];
        }

        setDailyHabits(
          habits.map((habit) => ({
            ...habit,
            completedToday: completions.some(
              (completion) =>
                completion.habit_id === habit.id &&
                completion.completed_on === today
            ),
          }))
        );

        const yesterdayStart = new Date(`${yesterday}T00:00:00`);

        setMissedDailyHabits(
          habits.some(
            (habit) =>
              new Date(habit.created_at) < yesterdayStart &&
              !completions.some(
                (completion) =>
                  completion.habit_id === habit.id &&
                  completion.completed_on === yesterday
              )
          )
        );
      } catch (error) {
        console.error("Error loading daily habits:", error);
        alert("Couldn't load daily habits: " + error.message);
      } finally {
        setDailyHabitsLoading(false);
      }
    }

    loadDailyHabits();
  }, [activeProject?.id]);

  if (authLoading) {
  return (
    <main className="app-shell">
      <p>Loading your little aquarium...</p>
    </main>
  );
  }

  if (!user) {
    return <Auth />;
  }

  if (projectsLoading) {
    return (
      <main className="app-shell">
        <p>Loading your little aquarium...</p>
      </main>
    );
  }

  if (projectsError) {
    return (
      <main className="app-shell">
        <p>We couldn't load your aquarium: {projectsError}</p>
        <button onClick={() => window.location.reload()}>
          Try again
        </button>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">✳</span>
          <span>little things</span>
        </div>

        <div className="topbar-right">
          <div className="top-note">a little progress, every day</div>
          <button
            className="logout-button"
            onClick={() => supabase.auth.signOut()}
          >
            Log out
          </button>
        </div>
      </header>

      <nav className="main-navigation">
        <button
          className={activeTab === "aquarium" ? "active" : ""}
          onClick={() => setActiveTab("aquarium")}
        >
          🐠 My Aquarium
        </button>

        <button
          className={activeTab === "friends" ? "active" : ""}
          onClick={() => setActiveTab("friends")}
        >
          ♡ Friends
        </button>
      </nav>

      {activeTab === "aquarium" ? (
        <>

      <section className="welcome">
        <p className="eyebrow">YOUR LITTLE CORNER OF THE WORLD</p>
        <h1>Welcome to your aquarium.</h1>
        <p>
          Every little thing you're working toward deserves a little care.
          Create a project, meet its fish, and help it grow.
        </p>
      </section>

      <section className="aquarium-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">YOUR AQUARIUM</p>
            <h2>Growing things</h2>
          </div>
          <button className="primary-button" onClick={() => setShowNewProject(true)}>
            + New project
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="empty-aquarium">
            <div className="empty-fish">🐠</div>
            <h3>Your aquarium is waiting.</h3>
            <p>
              Start with something small. A goal, a habit, a project, or a
              dream. Your first little fish is waiting to hatch.
            </p>
            <button className="primary-button" onClick={() => setShowNewProject(true)}>
              Create your first project
            </button>
          </div>
        ) : (
          <div className="swimming-aquarium">
            <div className="water-decoration bubble-one" />
            <div className="water-decoration bubble-two" />
            <div className="water-decoration bubble-three" />

            <div className="aquarium-caption">
              <span>✧</span> your little underwater world <span>✧</span>
            </div>

            {/* Aquarium decorations */}
            <div className="aquarium-sand"></div>

            <div className="aquarium-coral coral-left">🪸</div>
            <div className="aquarium-coral coral-right">🪸</div>

            <div className="seagrass seagrass-left">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>

            <div className="seagrass seagrass-right">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
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

            {projects.map((project, index) => {
              const mood = getMood(
                project,
                project.id === activeProject?.id && missedDailyHabits
              );
              const progress = getProgress(project);
              const growthStage = getGrowthStage(progress);

              return (
                <button
                  className={`swimming-fish mood-${mood} path-${index % 3} ${
                    progress < 25 ? "egg" : ""
                  }`}
                  key={project.id}
                  title={`${project.name} — ${progress}% grown`}
                  aria-label={`Open ${project.name}`}
                  style={{
                    "--start-y": `${15 + (index % 4) * 20}%`,
                    "--egg-offset": `${(index % 5) * 16}%`,
                    animationDuration: progress < 25
                      ? `${4 + (index % 3) * 1.5}s`
                      : `${18 + (index % 3) * 7}s`,
                    animationDelay: progress < 25
                      ? `${-(index * 2.3) % 6}s`
                      : `${-index * 5}s`,
                  }}
                  onClick={() => setSelectedProject(project)}
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

            <div className="aquarium-management">
              <button
                className="management-button clear-aquarium-button"
                onClick={clearAquarium}
                disabled={projects.length === 0}
              >
                ↻ Clear aquarium
              </button>

              <button
                className="management-button clear-finished-button"
                onClick={clearFinishedProjects}
                disabled={released.length === 0}
              >
                ✕ Clear finished projects
              </button>
            </div>

            <section className="bottom-section">
        <div className="bottom-card">
          <span className="bottom-icon">🫧</span>
          <div>
            <h3>A gentle reminder</h3>
            <p>
              Little things grow when you give them a little attention. Check
              in with your fish and see what they need.
            </p>
          </div>
        </div>
        <div className="bottom-card collection-card">
          <span className="bottom-icon">🐚</span>
          <div>
            <h3>Your little collection</h3>
            <p>
              {released.length === 0
                ? "Your first fish will be released here when its project is complete."
                : `${released.length} little ${released.length === 1 ? "fish has" : "fish have"} completed their journey.`}
            </p>
            {released.length > 0 && (
              <div className="released-fish">
                {released.map((fish) => (
                  <button
                    type="button"
                    className="collection-fish-button"
                    key={fish.id}
                    title={`View ${fish.name}`}
                    onClick={() => setSelectedProject(fish)}
                  >
                    {fish.fish}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {showNewProject && (
        <div className="modal-backdrop" onClick={() => setShowNewProject(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <button className="close-button" onClick={() => setShowNewProject(false)}>×</button>
            <p className="eyebrow">A NEW LITTLE THING</p>
            <h2>What are you growing?</h2>
            <p className="modal-description">
              Give your project a name. A little fish will hatch just for it.
            </p>
            <form onSubmit={createProject}>
              <label>Project name</label>
              <input
                autoFocus
                placeholder="e.g. Learn to play guitar"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                required
              />
              <label>A little description (optional)</label>
              <textarea
                placeholder="What are you hoping to do?"
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
              />
              <label>
                Project privacy
                <select
                  value={newVisibility}
                  onChange={(event) => setNewVisibility(event.target.value)}
                >
                  <option value="private">Private — only me</option>
                  <option value="friends">Friends — accepted friends</option>
                  <option value="public">Public — all signed-in users</option>
                </select>
              </label>
              <button className="primary-button full-button" type="submit">
                Hatch my fish ✨
              </button>
            </form>
          </div>
        </div>
      )}

      {activeProject && (
        <div className="modal-backdrop" onClick={() => setSelectedProject(null)}>
          <div className="modal project-modal" onClick={(event) => event.stopPropagation()}>
            <button className="close-button" onClick={() => setSelectedProject(null)}>×</button>
            <div className="detail-fish">{activeProject.fish}</div>
            <p className="eyebrow">YOUR LITTLE PROJECT</p>
            <h2>{activeProject.name}</h2>
            <p className="modal-description">
              {activeProject.description || "Every little step counts."}
            </p>
            
            <div className="project-privacy">
              <h3>Who can see this project?</h3>

              <div className="privacy-options">
                <label className={`privacy-option private-option ${
                  activeProject.visibility === "private" ? "selected" : ""
                }`}>
                  <input
                    type="radio"
                    name="project-visibility"
                    value="private"
                    checked={activeProject.visibility === "private"}
                    onChange={() =>
                      changeProjectVisibility(activeProject.id, "private")
                    }
                  />
                  <span className="privacy-icon">🔒</span>
                  <strong>Private</strong>
                  <small>Only you</small>
                </label>

                <label className={`privacy-option friends-option ${
                  activeProject.visibility === "friends" ? "selected" : ""
                }`}>
                  <input
                    type="radio"
                    name="project-visibility"
                    value="friends"
                    checked={activeProject.visibility === "friends"}
                    onChange={() =>
                      changeProjectVisibility(activeProject.id, "friends")
                    }
                  />
                  <span className="privacy-icon">🐟</span>
                  <strong>Friends</strong>
                  <small>Accepted friends</small>
                </label>

                <label className={`privacy-option public-option ${
                  activeProject.visibility === "public" ? "selected" : ""
                }`}>
                  <input
                    type="radio"
                    name="project-visibility"
                    value="public"
                    checked={activeProject.visibility === "public"}
                    onChange={() =>
                      changeProjectVisibility(activeProject.id, "public")
                    }
                  />
                  <span className="privacy-icon">🌎</span>
                  <strong>Public</strong>
                  <small>All signed-in users</small>
                </label>
              </div>
            </div>

        <div className="fish-growth-card">
          <div className="growth-stage-header">
            <span className="growth-stage-emoji">
              {activeGrowthStage.emoji}
            </span>

            <div>
              <p className="growth-stage-label">
                CURRENT GROWTH STAGE
              </p>
              <h3>{activeGrowthStage.name}</h3>
              <p>{activeGrowthStage.description}</p>
            </div>
          </div>

          <div className="growth-progress-info">
            <span>Growth progress</span>
            <strong>{activeProgress}%</strong>
          </div>

          <div className="growth-progress-track">
            <div
              className="growth-progress-fill"
              style={{ width: `${activeProgress}%` }}
            ></div>
          </div>

          <p className="growth-encouragement">
            {activeProgress === 0
              ? "Every little thing starts somewhere."
              : activeProgress < 100
              ? "Keep going! Your little fish is growing."
              : "Your fish is ready to swim free!"}
          </p>
        </div>
            <div className="task-section daily-food-section">
              <div className="daily-food-heading">
                <div>
                  <h3>🐠 Daily Fish Food</h3>
                  <p>Little habits that keep your fish happy and healthy.</p>
                </div>
                <span>
                  {dailyHabits.filter((habit) => habit.completedToday).length}
                  {" / "}
                  {dailyHabits.length} fed
                </span>
              </div>

              {dailyHabitsLoading ? (
                <p>Preparing today's fish food...</p>
              ) : dailyHabits.length === 0 ? (
                <p className="empty-habits">
                  Your fish is waiting for its first daily habit! 🫧
                </p>
              ) : (
                dailyHabits.map((habit) => (
                  <div className="task-row" key={habit.id}>
                    <input
                      type="checkbox"
                      checked={habit.completedToday}
                      onChange={() => toggleDailyHabit(habit)}
                    />
                    <span className={habit.completedToday ? "completed" : ""}>
                      {habit.title}
                    </span>
                  </div>
                ))
              )}

              <form className="add-item-form" onSubmit={addDailyHabit}>
                <input
                  placeholder="e.g. Go for a run every day..."
                  value={newDailyHabit}
                  onChange={(event) => setNewDailyHabit(event.target.value)}
                />
                <button type="submit">+</button>
              </form>
            </div>
            <div className="task-section">
              <h3>Little tasks</h3>
              {activeProject.tasks.map((task) => (
                <label className="task-row" key={task.id}>
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleItem(activeProject.id, "tasks", task.id)}
                  />
                  <span className={task.done ? "completed" : ""}>{task.title}</span>
                </label>
              ))}
              <form className="add-item-form" onSubmit={addTask}>
                <input
                  placeholder="Add a little task..."
                  value={newTask}
                  onChange={(event) => setNewTask(event.target.value)}
                />
                <button type="submit">+</button>
              </form>
            </div>

            <div className="task-section">
              <h3>Milestones</h3>
              {activeProject.milestones.map((milestone) => (
                <label className="task-row milestone-row" key={milestone.id}>
                  <input
                    type="checkbox"
                    checked={milestone.done}
                    onChange={() => toggleItem(activeProject.id, "milestones", milestone.id)}
                  />
                  <span className={milestone.done ? "completed" : ""}>{milestone.title}</span>
                </label>
              ))}
              <form className="add-item-form" onSubmit={addMilestone}>
                <input
                  placeholder="Add a milestone..."
                  value={newMilestone}
                  onChange={(event) => setNewMilestone(event.target.value)}
                />
                <button type="submit">+</button>
              </form>
            </div>

            <div className="care-note">
              {getMood(activeProject, missedDailyHabits) === "happy" && "Your fish is happy. Keep up the lovely work! 💛"}
              {getMood(activeProject, missedDailyHabits) === "hungry" && "Your fish is getting sleepy. Check in when you can. 💤"}
              {getMood(activeProject, missedDailyHabits) === "sick" && "Your fish is hungry! Complete a little task to feed it. 🫧"}
              {getMood(activeProject, missedDailyHabits) === "dying" && "Your fish misses you. A little attention can help it feel better. 💙"}
            </div>

            <button className="delete-button" onClick={() => deleteProject(activeProject.id)}>
              Delete this project
            </button>
          </div>
        </div>
      )}

        </>
      ) : (
        <Friends />
      )}
      
      <footer>
        made with a little love <span>♡</span>
      </footer>
    </main>
  );
}

export default App;
