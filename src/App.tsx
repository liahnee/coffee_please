import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";
import type { Session } from "@supabase/supabase-js";

type Comment = {
  id: string;
  created_at: string;
  user_id: string;
  user_name: string | null;
  user_avatar: string | null;
  text: string;
  emoji: string | null;
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString();
}

const PAGE_SIZE = 20;

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [comments, setComments] = useState<Comment[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [displayName, setDisplayName] = useState<string>("");
  const [savingName, setSavingName] = useState(false);

  const user = session?.user ?? null;
  const userId = user?.id ?? null;

  const meName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "Unknown";

  const meAvatar = user?.user_metadata?.avatar_url ?? "";

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const pageNumbers = useMemo(() => {
    const windowSize = 5;
    const half = Math.floor(windowSize / 2);

    let start = Math.max(1, page - half);
    let end = Math.min(totalPages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);

    const nums: number[] = [];
    for (let p = start; p <= end; p++) nums.push(p);
    return nums;
  }, [page, totalPages]);

  async function fetchComments(pageToLoad: number = page) {
    const from = (pageToLoad - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const baseQuery = supabase
      .from("comments")
      .select("id, created_at, user_id, user_name, user_avatar, text, emoji", {
        count: "exact",
      })
      .order("created_at", { ascending: false });

    const query = selectedUserId ? baseQuery.eq("user_id", selectedUserId) : baseQuery;

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error(error);
      return;
    }

    setComments((data as Comment[]) ?? []);
    setTotalCount(count ?? 0);
  }

  // Auth init + listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch when page/filter changes
  useEffect(() => {
    fetchComments(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedUserId]);

  // Polling (10초마다 현재 페이지/필터 유지하고 갱신)
  useEffect(() => {
    const id = setInterval(() => {
      fetchComments(page);
    }, 10000);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedUserId]);

  // Load nickname from profiles when logged in
  useEffect(() => {
    if (!userId) {
      setDisplayName("");
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error(error);
        setDisplayName(meName);
        return;
      }

      if (data?.display_name) setDisplayName(data.display_name);
      else setDisplayName(meName);
    })();
  }, [userId, meName]);

  async function signInWithGoogle() {
    const redirectTo =
      window.location.hostname === "localhost"
        ? "http://localhost:8888"
        : window.location.origin;

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSelectedUserId(null);
    setPage(1);
  }

  async function saveDisplayName() {
    if (!userId) return;

    const dn = displayName.trim().slice(0, 30);
    if (!dn) {
      alert("닉네임을 입력해줘!");
      return;
    }

    setSavingName(true);

    const { error } = await supabase.from("profiles").upsert({
      user_id: userId,
      display_name: dn,
      updated_at: new Date().toISOString(),
    });

    setSavingName(false);

    if (error) {
      alert(error.message);
      return;
    }

    // 저장 후 바로 갱신
    setPage(1);
    await fetchComments(1);
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    const trimmed = text.trim();
    if (!trimmed) return;

    const access_token = session?.access_token;
    if (!access_token) {
      alert("로그인이 필요해!");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/.netlify/functions/submitComment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token,
          user_name: (displayName || meName).trim().slice(0, 30),
          user_avatar: meAvatar,
          text: trimmed,
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        alert(msg);
        return;
      }

      setText("");
      // 새 글은 최신이니까 1페이지로 이동
      setPage(1);
      await fetchComments(1);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteComment(commentId: string) {
    if (!userId) {
      alert("로그인이 필요해!");
      return;
    }

    const ok = confirm("이 코멘트를 삭제할까?");
    if (!ok) return;

    const { error } = await supabase.from("comments").delete().eq("id", commentId);

    if (error) {
      alert(error.message);
      return;
    }

    // 삭제 후 현재 페이지 갱신
    // (현재 페이지가 비게 되는 경우가 있으면 자동으로 이전 페이지로 넘김)
    const nextTotal = Math.max(0, totalCount - 1);
    const nextTotalPages = Math.max(1, Math.ceil(nextTotal / PAGE_SIZE));
    const nextPage = Math.min(page, nextTotalPages);

    setPage(nextPage);
    await fetchComments(nextPage);
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>gombbin tracking</h1>
          <p style={{ margin: "6px 0 0", color: "#555" }}>
            곰삔에 대해 소소하게 한마디 남기기 🐻
          </p>
        </div>

        {!loading &&
          (user ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span
                style={{
                  maxWidth: 240,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {displayName || meName}
              </span>
              <button type="button" onClick={signOut}>
                Sign out
              </button>
            </div>
          ) : (
            <button type="button" onClick={signInWithGoogle}>
              Sign in with Google
            </button>
          ))}
      </header>

      {user && (
        <section
          style={{
            marginTop: 16,
            padding: 12,
            border: "1px solid #eee",
            borderRadius: 12,
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700 }}>내 닉네임</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={{ padding: 8, minWidth: 220 }}
              placeholder="내 닉네임"
              maxLength={30}
            />
            <button type="button" onClick={saveDisplayName} disabled={savingName}>
              {savingName ? "Saving..." : "Save"}
            </button>
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
            닉네임은 새 댓글부터 적용돼. (저장 후 자동 반영)
          </div>
        </section>
      )}

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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            marginTop: 10,
          }}
        >
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>

          {pageNumbers[0] !== 1 && (
            <>
              <button
                type="button"
                onClick={() => setPage(1)}
                style={{
                  fontWeight: page === 1 ? 800 : 400,
                  textDecoration: page === 1 ? "underline" : "none",
                }}
              >
                1
              </button>
              <span>…</span>
            </>
          )}

          {pageNumbers.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              style={{
                fontWeight: page === p ? 800 : 400,
                textDecoration: page === p ? "underline" : "none",
              }}
            >
              {p}
            </button>
          ))}

          {pageNumbers[pageNumbers.length - 1] !== totalPages && (
            <>
              <span>…</span>
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                style={{
                  fontWeight: page === totalPages ? 800 : 400,
                  textDecoration: page === totalPages ? "underline" : "none",
                }}
              >
                {totalPages}
              </button>
            </>
          )}

          <button
            type="button"
            disabled={!canNext}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>

          <span style={{ color: "#666", marginLeft: 6 }}>
            Page {page} / {totalPages} · Total {totalCount}
          </span>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {comments.map((c) => (
            <div
              key={c.id}
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
                    setSelectedUserId(c.user_id);
                    setPage(1);
                  }}
                  title="이 작성자만 보기"
                >
                  {c.user_name || "Unknown"}
                </strong>

                <span style={{ color: "#666", fontSize: 12 }}>
                  {formatDateTime(c.created_at)}
                </span>

                <span style={{ marginLeft: "auto", fontSize: 18 }}>{c.emoji ?? "💬"}</span>

                {userId === c.user_id && (
                  <button
                    type="button"
                    onClick={() => deleteComment(c.id)}
                    style={{ marginLeft: 6 }}
                    title="내 코멘트 삭제"
                  >
                    Delete
                  </button>
                )}
              </div>

              <p style={{ margin: "10px 0 0", whiteSpace: "pre-wrap" }}>{c.text}</p>
            </div>
          ))}

          {comments.length === 0 && (
            <p style={{ color: "#666" }}>
              아직 코멘트가 없어. 첫 한마디 남겨줘 🙂 (페이지 {page})
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
