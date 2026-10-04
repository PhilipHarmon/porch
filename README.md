# Porch

A friendly little social network — a Facebook-style MVP built with the MERN stack
(MongoDB, Express, React 18 + Vite, Node). Post updates, add friends, like and
comment, and get notified when people interact with you.

> **Name note:** "Porch" is a placeholder. Rename it in
> `client/index.html` (`<title>`), `client/src/components/Header.jsx`
> (the logo text), and `client/src/App.jsx` (footer line).

## Features

- **Auth** — register / login with JWT (7-day tokens), session restore on reload
- **Feed** — posts from you + your friends, newest first, paginated
- **Posts** — text + optional image URL, like toggle, threaded comments, delete your own
- **Friends** — send / accept / decline requests, unfriend, search users by name
- **Profiles** — avatar, cover photo, bio, friend count, editable own profile
- **Notifications** — friend requests, accepts, likes, comments; unread badge in the header

## API routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | – | name, email, password → token + user |
| POST | /api/auth/login | – | email, password → token + user |
| GET | /api/auth/me | ✓ | current user |
| GET | /api/users/search?q= | ✓ | name search (excludes self) |
| GET | /api/users/:id | optional | profile + friend count + friendship status |
| PUT | /api/users/me | ✓ | update name, bio, avatarUrl, coverUrl |
| POST | /api/friends/request | ✓ | { recipientId } |
| POST | /api/friends/accept | ✓ | { requesterId } |
| POST | /api/friends/decline | ✓ | { requesterId } |
| DELETE | /api/friends/:friendId | ✓ | unfriend |
| GET | /api/friends | ✓ | my friends list |
| GET | /api/friends/requests | ✓ | pending requests I received |
| POST | /api/posts | ✓ | { text, imageUrl? } |
| GET | /api/posts?author=:id | – | posts by one author (paginated) |
| GET | /api/posts/:id | optional | single post with counts |
| PUT | /api/posts/:id | ✓ | edit own post |
| DELETE | /api/posts/:id | ✓ | delete own post (+ its likes/comments) |
| POST | /api/posts/:id/like | ✓ | toggle like |
| GET | /api/posts/:id/comments | – | comments, oldest first |
| POST | /api/posts/:id/comments | ✓ | { text } |
| GET | /api/feed | ✓ | me + friends, newest first (?page=&limit=) |
| GET | /api/notifications | ✓ | mine, newest first |
| GET | /api/notifications/unread-count | ✓ | badge count |
| POST | /api/notifications/read | ✓ | mark all read |
| POST | /api/notifications/:id/read | ✓ | mark one read |

Notifications are created server-side on: friend request received, request
accepted, someone likes your post, someone comments on your post (never for
your own actions).

## Local setup

**Prerequisites:** Node 18+, and MongoDB — either a local `mongod` or a free
[MongoDB Atlas](https://www.mongodb.com/atlas) M0 cluster.

```bash
# 1. Backend
cd server
npm install
cp .env.example .env
# edit .env: set MONGO_URI and JWT_SECRET (any long random string)

# 2. Seed demo data (6 users, friendships, posts, likes, comments)
npm run seed
# Demo password for every account (maya@example.com, jordan@example.com, …):
# password123

# 3. Start the API
npm start   # http://localhost:5000

# 4. Frontend (new terminal)
cd ../client
npm install
cp .env.example .env   # VITE_API_URL defaults to http://localhost:5000/api
npm run dev            # http://localhost:5173
```

The seed script is idempotent — it skips entirely if any users already exist,
so it's safe to re-run.

## Deploying on Render

1. Push this folder to a GitHub repo.
2. Render dashboard → **New → Blueprint** → select `render.yaml`.
3. Fill in the `sync: false` values when prompted:
   - API service: `MONGO_URI` (Atlas connection string), `CLIENT_URL`
     (set *after* the client deploys, exactly `https://<client>.onrender.com`).
   - Client service: `VITE_API_URL` (set *after* the API deploys,
     `https://<api>.onrender.com/api`).
   - `JWT_SECRET` is generated automatically.
4. The API's pre-deploy command runs the seed script on every deploy
   (it no-ops once users exist).

Notes:

- `CLIENT_URL` must match the client origin exactly — no trailing slash —
  or login/session calls will fail CORS in production.
- Vite bakes `VITE_API_URL` in at build time: changing it requires a client
  redeploy (clear build cache if the old URL sticks).

## Project layout

```
server/
  config/db.js          Mongo connection + global _id→id serialization plugin
  middleware/auth.js    authRequired / optionalAuth JWT middleware
  models/               User, Friendship, Post, Like, Comment, Notification
  routes/               auth, users, friends, posts, feed, notifications
  server.js             Express app
  seed.js               demo data (idempotent)
client/
  src/
    api.js              axios instance with JWT interceptor
    auth.jsx            AuthContext (login/register/logout/session)
    components/         Header, Avatar, Composer, PostCard, CommentSection,
                        FriendButton, ProtectedRoute
    pages/              Auth, Feed, Profile, Friends, Notifications
    index.css           warm-friendly global stylesheet
```

### A note on the `_id` → `id` plugin

Every Mongoose schema gets a global plugin (registered in
`server/config/db.js` **before any model loads**) that renames `_id` to `id`
and strips `__v` — on **both** `toJSON` and `toObject`. The client only ever
sees `id`. If you add a route that builds responses with `post.toObject()`
or object spread, the `id` field is still there because `toObject` is covered
too — this exact gap caused real production bugs before, so don't remove it.
