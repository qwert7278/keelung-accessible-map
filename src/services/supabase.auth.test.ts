import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithOtp: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

describe("Supabase administrator authentication", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    vi.stubEnv(
      "VITE_PUBLIC_SITE_URL",
      "https://keelung-accessible-map.vercel.app",
    );
    vi.stubGlobal("window", {
      setTimeout,
      location: { origin: "https://preview.example" },
    });
    mocks.createClient.mockReturnValue({
      auth: {
        onAuthStateChange: mocks.onAuthStateChange,
        signInWithOtp: mocks.signInWithOtp,
        signOut: mocks.signOut,
        getSession: mocks.getSession,
      },
      rpc: mocks.rpc,
    });
    mocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mocks.signInWithOtp.mockResolvedValue({ error: null });
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: "admin-1", is_anonymous: false } } },
      error: null,
    });
  });

  it("sends a one-time admin link without creating arbitrary users", async () => {
    const { loginAdmin } = await import("./supabase");
    await loginAdmin(" admin@example.com ");
    expect(mocks.signInWithOtp).toHaveBeenCalledWith({
      email: "admin@example.com",
      options: {
        shouldCreateUser: false,
        emailRedirectTo: "https://keelung-accessible-map.vercel.app/admin",
      },
    });
  });

  it("grants UI admin state only after the database check and same-session check", async () => {
    const { subscribeAuthSession } = await import("./supabase");
    const next = vi.fn();
    subscribeAuthSession(next, vi.fn());
    const authCallback = mocks.onAuthStateChange.mock.calls[0][0];
    authCallback("SIGNED_IN", {
      user: { id: "admin-1", is_anonymous: false },
    });
    await vi.waitFor(() =>
      expect(next).toHaveBeenCalledWith(
        { uid: "admin-1", admin: true, anonymous: false },
        "SIGNED_IN",
      ),
    );
    expect(mocks.rpc).toHaveBeenCalledWith("is_admin");
  });

  it("never promotes an anonymous session even if the RPC says admin", async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: "anon-1", is_anonymous: true } } },
      error: null,
    });
    const { subscribeAuthSession } = await import("./supabase");
    const next = vi.fn();
    subscribeAuthSession(next, vi.fn());
    const authCallback = mocks.onAuthStateChange.mock.calls[0][0];
    authCallback("SIGNED_IN", {
      user: { id: "anon-1", is_anonymous: true },
    });
    await vi.waitFor(() =>
      expect(next).toHaveBeenCalledWith(
        { uid: "anon-1", admin: false, anonymous: true },
        "SIGNED_IN",
      ),
    );
  });

  it("does not apply an admin result after the session changes", async () => {
    let resolveAdmin!: (value: { data: boolean; error: null }) => void;
    mocks.rpc.mockReturnValue(
      new Promise((resolve) => {
        resolveAdmin = resolve;
      }),
    );
    const { subscribeAuthSession } = await import("./supabase");
    const next = vi.fn();
    subscribeAuthSession(next, vi.fn());
    const authCallback = mocks.onAuthStateChange.mock.calls[0][0];
    authCallback("SIGNED_IN", {
      user: { id: "admin-1", is_anonymous: false },
    });
    await vi.waitFor(() => expect(mocks.rpc).toHaveBeenCalled());
    authCallback("SIGNED_OUT", null);
    resolveAdmin({ data: true, error: null });
    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(null, "SIGNED_OUT"));
    expect(next).not.toHaveBeenCalledWith(
      { uid: "admin-1", admin: true, anonymous: false },
      "SIGNED_IN",
    );
  });
});
