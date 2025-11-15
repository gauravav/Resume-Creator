# Resume Creator - Codebase Architecture Analysis

## Project Overview

**Resume Creator** is a full-stack web application for AI-powered resume customization and management. It features:
- User authentication with email verification
- Resume parsing and JSON storage
- AI-powered resume customization for job descriptions
- PDF generation
- Token-based usage tracking
- Admin dashboard
- Dark/Light theme support

---

## 1. Frontend Framework & Architecture

### Framework Stack
- **Framework**: Next.js 15.5.2 (React 19.1.0)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 + Styled-JSX
- **Package Manager**: npm
- **Build Tool**: Turbopack (enabled for faster builds)

### Key Dependencies
```json
{
  "@hookform/resolvers": "^5.2.1",  // Form validation
  "axios": "^1.11.0",                 // HTTP client
  "js-cookie": "^3.0.5",              // Cookie management
  "jwt-decode": "^4.0.0",             // JWT token parsing
  "lucide-react": "^0.542.0",         // Icon library
  "react-hook-form": "^7.62.0",       // Form management
  "zod": "^4.1.5"                     // Schema validation
}
```

---

## 2. Project Structure

```
Resume-Creator/
├── Frontend/
│   ├── src/
│   │   ├── app/                    # Next.js app directory (file-based routing)
│   │   │   ├── layout.tsx          # Root layout with theme & auth
│   │   │   ├── page.tsx            # Home page
│   │   │   ├── login/              # Login page + layout
│   │   │   ├── register/           # Registration page + layout
│   │   │   ├── dashboard/          # Dashboard (protected route)
│   │   │   ├── parse-resume/       # Resume upload/parsing page
│   │   │   ├── edit-resume/        # Resume editing page
│   │   │   ├── create/             # Custom resume creation
│   │   │   ├── account/            # Account settings
│   │   │   ├── admin/              # Admin dashboard
│   │   │   ├── token-history/      # Token usage history
│   │   │   └── verify-email/       # Email verification
│   │   ├── components/             # Reusable React components
│   │   │   ├── Layout.tsx          # Global layout wrapper
│   │   │   ├── ConfirmDialog.tsx   # Confirmation modal
│   │   │   ├── ToastContainer.tsx  # Toast notification system
│   │   │   ├── Toast.tsx           # Individual toast
│   │   │   ├── ThemeToggle.tsx     # Dark/Light theme toggle
│   │   │   ├── CustomResumeForm.tsx
│   │   │   ├── EditableResumeForm.tsx
│   │   │   ├── ParsingGames.tsx
│   │   │   └── ... (other components)
│   │   ├── contexts/               # React Context API
│   │   │   └── ThemeContext.tsx    # Global theme state
│   │   ├── lib/                    # Utilities & APIs
│   │   │   ├── api.ts             # Axios API client with interceptors
│   │   │   ├── auth.ts            # Auth utilities & JWT handling
│   │   │   ├── llm.ts             # LLM integration
│   │   │   └── timezone.ts        # Timezone utilities
│   │   ├── utils/                 # Helper functions
│   │   ├── types/                 # TypeScript type definitions
│   │   │   └── resume.ts
│   │   └── middleware.ts          # Next.js middleware for auth
│   ├── public/                    # Static assets
│   ├── next.config.ts
│   ├── tsconfig.json
│   └── package.json
│
└── Backend/
    ├── src/
    │   ├── index.js               # Express server entry point
    │   ├── config/                # Configuration files
    │   ├── controllers/           # Request handlers
    │   ├── routes/                # API routes
    │   ├── models/                # Database models
    │   ├── middleware/            # Express middleware
    │   ├── services/              # Business logic
    │   ├── utils/                 # Helper utilities
    │   ├── workers/               # Background job workers
    │   └── prompts/               # AI prompt templates
    └── package.json
```

---

## 3. Authentication & Login Flow

### Authentication System
- **Token Storage**: JWT tokens stored in secure HTTP-only cookies (`js-cookie`)
- **Token Validation**: JWT decoded locally and validated with server
- **Token Expiration**: Default 7 days (configured in `setToken()`)

### Login Flow
**File**: `/Users/gauravavula/Projects/Resume-Creator/Frontend/src/app/login/page.tsx`

```typescript
// Key components:
1. Form validation using Zod + React Hook Form
2. Email/Password credentials submitted to /api/auth/login
3. Token stored via setToken() - saved to cookies
4. Error handling with specific codes:
   - EMAIL_NOT_VERIFIED: Show resend email button
   - PENDING_APPROVAL: Account awaiting admin approval
   - ACCOUNT_REJECTED: Account application rejected
5. Redirect to /dashboard on success
```

### Authentication Utils
**File**: `/Users/gauravavula/Projects/Resume-Creator/Frontend/src/lib/auth.ts`

```typescript
- setToken(token)                    // Save JWT to cookies
- getToken()                         // Retrieve JWT from cookies
- removeToken()                      // Clear JWT from cookies
- isAuthenticated()                  // Check local JWT validity
- getCurrentUser()                   // Decode JWT payload
- validateTokenWithServer()          // Server-side validation
- isAuthenticatedWithValidation()    // Full validation (local + server)
```

### Middleware Protection
**File**: `/Users/gauravavula/Projects/Resume-Creator/Frontend/src/middleware.ts`

```typescript
// Protected routes:
- /dashboard*              → Requires valid token
- /edit-resume/*           → Requires valid token
- /parse-resume*           → Requires valid token
- /create*                 → Requires valid token
- /account*                → Requires valid token

// Public routes (redirect if authenticated):
- /login
- /register
```

---

## 4. Main Dashboard Location & Structure

### Dashboard Page
**File**: `/Users/gauravavula/Projects/Resume-Creator/Frontend/src/app/dashboard/page.tsx`

This is the main user interface after login with the following sections:

#### Key Features:
1. **Header Navigation**
   - Resume Creator branding
   - Theme toggle (dark/light)
   - User profile dropdown menu
   - Logout button

2. **Token Usage Section**
   - Display total tokens used
   - View token history link
   - Reset token count button

3. **Action Cards**
   - "New Resume" button → `/parse-resume` (upload & parse resume)
   - "Create Custom Resume" button → `/create` (AI customization)

4. **Resume List**
   - Table of user's resumes
   - Each resume shows:
     - Original filename
     - Upload date (formatted by timezone)
     - File size
     - Action buttons:
       - Edit (pencil icon) → `/edit-resume/{id}`
       - Download PDF
       - Download JSON
       - Delete

5. **Real-time PDF Status Updates**
   - SSE (Server-Sent Events) subscription for PDF generation status
   - Updates resume list when PDFs are generated

#### User Data Loaded:
```typescript
- User info (firstName, lastName, email, isAdmin)
- Resumes list with metadata
- Token usage statistics
- User timezone from profile
```

---

## 5. User Data & Preferences Storage

### Storage Locations

#### 1. **Cookies** (via `js-cookie`)
- **JWT Token**: `token` cookie (7-day expiration)
- **Secure storage** with standard browser cookie security

#### 2. **localStorage** (Browser)
- **Theme preference**: `theme` value ('light', 'dark', or 'system')
- **Session messages**: `successMessage` (for post-redirect messages)

#### 3. **Database** (PostgreSQL backend)
- **User Profile**:
  - `first_name`, `last_name`
  - `email` (verified flag)
  - `timezone` (stored preference)
  - `password_hash`
  - Account status (verified, pending_approval, rejected)

- **Resumes**:
  - Original filename, upload date
  - File references (JSON, PDF filenames)
  - Base resume flag
  - PDF generation status

- **Token Usage**:
  - Total tokens consumed
  - Per-request token tracking

### Data Retrieval Points

**Profile Data**:
```typescript
// File: /Users/gauravavula/Projects/Resume-Creator/Frontend/src/app/account/page.tsx
accountApi.getProfile()         // Get user profile + timezone
accountApi.getTimezones()       // Get available timezone options
authApi.getMe()                 // Get current user info from JWT
```

**Resume Data**:
```typescript
// File: /Users/gauravavula/Projects/Resume-Creator/Frontend/src/lib/api.ts
resumeApi.getAll()              // List all user resumes
resumeApi.getParsedData(id)     // Get parsed resume JSON
resumeApi.updateParsedData(id)  // Update resume data
```

---

## 6. Modal & Dialog Components

### Existing Modal/Dialog Components

#### 1. **ConfirmDialog Component**
**File**: `/Users/gauravavula/Projects/Resume-Creator/Frontend/src/components/ConfirmDialog.tsx`

```typescript
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;        // Default: "Confirm"
  cancelText?: string;         // Default: "Cancel"
  isLoading?: boolean;
}
```

**Features**:
- Centered modal with backdrop blur
- Click-outside-to-close functionality
- Loading state for async operations
- X button to close
- Used for destructive actions (e.g., delete resume)

**Usage Example** (from dashboard):
```typescript
<ConfirmDialog
  isOpen={deleteDialog.isOpen}
  onClose={handleDeleteCancel}
  onConfirm={handleDeleteConfirm}
  title="Delete Resume"
  message={`Are you sure you want to delete "${deleteDialog.resumeName}"?`}
  confirmText="Delete"
  cancelText="Cancel"
  isLoading={isDeleting === deleteDialog.resumeId}
/>
```

#### 2. **Toast Notification System**
**File**: `/Users/gauravavula/Projects/Resume-Creator/Frontend/src/components/ToastContainer.tsx`
**File**: `/Users/gauravavula/Projects/Resume-Creator/Frontend/src/components/Toast.tsx`

```typescript
interface ToastData {
  id: string;
  type: 'success' | 'error' | 'warning';
  message: string;
  duration?: number;  // Auto-close after (ms), default 4000
  timestamp?: number;
}

// Usage hook:
const { showToast } = useToast();
showToast({
  type: 'success',
  message: 'Operation successful!',
  duration: 3000
});
```

**Features**:
- Positioned bottom-right (fixed)
- Auto-dismiss after duration
- Deduplication for rate-limit toasts
- Custom event support via `CustomEvent`
- Supports HTML messages with emojis

#### 3. **Other Dialog Components**
**File**: `/Users/gauravavula/Projects/Resume-Creator/Frontend/src/components/ResponsibilityRewriteDialog.tsx`
- Custom dialog for rewriting responsibilities

**File**: `/Users/gauravavula/Projects/Resume-Creator/Frontend/src/components/SaveCustomResumeDialog.tsx`
- Dialog for saving customized resumes

### Modal/Dialog Stack
- Modals use `z-[60]` or `z-50` to layer above page content
- Backdrop blur effect: `backdrop-blur-md`
- Centered positioning with flexbox

---

## 7. Theme & Styling System

### Theme Management
**File**: `/Users/gauravavula/Projects/Resume-Creator/Frontend/src/contexts/ThemeContext.tsx`

```typescript
type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;              // User's preference
  actualTheme: 'light' | 'dark';  // Resolved theme
  setTheme: (theme: Theme) => void;
}
```

**Features**:
- System preference detection
- localStorage persistence
- Real-time theme switching
- Applied via `document.documentElement.classList`

### CSS Framework
- **Tailwind CSS 4** for utility-first styling
- **Styled-JSX** for component-scoped styles
- Dark mode: `.dark` class on `<html>` element
- Custom animations (floating resumes, particles, blob effects)

### Color Scheme
- Primary: Indigo/Purple gradient
- Accent: Cyan, Pink, Yellow
- Dark mode support for all components

---

## 8. API Integration

### API Client Setup
**File**: `/Users/gauravavula/Projects/Resume-Creator/Frontend/src/lib/api.ts`

```typescript
// Dynamic API URL based on current hostname
const API_BASE_URL = getApiBaseUrl();  // Uses port 3200 for backend

// Axios instance with interceptors:
- Request: Adds JWT token to Authorization header
- Response: Handles 401 errors, rate limiting (429)
```

### API Modules

**Auth API**:
```typescript
authApi.login(credentials)
authApi.register(credentials)
authApi.getMe()
authApi.validateToken()
authApi.verifyEmail(token)
authApi.resendVerificationEmail(email)
```

**Resume API**:
```typescript
resumeApi.getAll()
resumeApi.getParsedData(resumeId)
resumeApi.updateParsedData(resumeId, data)
resumeApi.parse(file)           // Upload & parse resume
resumeApi.download(fileName)
resumeApi.downloadPDF(resumeId)
resumeApi.delete(resumeId)
resumeApi.subscribeToPDFUpdates() // SSE connection
```

**Account API**:
```typescript
accountApi.getProfile()
accountApi.updateProfile(updates)
accountApi.getTimezones()
accountApi.changePassword(data)
```

**Token API**:
```typescript
tokenApi.getCurrentUsage()
tokenApi.resetTokenCount()
tokenApi.getHistory()
```

---

## 9. Form Handling & Validation

### Form Libraries
- **React Hook Form** (`react-hook-form`): Form state management
- **Zod** (`zod`): Schema validation
- **@hookform/resolvers**: Bridge between Hook Form and Zod

### Example (Login Form)
```typescript
const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required')
});

type LoginForm = z.infer<typeof loginSchema>;

const { register, handleSubmit, formState: { errors } } = 
  useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });
```

---

## 10. State Management

### Global State
- **ThemeContext**: Theme preference (light/dark/system)
- **ToastContainer**: Toast notification management

### Component State
- Most state managed locally with `useState`
- No Redux or other global state management libraries
- Server state fetched via API calls

### Session State
- JWT token in cookies (persistent across sessions)
- Theme preference in localStorage (persistent)

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `/app/layout.tsx` | Root layout with ThemeProvider & ToastContainer |
| `/app/dashboard/page.tsx` | Main dashboard after login |
| `/app/login/page.tsx` | Login page |
| `/components/ConfirmDialog.tsx` | Reusable confirmation modal |
| `/components/ToastContainer.tsx` | Toast notification system |
| `/contexts/ThemeContext.tsx` | Global theme state |
| `/lib/auth.ts` | Authentication utilities |
| `/lib/api.ts` | API client with interceptors |
| `/middleware.ts` | Route protection middleware |

---

## Design Patterns Used

1. **Client Components**: Heavy use of `'use client'` directive for interactivity
2. **Hook Pattern**: React hooks for state, effects, callbacks
3. **Context API**: Global state (theme)
4. **Custom Hooks**: `useToast()` for notifications
5. **Interceptors**: API request/response middleware for auth & error handling
6. **SSE**: Server-Sent Events for real-time PDF status updates

---

## Recommendations for Tutorial Feature Implementation

Based on this architecture, here are key integration points for a tutorial system:

1. **Storage**: Use localStorage for tutorial progress/completion
2. **Context**: Create new `TutorialContext` for global tutorial state
3. **Components**: Create `TutorialOverlay` and `TutorialTooltip` components
4. **Modals**: Leverage existing `ConfirmDialog` structure for tutorial steps
5. **API**: Add `tutorialApi` endpoints to track completion server-side
6. **Styling**: Use Tailwind classes matching existing design system
7. **Hooks**: Create `useTutorial()` hook for components to participate
8. **Routes**: Register tutorial state in middleware for first-time users

