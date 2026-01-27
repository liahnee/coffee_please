import type { Comment } from "../../types";

type CommentItemProps = {
    comment: Comment;
    userId: string | null;
    setSelectedUserId: (id: string) => void;
    setPage: (page: number) => void;
    deleteComment: (id: string) => void;
};

function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString();
}

export default function CommentItem({
    comment,
    userId,
    setSelectedUserId,
    setPage,
    deleteComment,
}: CommentItemProps) {
    return (
        <div
            style={{
                border: "1px solid #ddd",
                padding: 12,
                borderRadius: 12,
            }}
        >
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <strong
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                        setSelectedUserId(comment.user_id);
                        setPage(1);
                    }}
                    title="이 작성자만 보기"
                >
                    {comment.user_name || "Unknown"}
                </strong>

                <span style={{ color: "#666", fontSize: 12 }}>
                    {formatDateTime(comment.created_at)}
                </span>

                <span style={{ marginLeft: "auto", fontSize: 18 }}>{comment.emoji ?? "💬"}</span>

                {userId === comment.user_id && (
                    <button
                        type="button"
                        onClick={() => deleteComment(comment.id)}
                        style={{ marginLeft: 6 }}
                        title="내 코멘트 삭제"
                    >
                        Delete
                    </button>
                )}
            </div>

            <p style={{ margin: "10px 0 0", whiteSpace: "pre-wrap" }}>{comment.text}</p>
        </div>
    );
}
