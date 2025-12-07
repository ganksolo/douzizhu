import requests
import socketio
import time
import uuid
import sys
import json

# Configuration
BASE_URL = 'http://127.0.0.1:3001'
WS_URL = 'http://127.0.0.1:3001'
ROOM_ID = f"qa-regr-23-5-5-{uuid.uuid4().hex[:8]}"

class GameClient:
    def __init__(self, name):
        self.name = name
        self.userId = None
        self.token = None
        self.sio = socketio.Client()
        self.connected = False
        self.current_state = None
        self.player_list = []
        self.hand = None
        self.last_played_cards = None
        self.my_seat_index = -1
        self.current_turn_seat = -1
        self.events = []
        
        # ... (Event Handlers)

    def login(self):
        try:
            # Guest Login
            response = requests.post(f"{BASE_URL}/auth/guest-login", json={})
            if response.status_code == 201 or response.status_code == 200:
                data = response.json()['data']
                self.userId = data['userId'] # Use real ID from server
                self.token = data['token']
                print(f"[{self.name}] Logged in as {self.userId}")
            else:
                print(f"[{self.name}] Login failed: {response.status_code} {response.text}")
                sys.exit(1)
        except Exception as e:
            print(f"[{self.name}] Login request failed: {e}")
            sys.exit(1)

    def connect(self):
        if not self.token:
            self.login()
            
        try:
            # Pass token in auth
            self.sio.connect(WS_URL, transports=['websocket'], namespaces=['/game'], 
                             auth={'token': self.token}) 
        except Exception as e:
            print(f"[{self.name}] Connection failed: {e}")
            sys.exit(1)

    def join_room(self, room_id):
        player_id = self.userId
        # self.my_id = player_id # Already set
        
        print(f"[{self.name}] Joining room {room_id} as {player_id}...")
        # We need to wait for callback to confirm join
        joined_event = {"done": False}
        
        def on_join_response(response):
            # print(f"[{self.name}] Join response: {response}")
            joined_event["done"] = True

        self.sio.emit('join_room', {'roomId': room_id, 'playerId': player_id}, namespace='/game', callback=on_join_response)
        
        # Wait for join to complete
        start = time.time()
        while not joined_event["done"] and time.time() - start < 5:
            time.sleep(0.1)
            
        if not joined_event["done"]:
            print(f"[{self.name}] WARNING: Join timed out!")
        else:
            print(f"[{self.name}] Joined room successfully")
        
        return player_id

    def play_cards(self, cards):
        # cards should be array of strings e.g. ["3s"]
        print(f"[{self.name}] Attempting to PLAY: {cards}")
        self.sio.emit('client_action', {
            'roomId': ROOM_ID, # In some implementations this might be in payload or outer
            'type': 'PLAY',
            'payload': cards
        }, namespace='/game')

    def toggle_ready(self, is_ready=True):
        print(f"[{self.name}] Toggling ready: {is_ready}")
        self.sio.emit('toggle_ready', {'roomId': ROOM_ID, 'isReady': is_ready}, namespace='/game')

    def disconnect_client(self):
        self.sio.disconnect()

def run_tests():
    print(f"=== Regression Test 23.5.5: LastPlayedCards (Room: {ROOM_ID}) ===")
    
    clients = [GameClient(f"P{i}") for i in range(4)]
    
    try:
        # 1. Connect and Join
        for i, c in enumerate(clients):
            c.connect()
            time.sleep(1.0) # Wait for namespace connection
            c.join_room(ROOM_ID)
            c.my_seat_index = i # Assumption: 0,1,2,3 based on join order
            time.sleep(0.1)
            c.toggle_ready(True)
            time.sleep(0.1)
            
        print(">>> Waiting for Game Start (PlayingState)...")
        # Wait for PlayingState
        max_wait = 10
        start_time = time.time()
        active_client = None
        
        while time.time() - start_time < max_wait:
            c = clients[0]
            if c.current_state == "PlayingState":
                print(">>> Game is in PlayingState!")
                break
            time.sleep(0.5)
            
        if clients[0].current_state != "PlayingState":
            print("❌ FAIL: Timed out waiting for PlayingState")
            return

        # 2. Identify whose turn it is
        # sync_state usually has 'currentTurn' which matches a player ID or seat index?
        # api_spec says: "currentTurn": 2 (integer seat index) OR uuid?
        # Let's check what we got.
        
        last_sync = clients[0].events[-1]['data']
        current_turn = last_sync.get('currentTurn')
        print(f">>> Current Turn: {current_turn}")
        
        # Convert to seat index if it's an ID
        current_seat = -1
        current_player_client = None
        
        # Check if current_turn is an int (seat index) or string (userId)
        # Based on previous tests, it might be ID. Let's find the client.
        
        if isinstance(current_turn, int):
            current_seat = current_turn
            current_player_client = clients[current_seat]
        else:
            # Assume it's userId. Match with players list.
            players = last_sync.get('players', [])
            for idx, p in enumerate(players):
                if p.get('userId') == current_turn or p.get('id') == current_turn:
                    current_seat = idx
                    current_player_client = clients[idx]
                    break
        
        if not current_player_client:
            print(f"❌ FAIL: Could not identify player for turn: {current_turn}")
            return
            
        print(f">>> It is {current_player_client.name}'s turn (Seat {current_seat})")
        
        # 3. Play a valid card
        # Strategy: Find a single valid card from hand.
        # We need their hand. Since we are checking fog of war, we might check 'yourHand' event if available,
        # or rely on the fact that for THIS client, 'myHand' is available in sync_state?
        # api_spec: "myHand": [1, 2, 3, 4, 5] (sorted card values?)
        
        # Wait, sync_state has 'myHand'.
        my_hand = last_sync.get('myHand') # This is what P0 sees.
        
        # We need the hand of the CURRENT player.
        # Let's ask that client what they see.
        cp_sync = [e for e in current_player_client.events if e['type'] == 'sync_state'][-1]['data']
        cp_hand = cp_sync.get('myHand')
        
        if not cp_hand:
            print(f"❌ FAIL: Current player {current_player_client.name} has no 'myHand' data!")
            return
            
        print(f">>> Player Hand (First 5): {cp_hand[:5]}...")
        
        # Pick one card to play. 
        # The backend expects payload. 
        # If cp_hand is strings like ["3s", "4h"], we just pick one.
        # If it's objects, we need to format correctly.
        # api_spec says payload is array of cards.
        
        card_to_play = [cp_hand[0]]
        print(f">>> Playing card: {card_to_play}")
        
        current_player_client.play_cards(card_to_play)
        
        # 4. Verify LastPlayedCards update
        print(">>> Verifying lastPlayedCards update...")
        time.sleep(2) # Wait for broadcast
        
        # Check all clients
        passed_count = 0
        for c in clients:
            latest_sync = [e for e in c.events if e['type'] == 'sync_state'][-1]['data']
            lpc = latest_sync.get('lastPlayedCards')
            
            if not lpc:
                print(f"❌ FAIL: Client {c.name} sees no lastPlayedCards!")
                continue
                
            seen_seat = lpc.get('seatIndex')
            seen_cards = lpc.get('cards')
            
            # Note: The backend might transform the card (e.g. normalize 3s to S3 or object)
            # We just need to check if it's there and seat is correct.
            
            # Seat check
            if seen_seat != current_seat:
                print(f"❌ FAIL: Client {c.name} sees wrong seatIndex. Expected {current_seat}, Got {seen_seat}")
                continue
                
            # Card check (loose check: not empty)
            if not seen_cards or len(seen_cards) == 0:
                print(f"❌ FAIL: Client {c.name} sees empty cards array")
                continue
                
            # print(f"  [{c.name}] Verified: Seat {seen_seat}, Cards {seen_cards}")
            passed_count += 1
            
        if passed_count == 4:
            print(f"✅ PASS: LastPlayedCards verified for all 4 clients. Seat: {current_seat}, Cards: {card_to_play}")
        else:
            print("❌ FAIL: Not all clients verified.")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        for c in clients:
            try:
                c.disconnect_client()
            except:
                pass

if __name__ == "__main__":
    run_tests()
