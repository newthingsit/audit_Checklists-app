# Default Login Credentials

A default test user is automatically created when the database is first initialized.

## Default User Credentials

**Email:** `admin@test.com`  
**Password:** `admin123`  
**Name:** Admin User  
**Role:** admin

## Important Notes

⚠️ **For Production:** Change or remove the default user! This is only for development/testing.

## If Default User Doesn't Exist

If you've already run the server before this update, the default user won't exist. You have two options:

### Option 1: Delete Database and Restart (Recommended for Testing)

1. Stop the backend server
2. Delete the database file: `backend/data/audit.db`
3. Restart the backend server
4. The default user will be created automatically

### Option 2: Register a New User

1. Go to the web app registration page
2. Create a new account with any email and password
3. Use those credentials to login

## Creating Additional Users

You can register new users through:
- **Web App:** Click "Sign Up" on the login page
- **Mobile App:** Use the registration screen
- **API:** POST to `/api/auth/register`

## Security Reminder

🔒 **Never use default credentials in production!** Always:
- Change default passwords
- Use strong, unique passwords
- Consider removing the default user seeding in production
- Implement proper user management

