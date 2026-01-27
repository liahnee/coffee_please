export type Comment = {
    id: string;
    created_at: string;
    user_id: string;
    user_name: string | null;
    user_avatar: string | null;
    text: string;
    emoji: string | null;
};
