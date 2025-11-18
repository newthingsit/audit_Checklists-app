# Login Credentials

## Default Users

The application creates default users on first startup:

### User 1
- **Email:** `admin@test.com`
- **Password:** `admin123`
- **Role:** Admin

### User 2
- **Email:** `admin@example.com`
- **Password:** `admin123`
- **Role:** Admin

## Creating Additional Users

### Option 1: Use Registration Page
1. Go to `/register` page
2. Fill in the registration form
3. Create a new account

### Option 2: Create via Script
```bash
cd backend
node scripts/create-admin-user.js
```

This will create a user with:
- Email: `admin@example.com`
- Password: `admin123`

### Option 3: Manual Database Entry
If you need to create a user manually, you can use SQLite:

```bash
cd backend
sqlite3 data/audit.db

# Then in SQLite:
INSERT INTO users (email, password, name, role) 
VALUES ('your-email@example.com', 'hashed_password', 'Your Name', 'admin');
```

Note: Password must be hashed using bcrypt.

## Troubleshooting Login Issues

### Issue: "Invalid credentials"
1. Check if user exists in database
2. Verify password is correct
3. Check if password was hashed correctly
4. Try resetting by deleting and recreating user

### Issue: User doesn't exist
1. Check database initialization
2. Run the create user script
3. Or register a new user via the web interface

## Password Reset

To reset a password, you can:
1. Delete the user from database
2. Restart the server (will recreate default users)
3. Or manually update the password hash in database

## Security Note

⚠️ **Important:** Change default passwords in production!
These are default credentials for development/testing only.

