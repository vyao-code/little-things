
import { useEffect, useState } from "react";
import "./App.css";

const starterFish = ["🐠", "🐟", "🐡", "🪼", "🐬", "🦀"];

function getMood(project) {
  const daysSinceFed =
    (Date.now() - project.lastFed) / (1000 * 60 * 60 * 24);

  if (daysSinceFed >= 7) return "sick";
  if (daysSinceFed >= 4) return "hungry";
  if (daysSinceFed >= 2) return "sleepy";
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
  const [projects, setProjects] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("little-things-projects")) || [];
    } catch {
      return [];
    }
  });

  const [released, setReleased] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("little-things-released")) || [];
    } catch {
      return [];
    }
  });

  const [selectedProject, setSelectedProject] = useState(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTask, setNewTask] = useState("");
  const [newMilestone, setNewMilestone] = useState("");

  useEffect(() => {
    localStorage.setItem("little-things-projects", JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem("little-things-released", JSON.stringify(released));
  }, [released]);

  function createProject(event) {
    event.preventDefault();
    if (!newName.trim()) return;

    const project = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      description: newDescription.trim(),
      fish: starterFish[Math.floor(Math.random() * starterFish.length)],
      createdAt: Date.now(),
      lastFed: Date.now(),
      tasks: [],
      milestones: [],
    };

    setProjects((current) => [...current, project]);
    setNewName("");
    setNewDescription("");
    setShowNewProject(false);
  }

  function updateProject(id, updater) {
    setProjects((current) =>
      current.map((project) =>
        project.id === id ? updater(project) : project
      )
    );
  }

  function addTask(event) {
    event.preventDefault();
    if (!newTask.trim() || !selectedProject) return;

    updateProject(selectedProject.id, (project) => ({
      ...project,
      tasks: [
        ...project.tasks,
        { id: crypto.randomUUID(), title: newTask.trim(), done: false },
      ],
    }));

    setNewTask("");
  }

  function addMilestone(event) {
    event.preventDefault();
    if (!newMilestone.trim() || !selectedProject) return;

    updateProject(selectedProject.id, (project) => ({
      ...project,
      milestones: [
        ...project.milestones,
        { id: crypto.randomUUID(), title: newMilestone.trim(), done: false },
      ],
    }));

    setNewMilestone("");
  }

  
function toggleItem(projectId, type, itemId) {
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
  const growthStage = getGrowthStage(progress);

  if (
    progress === 100 &&
    updated.tasks.length + updated.milestones.length > 0
  ) {
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

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">✳</span>
          <span>little things</span>
        </div>
        <div className="top-note">a little progress, every day</div>
      </header>

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
              const mood = getMood(project);
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
              {getMood(activeProject) === "happy" && "Your fish is happy. Keep up the lovely work! 💛"}
              {getMood(activeProject) === "sleepy" && "Your fish is getting sleepy. Check in when you can. 💤"}
              {getMood(activeProject) === "hungry" && "Your fish is hungry! Complete a little task to feed it. 🫧"}
              {getMood(activeProject) === "sick" && "Your fish misses you. A little attention can help it feel better. 💙"}
            </div>

            <button className="delete-button" onClick={() => deleteProject(activeProject.id)}>
              Delete this project
            </button>
          </div>
        </div>
      )}

      <footer>
        made with a little love <span>♡</span>
      </footer>
    </main>
  );
}

export default App;
