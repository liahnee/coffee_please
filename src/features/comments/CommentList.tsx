import CommentItem from "./CommentItem";
import Pagination from "./Pagination";
import type { Comment } from "../../types";

type CommentListProps = {
    selectedUserId: string | null;
    fetchComments: (page?: number) => Promise<void>;
    setSelectedUserId: (id: string | null) => void;
    setPage: (page: number | ((prev: number) => number)) => void;
    page: number;
    comments: Comment[];
    userId: string | null;
    deleteComment: (id: string) => void;
    totalPages: number;
    totalCount: number;
    pageNumbers: number[];
    canPrev: boolean;
    canNext: boolean;
};

export default function CommentList({
    selectedUserId,
    fetchComments,
    setSelectedUserId,
    setPage,
    page,
    comments,
    userId,
    deleteComment,
    totalPages,
    totalCount,
    pageNumbers,
    canPrev,
    canNext,
}: CommentListProps) {
    return (
        <section style={{ marginTop: 18 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>
                    Comments{" "}
                    <span style={{ color: "#888", fontSize: 13 }}>
                        ({selectedUserId ? "filtered" : "all"})
                    </span>
                </h2>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => fetchComments(page)}>
                        Refresh
                    </button>

                    {selectedUserId && (
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedUserId(null);
                                setPage(1);
                            }}
                        >
                            Clear filter
                        </button>
                    )}
                </div>
            </div>

            {/* Pagination controls */}
            <Pagination
                page={page}
                totalPages={totalPages}
                totalCount={totalCount}
                pageNumbers={pageNumbers}
                canPrev={canPrev}
                canNext={canNext}
                setPage={setPage}
            />

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {comments.map((c) => (
                    <CommentItem
                        key={c.id}
                        comment={c}
                        userId={userId}
                        setSelectedUserId={setSelectedUserId}
                        setPage={setPage as (page: number) => void}
                        deleteComment={deleteComment}
                    />
                ))}

                {comments.length === 0 && (
                    <p style={{ color: "#666" }}>
                        아직 코멘트가 없어. 첫 한마디 남겨줘 🙂 (페이지 {page})
                    </p>
                )}
            </div>
        </section>
    );
}
