# Frontend QA Checklist

Use this checklist when creating or updating frontend components to ensure quality and consistency.

## 🎨 Styling & Theming
- [ ] **Light/Dark Mode Visibility**: 
    - Switch to **Light Mode** and verify all text, buttons, and inputs are clearly visible and legible.
    - Switch to **Dark Mode** and verify the same.
    - *Common pitfalls*: White text on white background in inputs, dark text on dark background in dropdowns.
- [ ] **Responsiveness**: Check the component on mobile, tablet, and desktop breakpoints.

## 🧩 Functionality
- [ ] **Interactions**: Click all buttons and links. Do they perform the expected action?
- [ ] **Inputs**: Type into all fields. Do they handle spaces, special characters, and "Enter" key submission if applicable?
- [ ] **Empty States**: How does the component look with no data? (e.g., empty lists, null user profiles).

## ⚠️ Error Handling
- [ ] **Loading States**: Is there a visual indicator while data is fetching?
- [ ] **Error States**: What happens if the network request fails? Is the error message visible?
