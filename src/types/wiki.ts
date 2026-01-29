export type WikiSection = {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    parent_id: string | null;
    depth: number;
    order_index: number;
    created_at: string;
    is_deleted: boolean;
};

export type TocNode = {
    id: string;
    title: string;
    slug: string;
    parent_id: string | null;
    order_index: number | null;
    children: TocNode[];
    data: WikiSection;
};

export type WikiSectionVersion = {
    id: string;
    section_id: string;
    content: string;
    created_at: string;
    created_by: string;
    source_request_id: string | null;
};

export type WikiLatestVersion = {
    section_id: string;
    content: string;
    created_at: string;
    created_by: string;
    source_request_id: string | null;
};

export type WikiEditRequest = {
    id: string;
    request_type: 'add_section' | 'edit_section' | 'delete_section';
    status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
    section_id: string | null;
    parent_section_id: string | null;
    proposed_title: string | null;
    proposed_slug: string | null;
    proposed_content: string | null;
    proposed_order_index: number | null;
    proposed_parent_id: string | null;
    base_version_id: string | null;
    requested_by: string;
    requested_at: string;
    review_note: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
};

export type WikiEditMode = 'add' | 'edit' | 'delete';
