#!/bin/bash
# Test MySQL connection with different password options

echo "Testing MySQL connection..."
echo ""

# Test 1: No password
echo "Test 1: Trying without password..."
mysql -u root -e "SELECT 1 as test;" 2>&1 | grep -q "ERROR" && echo "❌ Failed: No password" || echo "✅ Success: No password needed!"

# Test 2: Current password from config
echo ""
echo "Test 2: Trying password from appsettings.json..."
mysql -u root -p'PHW#84#jeor' -e "SELECT 1 as test;" 2>&1 | grep -q "ERROR" && echo "❌ Failed: Password 'PHW#84#jeor' incorrect" || echo "✅ Success: Password 'PHW#84#jeor' works!"

# Test 3: Empty password
echo ""
echo "Test 3: Trying empty password..."
mysql -u root -p'' -e "SELECT 1 as test;" 2>&1 | grep -q "ERROR" && echo "❌ Failed: Empty password" || echo "✅ Success: Empty password works!"

echo ""
echo "If all tests failed, you may need to:"
echo "1. Reset MySQL root password"
echo "2. Use a different MySQL user"
echo "3. Check your MySQL installation"

