type CommentFormProps = {
    user: any;
    text: string;
    setText: (text: string) => void;
    submitComment: (e: React.FormEvent) => void;
    submitting: boolean;
};

export default function CommentForm({
    user,
    text,
    setText,
    submitComment,
    submitting,
}: CommentFormProps) {
    return (
        <section style={{ marginTop: 16 }}>
            {!user ? (
                <p>코멘트 작성은 Google 로그인 후 가능해. (익명 불가)</p>
            ) : (
                <form onSubmit={submitComment} style={{ display: "flex", gap: 8 }}>
                    <input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="곰삔에 대해 한마디..."
                        style={{ flex: 1, padding: 10 }}
                    />
                    <button disabled={submitting}>{submitting ? "Submitting..." : "Submit"}</button>
                </form>
            )}
        </section>
    );
}
