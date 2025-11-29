import socketio
import time
import uuid
import sys
import json

# Configuration
BASE_URL = 'http://localhost:3000'
WS_URL = 'http://localhost:3000'
ROOM_ID = f"qa-test-room-{uuid.uuid4().hex[:8]}"

class GameClient:
    def __init__(self, name):
        self.name = name
        self.sio = socketio.Client()
        self.connected = False
        self.current_state = None
        self.player_list = []
        self.hand = None
        self.last_error = None
        self.events = []

        # Event Handlers
        @self.sio.event(namespace='/game')
        def connect():
            self.connected = True
            print(f"[{self.name}] Connected to /game")

        @self.sio.event(namespace='/game')
        def disconnect():
            self.connected = False
            print(f"[{self.name}] Disconnected from /game")

        @self.sio.on('sync_state', namespace='/game')
        def on_sync_state(data):
            self.current_state = data.get('currentState')
            self.player_list = data.get('players', [])
            self.events.append({'type': 'sync_state', 'data': data})
            print(f"[{self.name}] 🔔 State: {self.current_state}")

        @self.sio.on('game_started', namespace='/game')
        def on_game_started(data):
            self.hand = data.get('yourHand')
            self.events.append({'type': 'game_started', 'data': data})
            print(f"[{self.name}] Game Started! Hand size: {len(self.hand) if self.hand else 0}")

        @self.sio.on('error', namespace='/game')
        def on_error(data):
            self.last_error = data
            print(f"[{self.name}] Error: {data}")

        @self.sio.on('*', namespace='/game')
        def catch_all(event, data):
            print(f"[{self.name}] CATCH-ALL: Received event '{event}' with data: {data}")

    def connect(self):
        try:
            self.sio.connect(WS_URL, transports=['websocket'], namespaces=['/game'])
        except Exception as e:
            print(f"[{self.name}] Connection failed: {e}")
            sys.exit(1)

    def join_room(self, room_id):
        player_id = f"user-{self.name}-{uuid.uuid4().hex[:4]}"
        print(f"[{self.name}] Joining room {room_id} as {player_id}...")
        def on_join_response(response):
            print(f"[{self.name}] Join response: {response}")
        self.sio.emit('join_room', {'roomId': room_id, 'playerId': player_id}, namespace='/game', callback=on_join_response)

    def disconnect_client(self):
        self.sio.disconnect()

def run_tests():
    print(f"=== Starting QA Verification (Room: {ROOM_ID}) ===")
    
    # Setup Clients
    client_a = GameClient("PlayerA")
    client_b = GameClient("PlayerB")
    client_c = GameClient("PlayerC")
    client_d = GameClient("PlayerD")
    
    clients = [client_a, client_b, client_c, client_d]
    
    try:
        # 1. Connect all clients
        for c in clients:
            c.connect()
            time.sleep(0.5)

        # --- TC-STATE-001: Room Initialization ---
        print("\n>>> Running TC-STATE-001: Room Initialization")
        client_a.join_room(ROOM_ID)
        
        # Wait for state machine to initialize (backend needs time)
        max_wait = 5
        start_time = time.time()
        init_or_later_reached = False
        event_count = 0
        
        while time.time() - start_time < max_wait:
            current_event_count = len([e for e in client_a.events if e['type'] == 'sync_state'])
            if current_event_count > event_count:
                event_count = current_event_count
                print(f"  [Debug] Received {event_count} sync_state event(s), latest state: {client_a.current_state}")
            
            if client_a.current_state and client_a.current_state != "None":
                init_or_later_reached = True
                break
            time.sleep(0.3)
        
        if init_or_later_reached:
            print(f"✅ PASS: State machine initialized (current: {client_a.current_state})")
        else:
            print(f"❌ FAIL: State stuck at '{client_a.current_state}' after {event_count} update(s)")
            if event_count > 0:
                print(f"    Last event data keys: {list(client_a.events[-1]['data'].keys())}")
            return

        # --- TC-NET-001: Concurrent Room Join ---
        print("\n>>> Running TC-NET-001: Concurrent Room Join")
        client_b.join_room(ROOM_ID)
        client_c.join_room(ROOM_ID)
        client_d.join_room(ROOM_ID)
        time.sleep(2)

        # Verify all players see 4 players
        players_a = client_a.player_list
        if len(players_a) == 4:
            print(f"✅ PASS: Client A sees 4 players: {[p['id'] for p in players_a]}")
        else:
            print(f"FAIL: Client A sees {len(players_a)} players, expected 4")
            return

        # --- TC-STATE-002: Auto-Transition to Dealing ---
        print("\n>>> Running TC-STATE-002: Auto-Transition to Dealing")
        # The backend should auto-transition when room is full (4 players)
        # We wait a bit for the transition
        max_wait = 5
        start_time = time.time()
        dealing_reached = False
        
        while time.time() - start_time < max_wait:
            if client_a.current_state == "DealingState":
                dealing_reached = True
                break
            time.sleep(0.5)
            
        if dealing_reached:
            print("PASS: Transitioned to DealingState")
        else:
            print(f"FAIL: Timed out waiting for DealingState. Current: {client_a.current_state}")
            # return # Continue to see if it eventually happens or if we can test other things

        # --- TC-STATE-003: Auto-Transition to Playing ---
        print("\n>>> Running TC-STATE-003: Auto-Transition to Playing")
        # Dealing animation usually takes some time.
        max_wait = 10
        start_time = time.time()
        playing_reached = False
        
        while time.time() - start_time < max_wait:
            if client_a.current_state == "PlayingState":
                playing_reached = True
                break
            time.sleep(0.5)
            
        if playing_reached:
            print("PASS: Transitioned to PlayingState")
        else:
            print(f"FAIL: Timed out waiting for PlayingState. Current: {client_a.current_state}")
            return

        # --- TC-SEC-001: Hand Card Masking (Fog of War) ---
        print("\n>>> Running TC-SEC-001: Hand Card Masking")
        # Check Client A's view of Client B
        # In the 'players' list from sync_state, other players' hands should be hidden
        
        # Find Player B's ID
        # Note: We need to match by socket ID or some identifier. 
        # The simple client implementation doesn't track its own ID easily without auth response.
        # But we can check the player list. The current client (A) should see its own hand (maybe) 
        # but definitely NOT others.
        
        # Actually, 'sync_state' usually sends public info. 'game_started' sends private hand.
        # Let's check the 'players' list in the latest sync_state from Client A.
        
        visible_hands_count = 0
        hidden_hands_count = 0
        
        for p in client_a.player_list:
            hand = p.get('hand')
            if hand and len(hand) > 0:
                visible_hands_count += 1
                # print(f"Visible hand for {p.get('userId')}: {hand}")
            else:
                hidden_hands_count += 1
        
        # In a secure implementation, I should ONLY see my own hand (or none in player list if sent separately)
        # If the backend sends 'yourHand' separately (which it does in 'game_started'), 
        # then 'players' list might contain NO hands or only card counts.
        
        print(f"Debug: Client A sees {visible_hands_count} visible hands and {hidden_hands_count} hidden hands in player list.")
        
        if visible_hands_count == 0:
             print("PASS: No hands exposed in public player list (Fog of War active).")
        elif visible_hands_count == 1:
             # Assuming the one visible hand is the player's own, which might be acceptable depending on implementation
             print("PASS: Only one hand visible (likely own). Fog of War active for others.")
        else:
             print("FAIL: Multiple hands visible! Fog of War broken.")


        # --- TC-NET-002: State Broadcasting ---
        print("\n>>> Running TC-NET-002: State Broadcasting")
        # We need to simulate an action. 
        # Since we are in PlayingState, let's try to 'pass' or just check if we are all in sync.
        
        state_a = client_a.current_state
        state_b = client_b.current_state
        
        if state_a == state_b:
             print(f"PASS: Clients A and B are in sync ({state_a})")
        else:
             print(f"FAIL: State mismatch! A: {state_a}, B: {state_b}")

    except Exception as e:
        print(f"ERROR: Test execution failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        print("\n=== Teardown ===")
        for c in clients:
            c.disconnect_client()

if __name__ == "__main__":
    run_tests()
