# Reset MySQL Root Password

Since the current password isn't working, here are steps to reset it:

## Option 1: Reset MySQL Password (macOS)

1. Stop MySQL:
   ```bash
   brew services stop mysql
   # OR if installed differently:
   sudo /usr/local/mysql/support-files/mysql.server stop
   ```

2. Start MySQL in safe mode (skip password):
   ```bash
   sudo mysqld_safe --skip-grant-tables &
   ```

3. Connect without password:
   ```bash
   mysql -u root
   ```

4. Reset the password:
   ```sql
   USE mysql;
   ALTER USER 'root'@'localhost' IDENTIFIED BY 'YourNewPassword';
   FLUSH PRIVILEGES;
   EXIT;
   ```

5. Stop safe mode and restart MySQL normally:
   ```bash
   sudo killall mysqld
   brew services start mysql
   ```

## Option 2: Use Your Existing Password

If you know your MySQL root password, we can update the connection string directly.

## Option 3: Create a New Database User

Instead of using root, create a dedicated user for the application:

```sql
CREATE USER 'appuser'@'localhost' IDENTIFIED BY 'apppassword';
GRANT ALL PRIVILEGES ON happy_paws_training.* TO 'appuser'@'localhost';
FLUSH PRIVILEGES;
```

Then update the connection string to use this user.

