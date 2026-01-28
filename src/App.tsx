import { Routes, Route, Outlet } from "react-router-dom";
import "./App.css";
import { useAuth } from "./hooks/useAuth";
import { useProfile } from "./hooks/useProfile";
import MainLayout from "./components/layout/MainLayout";
import Tabs from "./components/layout/Tabs";
import TracksPage from "./pages/TracksPage";
import WikiPage from "./pages/WikiPage";
import ProfilePage from "./pages/ProfilePage";

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

  const { displayName, saveDisplayName, savingName } = useProfile(
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

  return (
    <MainLayout
      headerProps={{
        loading,
        user,
        displayName,
        meName,
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
          <Route
            path="/profile"
            element={
              <ProfilePage
                user={user}
                displayName={displayName}
                saveDisplayName={saveDisplayName}
                savingName={savingName}
              />
            }
          />
        </Route>
      </Routes>
    </MainLayout>
  );
}
