import { createClient } from "@supabase/supabase-js";

const adminSupabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const anonSupabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

const BAD_WORDS = ["죽어", "병신", "시발", "fuck", "bitch"];
function hasBadWords(text) {
    const lower = text.toLowerCase();
    return BAD_WORDS.some((w) => lower.includes(w.toLowerCase()));
}

async function fetchWithTimeout(url, options, ms) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), ms);
    try {
        return await fetch(url, { ...options, signal: ctrl.signal });
    } finally {
        clearTimeout(id);
    }
}

async function moderateText(text) {
    try {
        const r = await fetchWithTimeout(
            "https://api.openai.com/v1/moderations",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "omni-moderation-latest",
                    input: text,
                }),
            },
            2000
        );

        if (!r.ok) {
            return { flagged: hasBadWords(text), fallback: true };
        }

        const data = await r.json();
        const flagged = Boolean(data?.results?.[0]?.flagged);
        return { flagged, fallback: false };
    } catch (e) {
        // timeout 등 → 금칙어 fallback
        return { flagged: hasBadWords(text), fallback: true };
    }
}

function pickEmojiFast(text) {
    const t = text.toLowerCase();
    if (t.includes("축하") || t.includes("congrats")) return "🎉";
    if (t.includes("사랑") || t.includes("love")) return "💖";
    if (t.includes("귀여") || t.includes("cute")) return "🥹";
    if (t.includes("최고") || t.includes("best")) return "🏆";
    if (t.includes("고마") || t.includes("thanks")) return "🙏";
    if (t.includes("곰삔") || t.includes("gombbin")) return "🐻";
    return "💬";
}

async function pickEmojiAI(text) {
    try {
        const r = await fetchWithTimeout(
            "https://api.openai.com/v1/responses",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "gpt-4.1-mini",
                    input: [
                        {
                            role: "user",
                            content: `다음 문장에 어울리는 이모지(emoji) 딱 1개만 출력해. 설명/텍스트 금지.\n문장: ${text}`,
                        },
                    ],
                }),
            },
            2000
        );

        if (!r.ok) {
            const errText = await r.text().catch(() => "");
            console.warn("emoji AI failed:", r.status, errText);
            return null;
        }

        const data = await r.json();
        const out = (data?.output_text || "").trim();
        if (!out || out.length > 8) {
            console.warn("emoji AI weird output:", out);
            return null;
        }
        return out;
    } catch (e) {
        console.warn("emoji AI exception:", e?.name, e?.message);
        return null;
    }
}

export async function handler(event) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const body = JSON.parse(event.body || "{}");
        const { access_token, text, user_name, user_avatar } = body;
        const safeName = (user_name ?? "").toString().trim().slice(0, 30) || null;

        if (!access_token) return { statusCode: 401, body: "Not signed in" };

        // 1) 토큰 검증 (사칭 방지)
        const { data: userData, error: userErr } = await anonSupabase.auth.getUser(access_token);
        if (userErr || !userData?.user) {
            return { statusCode: 401, body: "Invalid session" };
        }
        const user_id = userData.user.id;

        const trimmed = String(text || "").trim();
        if (!trimmed) return { statusCode: 400, body: "Empty" };
        if (trimmed.length > 300) return { statusCode: 400, body: "Too long" };

        // 2) OpenAI Moderation으로 욕설/유해 차단
        const mod = await moderateText(trimmed);

        if (mod.flagged) return { statusCode: 400, body: "Please keep it kind 🙂" };

        // 3) 이모지 추천
        const fastEmoji = pickEmojiFast(trimmed);
        const aiEmoji = await pickEmojiAI(trimmed);
        const emoji = aiEmoji ?? fastEmoji;

        // 4) 저장
        const { error } = await adminSupabase.from("comments").insert({
            user_id,
            user_name: safeName,
            user_avatar: user_avatar ?? null,
            text: trimmed,
            emoji,
        });

        if (error) return { statusCode: 500, body: error.message };

        return { statusCode: 200, body: JSON.stringify({ ok: true, emoji }) };
    } catch (e) {
        return { statusCode: 500, body: e?.message || "Server error" };
    }
}

async function deleteComment(commentId) {
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

    await fetchComments();
}
