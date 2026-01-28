import { NavLink } from "react-router-dom";

export default function Tabs() {
    const linkStyle = ({ isActive }: { isActive: boolean }) => ({
        textDecoration: "none",
        color: isActive ? "var(--nav-active)" : "var(--nav-inactive)",
        fontWeight: isActive ? 700 : 400,
        borderBottom: isActive ? "2px solid var(--nav-active)" : "2px solid transparent",
        paddingBottom: 4,
        fontSize: 14,
    });

    return (
        <nav style={{ display: "flex", gap: 20, marginTop: 12, borderBottom: "1px solid #eee" }}>
            <NavLink to="/" style={linkStyle}>
                Tracks
            </NavLink>
            <NavLink to="/wiki" style={linkStyle}>
                Wiki
            </NavLink>
        </nav>
    );
}
