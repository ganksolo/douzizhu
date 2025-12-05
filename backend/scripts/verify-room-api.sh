#!/bin/bash

BASE_URL="http://localhost:3000/api"
# Check if running on port 3001 as per spec or 3000 default?
# Spec says 3001 for dev, but let's check nestjs default. usually 3000.
# I'll try 3000 first, if fail then 3001.

# 1. Login to get Token
echo "1. Logging in..."
LOGIN_RES=$(curl -s -X POST $BASE_URL/auth/guest-login)
TOKEN=$(echo $LOGIN_RES | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
echo "Token: $TOKEN"

if [ -z "$TOKEN" ]; then
  echo "Login failed"
  exit 1
fi

# 2. Create Room
echo -e "\n2. Creating Room..."
CREATE_RES=$(curl -s -X POST $BASE_URL/rooms \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Room","type":"PVE"}')
echo "$CREATE_RES"
ROOM_ID=$(echo $CREATE_RES | grep -o '"roomId":"[^"]*' | grep -o '[^"]*$')

if [ -z "$ROOM_ID" ]; then
  echo "Create Room failed"
  exit 1
fi

# 3. List Rooms
echo -e "\n3. Listing Rooms..."
curl -s -X GET "$BASE_URL/rooms?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN"

# 4. Get Room Detail
echo -e "\n4. Getting Room Detail ($ROOM_ID)..."
curl -s -X GET "$BASE_URL/rooms/$ROOM_ID" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\nVerification Complete!"
