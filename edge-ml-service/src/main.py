import time
import json
import cv2
import paho.mqtt.client as mqtt
from ultralytics import YOLO

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
    produce = ['apple', 'banana', 'orange', 'broccoli', 'carrot']
    fast_food = ['hot dog', 'pizza', 'donut', 'cake', 'sandwich']
    kitchenware = ['bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl']
    if class_name in produce: return "Fresh Produce"
    if class_name in fast_food: return "Fast Food"
    if class_name in kitchenware: return "Kitchenware"
    return "Other"

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

    model = YOLO('yolov8n.pt') 
    food_classes = ['apple', 'banana', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'sandwich', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl']

    cap = None
    last_publish_time = 0
    PUBLISH_INTERVAL = 3.0 

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
            
            results = model(frame, stream=True, verbose=False)
            current_detected = set()

            for r in results:
                boxes = r.boxes
                for box in boxes:
                    cls_id = int(box.cls[0])
                    class_name = model.names[cls_id]
                    
                    if class_name in food_classes:
                        current_detected.add(class_name)
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        conf = float(box.conf[0])
                        
                        freshness = 1.0
                        if class_name in tracked_items:
                            freshness = tracked_items[class_name]['freshness']
                        
                        label = f"{class_name.capitalize()} {conf:.2f} ({int(freshness*100)}%)"
                        color = (0, int(255 * freshness), int(255 * (1 - freshness)))
                        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                        cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

            current_time = time.time()
            for item in current_detected:
                if item not in tracked_items:
                    tracked_items[item] = {'freshness': 1.0, 'last_seen': current_time}
                else:
                    time_diff = current_time - tracked_items[item]['last_seen']
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
