import { Routes, Route, Outlet } from "react-router-dom";
import "./App.css";
import { useAuth } from "./hooks/useAuth";
import { useProfile } from "./hooks/useProfile";
import MainLayout from "./components/layout/MainLayout";
import Tabs from "./components/layout/Tabs";
import TracksPage from "./pages/TracksPage";
import WikiPage from "./pages/WikiPage";
import ProfilePage from "./pages/ProfilePage";
import AdminRoute from "./components/auth/AdminRoute";
import WikiRequestsPage from "./pages/admin/WikiRequestsPage";
import { useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function App() {
  const {
    session,
    user,
    userId,
    meName,
    meAvatar,
    loading,
    signInWithGoogle,
    signOut,
  } = useAuth();

  const { displayName, saveDisplayName, savingName, isAdmin } = useProfile(
    userId,
    meName
  );

  const handleSignOut = async () => {
    await signOut();
  };

  const TabsLayout = () => (
    <>
      <Tabs />
      <Outlet />
    </>
  );

  useEffect(() => {
    const user = session?.user;
    if (!user) return;

    const userId = user.id;

    const email = user.email ?? null;
    const fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      null;

    const avatarUrl = user.user_metadata?.avatar_url ?? null;

    // 구글 고유 id는 있을 수도/없을 수도 있음 (없으면 null)
    const googleSub =
      user.identities?.find((i) => i.provider === "google")?.id ||
      user.user_metadata?.sub ||
      null;

    (async () => {
      // To avoid overwriting a manually set display_name, fetch it first
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", userId)
        .maybeSingle();

      const { error } = await supabase.from("profiles").upsert(
        {
          user_id: userId,
          email,
          google_sub: googleSub,
          full_name: fullName,
          avatar_url: avatarUrl,
          display_name: existingProfile?.display_name || fullName || meName || "익명",
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (error) console.error("profiles upsert error:", error.message);
    })();
  }, [session]);

  return (
    <MainLayout
      headerProps={{
        loading,
        user,
        displayName,
        meName,
        isAdmin,
        onSignOut: handleSignOut,
        onSignIn: signInWithGoogle,
      }}
    >
      <Routes>
        <Route element={<TabsLayout />}>
          <Route
            path="/"
            element={
              <TracksPage
                user={user}
                userId={userId}
                meName={meName}
                meAvatar={meAvatar}
                sessionToken={session?.access_token}
                displayName={displayName}
              />
            }
          />
          <Route path="/wiki" element={<WikiPage />} />
          <Route path="/profile"
            element={
              <ProfilePage
                user={user}
                displayName={displayName}
                saveDisplayName={saveDisplayName}
                savingName={savingName}
              />
            }
          />

          {/* Admin Routes */}
          <Route element={<AdminRoute />}>
            <Route path="/admin/wiki-requests" element={<WikiRequestsPage />} />
          </Route>
        </Route>
      </Routes>
    </MainLayout>
  );
}
