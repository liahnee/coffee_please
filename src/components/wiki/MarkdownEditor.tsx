
import { useState, useRef } from "react";
import Markdown from "react-markdown";
import { supabase } from "../../supabaseClient";
import type { WikiSection } from "../../types/wiki";

type MarkdownEditorProps = {
    value: string;
    onChange: (val: string) => void;
    sections: WikiSection[]; // For link autocomplete
};

export default function MarkdownEditor({ value, onChange, sections }: MarkdownEditorProps) {
    const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
    const [showLinkSearch, setShowLinkSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Insert text at cursor position
    const insertText = (text: string) => {
        const textarea = document.getElementById("wiki-editor-textarea") as HTMLTextAreaElement;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const prevText = textarea.value;
        const nextText = prevText.substring(0, start) + text + prevText.substring(end);

        onChange(nextText);

        // Restore focus and cursor (approximate)
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + text.length, start + text.length);
        }, 0);
    };

    const handleBold = () => insertText("**bold**");
    const handleItalic = () => insertText("*italic*");

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('wiki-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('wiki-images')
                .getPublicUrl(filePath);

            insertText(`![](${data.publicUrl})`);
        } catch (error: any) {
            console.error('Upload Error:', error);
            alert('Image upload failed: ' + error.message);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const filteredSections = sections.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div style={{ border: "1px solid var(--border-color)", borderRadius: 8, overflow: "hidden" }}>
            {/* Toolbar */}
            <div style={{
                padding: 8,
                borderBottom: "1px solid var(--border-color)",
                backgroundColor: "var(--bg-color)",
                display: "flex",
                gap: 8
            }}>
                <button type="button" onClick={handleBold} style={{ fontWeight: "bold" }}>B</button>
                <button type="button" onClick={handleItalic} style={{ fontStyle: "italic" }}>I</button>
                <button type="button" onClick={() => setShowLinkSearch(!showLinkSearch)}>Link</button>
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? "..." : "Image"}
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    style={{ display: "none" }}
                    accept="image/*"
                />

                <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                    <button
                        type="button"
                        onClick={() => setActiveTab("edit")}
                        style={{
                            backgroundColor: activeTab === "edit" ? "var(--border-color)" : "transparent",
                            color: "var(--text-color)"
                        }}
                    >
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("preview")}
                        style={{
                            backgroundColor: activeTab === "preview" ? "var(--border-color)" : "transparent",
                            color: "var(--text-color)"
                        }}
                    >
                        Preview
                    </button>
                </div>
            </div>

            {/* Helper: Link Search */}
            {showLinkSearch && (
                <div style={{ padding: 8, borderBottom: "1px solid var(--border-color)", backgroundColor: "#f5f5f5" }}>
                    <input
                        placeholder="Search section to link..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ width: "100%", padding: 6, marginBottom: 6 }}
                    />
                    <div style={{ maxHeight: 100, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                        {filteredSections.map(s => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                    insertText(`[[section:${s.id}]]`); // Insert ID token
                                    setShowLinkSearch(false);
                                    setSearchQuery("");
                                }}
                                style={{ textAlign: "left", fontSize: 13 }}
                            >
                                {s.title}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div style={{ minHeight: 300 }}>
                {activeTab === "edit" ? (
                    <textarea
                        id="wiki-editor-textarea"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        style={{
                            width: "100%",
                            height: 300,
                            padding: 12,
                            border: "none",
                            outline: "none",
                            fontFamily: "monospace",
                            fontSize: 14,
                            color: "var(--text-color)",
                            backgroundColor: "var(--bg-color)"
                        }}
                    />
                ) : (
                    <div style={{ padding: 16, backgroundColor: "var(--bg-color)", height: 300, overflowY: "auto" }}>
                        {/* 
                   Preview Renderer: Need to replace [[section:UUID]] with clickable links.
                   Since react-markdown doesn't do this natively with regex replacement easily in one pass 
                   without custom plugins, we can pre-process the markdown for preview.
                */}
                        <Markdown
                            components={{
                                img: ({ node, ...props }) => <img {...props} style={{ maxWidth: "100%" }} />
                            }}
                        >
                            {(() => {
                                // Replace tokens with resolved links for preview
                                let previewText = value;
                                const tokenRegex = /\[\[section:([a-f0-9-]+)\]\]/g;
                                previewText = previewText.replace(tokenRegex, (_, uuid) => {
                                    const found = sections.find(s => s.id === uuid);
                                    return found ? `[${found.title}](/wiki?slug=${found.slug})` : `[Unknown Link]`;
                                });
                                return previewText;
                            })()}
                        </Markdown>
                    </div>
                )}
            </div>
        </div>
    );
}
