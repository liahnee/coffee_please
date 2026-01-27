import "./App.css";
import { useAuth } from "./hooks/useAuth";
import { useProfile } from "./hooks/useProfile";
import { useComments } from "./hooks/useComments";
import MainLayout from "./components/layout/MainLayout";
import DisplayNameEditor from "./features/profile/DisplayNameEditor";
import CommentForm from "./features/comments/CommentForm";
import CommentList from "./features/comments/CommentList";

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

  const { displayName, setDisplayName, saveDisplayName, savingName } = useProfile(
    userId,
    meName
  );

  const {
    comments,
    totalCount,
    selectedUserId,
    setSelectedUserId,
    page,
    setPage,
    text,
    setText,
    submitting,
    totalPages,
    canPrev,
    canNext,
    pageNumbers,
    fetchComments,
    submitComment: submitCommentAction,
    deleteComment,
  } = useComments(userId);

  const handleSignOut = async () => {
    await signOut();
    setSelectedUserId(null);
    setPage(1);
  };

  const handleSaveDisplayName = async () => {
    const success = await saveDisplayName();
    if (success) {
      setPage(1);
      await fetchComments(1);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitCommentAction(displayName, meName, meAvatar, session?.access_token);
  };

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
      <DisplayNameEditor
        user={user}
        displayName={displayName}
        setDisplayName={setDisplayName}
        saveDisplayName={handleSaveDisplayName}
        savingName={savingName}
      />

      <CommentForm
        user={user}
        text={text}
        setText={setText}
        submitComment={handleSubmitComment}
        submitting={submitting}
      />

      <CommentList
        selectedUserId={selectedUserId}
        fetchComments={fetchComments}
        setSelectedUserId={setSelectedUserId}
        setPage={setPage}
        page={page}
        comments={comments}
        userId={userId}
        deleteComment={deleteComment}
        totalPages={totalPages}
        totalCount={totalCount}
        pageNumbers={pageNumbers}
        canPrev={canPrev}
        canNext={canNext}
      />
    </MainLayout>
  );
}
