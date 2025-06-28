#!/bin/bash

# Test script for invite-user Edge Function using curl
# Make this file executable: chmod +x curl-test-invite.sh
# Run with: ./curl-test-invite.sh

SUPABASE_URL="https://usbowqbohkdfadhclypx.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzYm93cWJvaGtkZmFkaGNseXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTU1MjE4NzQsImV4cCI6MjAzMTA5Nzg3NH0.Ej6phn9OtWNbLBXOBYgKJULdCJhMQJGJZKNJZKNJZKN"

echo "🧪 Testing invite-user Edge Function with curl..."

# Test 1: Valid request
echo "📤 Test 1: Valid request"
curl -X POST \
  "${SUPABASE_URL}/functions/v1/invite-user" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.user@example.com",
    "name": "Test User",
    "role": "user",
    "companyId": "12345678-1234-1234-1234-123456789012"
  }' \
  -w "\n\nStatus: %{http_code}\nTime: %{time_total}s\n" \
  -v

echo -e "\n" && echo "="*50

# Test 2: Missing fields
echo "📤 Test 2: Missing required fields"
curl -X POST \
  "${SUPABASE_URL}/functions/v1/invite-user" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }' \
  -w "\n\nStatus: %{http_code}\nTime: %{time_total}s\n"

echo -e "\n" && echo "="*50

# Test 3: Invalid email
echo "📤 Test 3: Invalid email format"
curl -X POST \
  "${SUPABASE_URL}/functions/v1/invite-user" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "name": "Test User",
    "role": "user",
    "companyId": "12345678-1234-1234-1234-123456789012"
  }' \
  -w "\n\nStatus: %{http_code}\nTime: %{time_total}s\n"

echo -e "\n" && echo "="*50

# Test 4: Invalid role
echo "📤 Test 4: Invalid role"
curl -X POST \
  "${SUPABASE_URL}/functions/v1/invite-user" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "role": "invalid_role",
    "companyId": "12345678-1234-1234-1234-123456789012"
  }' \
  -w "\n\nStatus: %{http_code}\nTime: %{time_total}s\n"

echo -e "\n🏁 All curl tests completed!"
echo "📋 Check the Supabase Edge Function logs for detailed output"