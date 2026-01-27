import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import type { Comment } from "../types";

const PAGE_SIZE = 20;

export function useComments(userId: string | null) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [text, setText] = useState("");
    const [submitting, setSubmitting] = useState(false);

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

    useEffect(() => {
        fetchComments(page);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, selectedUserId]);

    useEffect(() => {
        const id = setInterval(() => {
            fetchComments(page);
        }, 10000);

        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, selectedUserId]);

    async function submitComment(
        displayName: string,
        meName: string,
        meAvatar: string,
        access_token: string | undefined
    ) {
        if (!userId) return;

        const trimmed = text.trim();
        if (!trimmed) return;

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

        const nextTotal = Math.max(0, totalCount - 1);
        const nextTotalPages = Math.max(1, Math.ceil(nextTotal / PAGE_SIZE));
        const nextPage = Math.min(page, nextTotalPages);

        setPage(nextPage);
        await fetchComments(nextPage);
    }

    return {
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
        submitComment,
        deleteComment,
    };
}
