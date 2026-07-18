## 🛠️ Development Environment

- **Package Manager**: `bun` (use `bun run <script>`; note `bun test` runs Bun's runner, so use `bun run test` for Jest)

## 🧱 Component Guidelines

- Use `shadcn/ui` components by default for form elements, cards, dialogs, etc.
- Style components with Tailwind utility classes
- Co-locate CSS modules or component-specific styling in the same directory

## ⚛️ React Query Patterns

- Set up `QueryClient` in `app/layout.tsx`
- Use `useQuery`, `useMutation`, `useInfiniteQuery` from `@tanstack/react-query`
- Place API logic in `/lib/api/` and call via hooks
- Use query keys prefixed by domain: `['user', id]`

## 📝 Code Style Standards

- Prefer arrow functions
- Annotate return types
- Always destructure props
- Avoid `any` type, use `unknown` or strict generics
- Group imports: react → next → libraries → local

## 🔍 Documentation & Onboarding

- Each component and hook should include a short comment on usage
- Document top-level files (like `app/layout.tsx`) and configs
- Keep `README.md` up to date with getting started, design tokens, and component usage notes

## 🔐 Security

- Validate all server-side inputs (API routes)
- Use HTTPS-only cookies and CSRF tokens when applicable
- Protect sensitive routes with middleware or session logic
