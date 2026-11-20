
import { useState } from "react";
import { supabase } from "./lib/supabaseClient";

function Auth() {
  const [isSignUp, setIsSignUp] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
                display_name: displayName.trim(),
                username: username.trim(),
            },
            emailRedirectTo:
              window.location.origin + import.meta.env.BASE_URL,
          },
        });

        if (error) throw error;

        setMessage(
          "Account created! Check your email for a confirmation link."
        );
      } else {
        const { error } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (error) throw error;
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-screen">
      <div className="auth-card">
        <p className="eyebrow">A LITTLE CORNER OF THE WORLD</p>
        <h1>little things ♡</h1>
        <p>
          A little progress, every day.
          Your aquarium is waiting.
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setMessage("");
            }}
          >
            Sign up
          </button>

          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setMessage("");
            }}
          >
            Log in
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <>
                <label>What should we call you?</label>
                <input
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={(event) =>
                    setDisplayName(event.target.value)
                }
                required
                />

                <label>Choose a username</label>
                <input
                type="text"
                placeholder="e.g. littlefish23"
                value={username}
                onChange={(event) =>
                    setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                }
                minLength={3}
                maxLength={20}
                required
                />
                <p className="auth-footer">
                Use 3–20 letters, numbers, or underscores.
                </p>
            </>
            )}

          <label>Email address</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            minLength={8}
            required
          />

          <button
            className="primary-button full-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "One moment..."
              : isSignUp
                ? "Create my account"
                : "Log in"}
          </button>
        </form>

        {message && (
          <p className="auth-message" role="status">
            {message}
          </p>
        )}

        <p className="auth-footer">
          Every little thing starts somewhere. ♡
        </p>
      </div>
    </main>
  );
}

export default Auth;