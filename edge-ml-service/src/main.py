import time
import json
import cv2
import paho.mqtt.client as mqtt
from ultralytics import YOLO
import requests
from pyzbar.pyzbar import decode

# Global control state
camera_active = False
tracked_items = {}

def on_connect(client, userdata, flags, rc):
    print("Connected to MQTT Broker. Subscribing to control channel...")
    client.subscribe("smart-shelf/control")

def on_message(client, userdata, msg):
    global camera_active, tracked_items
    try:
        payload = json.loads(msg.payload.decode())
        if payload.get("action") == "start":
            print("Received command: START CAMERA")
            camera_active = True
        elif payload.get("action") == "stop":
            print("Received command: STOP CAMERA")
            camera_active = False
        elif payload.get("action") == "clear":
            print("Received command: CLEAR SHELF")
            tracked_items.clear()
    except Exception as e:
        pass

def get_category(class_name):
    produce = ['apple', 'banana', 'orange', 'broccoli', 'carrot', 'strawberry', 'mango', 'tomato', 'bell pepper', 'cucumber', 'avocado']
    dairy_bakery = ['bread', 'cheese', 'milk carton', 'egg']
    fast_food = ['hot dog', 'pizza', 'frosted donut', 'cake', 'sandwich']
    kitchenware = ['bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl']
    
    if class_name in produce: return "Fresh Produce"
    if class_name in dairy_bakery: return "Dairy & Bakery"
    if class_name in fast_food: return "Fast Food"
    if class_name in kitchenware: return "Kitchenware"
    return "Other Food"

def main():
    global camera_active, tracked_items
    print("Starting Smart-Shelf Edge CV Service...")
    print("Waiting for remote start command from dashboard...")
    
    # Initialize MQTT
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    
    try:
        client.connect("localhost", 1883, 60)
        client.loop_start()
    except Exception as e:
        print(f"MQTT Connection failed: {e}. Is Node.js backend running?")

    print("Loading YOLO-World Zero-Shot Model (yolov8s-world.pt)...")
    # Reverting to Small model for high-speed CPU performance
    model = YOLO('yolov8s-world.pt') 
    
    # Define our massively expanded custom zero-shot classes
    food_classes = [
        'apple', 'banana', 'orange', 'broccoli', 'carrot', 'strawberry', 'a ripe mango', 'a green mango', 'mango',
        'tomato', 'bell pepper', 'cucumber', 'avocado', 'bread', 'cheese', 'milk carton', 
        'egg', 'hot dog', 'pizza', 'frosted donut', 'cake', 'sandwich', 'bottle', 'wine glass', 
        'cup', 'fork', 'knife', 'spoon', 'bowl'
    ]
    model.set_classes(food_classes)

    cap = None
    last_publish_time = 0
    PUBLISH_INTERVAL = 3.0 
    barcode_cache = {}

    try:
        while True:
            if not camera_active:
                if cap is not None and cap.isOpened():
                    cap.release()
                    cv2.destroyAllWindows()
                time.sleep(1)
                continue
            
            if cap is None or not cap.isOpened():
                cap = cv2.VideoCapture(0)

            ret, frame = cap.read()
            if not ret:
                break
                
            # Resize frame for faster processing (improves FPS on low-end CPUs)
            frame = cv2.resize(frame, (640, 480))
            
            # --- BARCODE SCANNING (Phase 9) ---
            # PyZbar is incredibly CPU intensive. We only run it on grayscale to save compute!
            gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            barcodes = decode(gray_frame)
            current_time = time.time()
            for barcode in barcodes:
                b_data = barcode.data.decode('utf-8')
                if b_data not in barcode_cache or (current_time - barcode_cache[b_data]) > 60:
                    barcode_cache[b_data] = current_time
                    print(f"Barcode detected: {b_data}")
                    try:
                        headers = {'User-Agent': 'SmartShelf-HackathonProject/1.0'}
                        resp = requests.get(f"https://world.openfoodfacts.org/api/v0/product/{b_data}.json", headers=headers, timeout=5)
                        
                        product_name = f"Scanned Item ({b_data})"
                        if resp.status_code == 200:
                            data = resp.json()
                            if data.get('status') == 1:
                                name = data['product'].get('product_name')
                                if name:
                                    product_name = name.title()
                                
                        print(f"Resolved to: {product_name}")
                        # Send MQTT directly to UI
                        payload = {
                            "item": product_name,
                            "category": "Packaged Goods",
                            "decay_status": 1.0,
                            "estimated_days_left": 30 # Default 30 days
                        }
                        client.publish("smart-shelf/telemetry", json.dumps(payload))
                    except Exception as e:
                        print(f"Barcode API error: {e}")
                        # Network error fallback
                        payload = {
                            "item": f"Offline Item ({b_data})",
                            "category": "Packaged Goods",
                            "decay_status": 1.0,
                            "estimated_days_left": 30
                        }
                        client.publish("smart-shelf/telemetry", json.dumps(payload))

            # --- YOLO OBJECT DETECTION ---
            results = model(frame, stream=True, verbose=False)
            current_detected = set()

            for r in results:
                boxes = r.boxes
                for box in boxes:
                    cls_id = int(box.cls[0])
                    class_name = model.names[cls_id]
                    
                    if class_name in food_classes:
                        conf = float(box.conf[0])
                        
                        # --- SMART THRESHOLDING ---
                        # Certain classes (donut, bread, orange) easily "steal" the mango detection 
                        # because their shapes are similar. We force them to have a much higher confidence!
                        req_threshold = 0.35
                        if class_name in ['frosted donut', 'bread', 'orange', 'cake', 'egg']:
                            req_threshold = 0.70 # Must be 70% sure it's a donut/bread/orange!
                        elif 'mango' in class_name:
                            req_threshold = 0.20 # Mangoes are notoriously hard for this model, accept weak guesses (20%)!
                            
                        if conf < req_threshold:
                            continue
                            
                        # Normalize class names (so 'a green mango' just becomes 'mango')
                        normalized_class = class_name
                        if "mango" in class_name:
                            normalized_class = "mango"
                            
                        current_detected.add(normalized_class)
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        
                        freshness = 1.0
                        if normalized_class in tracked_items:
                            freshness = tracked_items[normalized_class]['freshness']
                        
                        label = f"{normalized_class.capitalize()} {conf:.2f} ({int(freshness*100)}%)"
                        color = (0, int(255 * freshness), int(255 * (1 - freshness)))
                        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                        cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

            # Draw barcode boxes
            for barcode in barcodes:
                (x, y, w, h) = barcode.rect
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 255), 2)

            for item in current_detected:
                if item not in tracked_items:
                    tracked_items[item] = {'freshness': 1.0, 'last_seen': current_time}
                else:
                    time_diff = current_time - tracked_items[item]['last_seen']
                    
                    # If item was out of frame for more than 5 seconds, treat it as a NEW item (reset freshness to 100%)
                    if time_diff > 5.0:
                        tracked_items[item]['freshness'] = 1.0
                    # Only degrade if it's continuously in frame
                    elif time_diff < 2.0:
                        tracked_items[item]['freshness'] = max(0.0, tracked_items[item]['freshness'] - (time_diff * 0.02))
                        
                    tracked_items[item]['last_seen'] = current_time

            if current_time - last_publish_time > PUBLISH_INTERVAL:
                for item in current_detected:
                    freshness = tracked_items[item]['freshness']
                    estimated_days = max(0, int(freshness * 10))
                    payload = {
                        "item": item.capitalize(),
                        "category": get_category(item),
                        "decay_status": round(freshness, 2),
                        "estimated_days_left": estimated_days
                    }
                    client.publish("smart-shelf/telemetry", json.dumps(payload))
                
                last_publish_time = current_time

            cv2.imshow('Smart-Shelf Edge CV', frame)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

    except KeyboardInterrupt:
        print("Stopping Edge ML Service.")
    finally:
        if cap is not None:
            cap.release()
        cv2.destroyAllWindows()
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    main()
