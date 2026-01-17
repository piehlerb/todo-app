# Tasks PWA

A mobile-first Progressive Web App for managing to-do lists with cloud sync.

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (no build tools)
- **Backend**: Supabase (Auth + PostgreSQL)
- **Hosting**: GitHub Pages (https://piehlerb.github.io/todo-app/)

## Project Structure

```
├── index.html      # Main HTML with all views and modals
├── app.js          # Application logic, Supabase integration
├── styles.css      # Mobile-first CSS with CSS variables
├── sw.js           # Service worker for offline caching
├── manifest.json   # PWA manifest
└── icons/
    └── icon.svg    # App icon (SVG)
```

## Supabase Configuration

- **Project URL**: https://itkpkxtzxsuclfudznak.supabase.co
- **Tables**: `lists`, `tasks` (both with RLS policies requiring `auth.uid() = user_id`)

### Database Schema

```sql
-- Lists table
CREATE TABLE lists (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    list_id TEXT REFERENCES lists(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    content TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
```

## Key Implementation Details

### Supabase Client Initialization

The Supabase JS client is loaded via CDN in `index.html`. The client must be initialized **after** DOMContentLoaded to ensure the CDN script has loaded:

```javascript
let supabaseClient = null;

function initSupabase() {
    if (window.supabase && window.supabase.createClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return true;
    }
    return false;
}
```

**Important**: Always use `supabaseClient` (not `supabase`) for database operations to avoid conflicts with the global `window.supabase` object.

### Authentication

- Email/password auth enabled
- Google OAuth configured (requires Supabase dashboard setup)
- Session persistence handled by Supabase client

### Offline Support

- Service worker caches static assets
- Local state maintained in memory (could add localStorage fallback)
- Syncs to Supabase when online and authenticated

## Development

No build step required. Serve files with any static server:

```bash
npx serve .
# or
python -m http.server 8000
```

## Deployment

Push to `master` branch - GitHub Pages auto-deploys from the repo root.

```bash
git add . && git commit -m "message" && git push origin master
```

## Common Issues

1. **"Cannot read properties of undefined (reading 'createClient')"** - Supabase CDN not loaded before app.js runs. Ensure initialization happens in DOMContentLoaded callback.

2. **Service worker cache errors** - Update `CACHE_NAME` version in sw.js when changing cached files. Clear browser cache or unregister service worker in DevTools.

3. **RLS policy errors** - Ensure user is authenticated before database operations. Check that `user_id` matches `auth.uid()` in queries.
