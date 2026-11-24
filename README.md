# Secure Login Portal

## Features
- Register with name, email and password
- Login with email and password
- Passwords stored as bcrypt hashes, never as plain text
- HTTP-only JWT session cookie
- Admin-only endpoint to view user names, emails and registration dates (never password hashes)

## Run
1. `cp .env.example .env`
2. Generate secrets using `openssl rand -hex 32` (run twice). Put one in `JWT_SECRET`, another in `ADMIN_KEY`.
3. Set strong unique values for `DB_PASSWORD` and `MYSQL_ROOT_PASSWORD` in `.env`.
4. `docker compose up -d --build`
5. Open `http://YOUR_EC2_PUBLIC_IP:3000`

## View registered users
Use the admin key only from a trusted terminal:
`curl -H "x-admin-key: YOUR_ADMIN_KEY" http://localhost:3000/api/admin/users`

The endpoint returns profile fields only. It never returns password hashes.

Do not commit or share `.env`. For EC2 testing, allow TCP 3000 only from your current public IP in the Security Group.
