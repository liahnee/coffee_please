import { useComments } from "../hooks/useComments";
import CommentForm from "../features/comments/CommentForm";
import CommentList from "../features/comments/CommentList";

type TracksPageProps = {
    user: any;
    userId: string | null;
    meName: string;
    meAvatar: string;
    sessionToken: string | undefined;
    displayName: string;
};

export default function TracksPage({
    user,
    userId,
    meName,
    meAvatar,
    sessionToken,
    displayName,
}: TracksPageProps) {
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

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        await submitCommentAction(displayName, meName, meAvatar, sessionToken);
    };

    return (
        <>
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
        </>
    );
}
