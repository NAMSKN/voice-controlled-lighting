import hashlib
import uuid

from flask import Flask, request, jsonify, json, send_from_directory
from transformers import pipeline
import os
from flask_cors import CORS
import mysql.connector

# Initialize the Flask app
app = Flask(__name__)

# Load the Whisper pipeline (CPU mode: device=-1, GPU: device=0)
whisper = pipeline('automatic-speech-recognition', model='openai/whisper-medium', device=-1)

CORS(app, resources={r"/*": {
    "origins": ["http://localhost:3000"],
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"],
    "max_age": 3600
}})

# Database connection configuration
db_config = {
    'user': 'root',
    'password': 'Dharm-aduty8',
    'host': 'localhost',
    'database': 'voice_control_system',
    'ssl_disabled': True,
    'time_zone': '+00:00',
}

''' CREATE TABLE admin (
    adminId VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    houseAddress VARCHAR(255),
);

CREATE TABLE users (
    userId VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    adminId VARCHAR(36),
    imagePath VARCHAR(255),
    role ENUM('owner', 'resident') NOT NULL DEFAULT 'resident',
    FOREIGN KEY (adminId) REFERENCES admin(adminId) ON DELETE CASCADE
);

CREATE TABLE user_preferences (
    preferenceId VARCHAR(36) PRIMARY KEY,
    userId VARCHAR(36),
    room ENUM('kitchen', 'master', 'guest', 'hall') NOT NULL,
    intent TINYINT(1) NOT NULL DEFAULT 0,
    intensity TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
);

CREATE TABLE audio_files (
    id VARCHAR(36) PRIMARY KEY, -- UUID for the audio file ID
    user_id VARCHAR(36) NOT NULL, -- UUID for the user ID
    file_path VARCHAR(255) NOT NULL,
    transcribed_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
'''
# Directory for storing audio files
AUDIO_DIR = os.path.join(os.getcwd(), 'backend/audio_files')
os.makedirs(AUDIO_DIR, exist_ok=True)  # Ensure the directory exists

# Helper function to establish database connection
def get_db_connection():
    try:
        connection = mysql.connector.connect(**db_config)
        return connection
    except mysql.connector.Error as err:
        print("Database connection error:", err)
        raise

# Helper function to execute a query
def execute_query(query, params=None, fetch_one=False):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(query, params or ())
        if fetch_one:
            return cursor.fetchone()
        return cursor.fetchall()
    except mysql.connector.Error as err:
        print("Query execution error:", err)
        raise
    finally:
        cursor.close()
        connection.close()

# Helper function to execute an insert/update/delete operation
def execute_commit(query, params=None):
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(query, params or ())
        connection.commit()
        return cursor.lastrowid
    except mysql.connector.Error as err:
        print("Query execution error:", err)
        raise
    finally:
        cursor.close()
        connection.close()

def map_area_to_room(area):
    area_map = {
        'kitchen': 'kitchen',
        'living': 'hall',
        'bedroom1': 'master',
        'bedroom2': 'guest'
    }

    # If the area is a dictionary, extract the room
    if isinstance(area, dict):
        room = area.get('room', '')
        return area_map.get(room, room)

    # For string inputs, use the mapping
    return area_map.get(area, area)

@app.route('/uploads/images/<path:filename>')
def serve_uploaded_file(filename):
    return send_from_directory('uploads/images', filename)


@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name')
    username = data.get('username')
    password = data.get('password')
    house_address = data.get('houseAddress')
    preferences = data.get('preferences') or []

    # Modify this line to handle dictionary preferences
    mapped_preferences = [
        {**pref, 'room': map_area_to_room(pref['room'])}
        for pref in preferences
    ]

    print(mapped_preferences)
    # Validate input fields
    if not all([name, username, password]):
        return jsonify({"error": "All fields are required"}), 400

    try:
        # Generate a unique admin ID (UUID) and hash the password
        admin_id = str(uuid.uuid4())
        hashed_password = hashlib.sha256(password.encode()).hexdigest()

        # Insert into admin table
        insert_admin_query = """
            INSERT INTO admin (adminId, name, username, password, houseAddress)
            VALUES (%s, %s, %s, %s, %s)
        """
        execute_commit(insert_admin_query, (admin_id, name, username, hashed_password, house_address))

        role = 'owner'  # Default role is 'admin'
        # Add user with preferences
        add_user_with_preferences(name, admin_id, role, mapped_preferences, None)

        return jsonify({"message": "Admin registered successfully", "adminId": admin_id, "name": name}), 201

    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    # Validate input fields
    if not all([username, password]):
        return jsonify({"error": "Username and password are required"}), 400

    try:
        # Hash the input password for comparison
        hashed_password = hashlib.sha256(password.encode()).hexdigest()

        # Fetch the admin details for the given username
        select_query = """
            SELECT adminId, name, password FROM admin WHERE username = %s
        """
        result = execute_query(select_query, (username,), fetch_one=True)

        if result:
            # Compare the hashed password
            if result['password'] == hashed_password:
                return jsonify({
                    "adminId": result['adminId'],
                    "name": result['name']
                }), 200
            else:
                return jsonify({"error": "Invalid username or password"}), 401
        else:
            return jsonify({"error": "Invalid username or password"}), 401

    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500

@app.route('/add-profile/<admin_id>', methods=['POST'])
def add_profile(admin_id):
    # Validate inputs
    uuid.UUID(admin_id)

    # Parse multipart form data
    name = request.form.get('name')
    preferences_raw = request.form.get('preferences')
    preferences = json.loads(preferences_raw) if preferences_raw else []
    role = 'resident'  # Default role is 'resident'
    image = request.files.get('image', None)
    image_path = None

    # Validate input fields
    if not all([name, admin_id]):
        return jsonify({"error": "Name and adminId are required"}), 400

    # Validate preferences format
    for pref in preferences:
        if pref.get('room') not in ['kitchen', 'master', 'guest', 'hall']:
            return jsonify({"error": f"Invalid room in preferences: {pref.get('room')}"}), 400
        if pref.get('intent') not in [0, 1]:
            return jsonify({"error": f"Invalid intent in preferences: {pref.get('intent')}"}), 400
        if pref.get('intensity') not in [0, 1]:
            return jsonify({"error": f"Invalid intensity in preferences: {pref.get('intensity')}"}), 400


    if image:
        # Save the image locally
        image_dir = "uploads\images"
        os.makedirs(image_dir, exist_ok=True)
        image_path = os.path.join(image_dir, image.filename)
        image.save(image_path)

    try:
        # Generate a unique user ID
        user_id = str(uuid.uuid4())

        # Add user with preferences
        add_user_with_preferences(name, admin_id, role, preferences, image_path)

        # Return the inserted user's details
        return jsonify({
            "message": "User added successfully",
            "userId": user_id,
            "name": name,
            "name": name,
            "adminId": admin_id,
            "role": role,
            "preferences": preferences or [],
            "imagePath": image_path,
        }), 201

    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500


def add_user_with_preferences(name, admin_id, role, preferences, image_path):
    """
    Adds a new user to the `users` table and their preferences to the `user_preferences` table,
    including intensity for preferences.

    :param name: Name of the user.
    :param admin_id: Admin ID to associate the user with.
    :param role: Role of the user (e.g., 'owner', 'resident').
    :param preferences: List of preferences, each containing a 'room', 'intent', and 'intensity'.
    """
    try:
        # Generate a unique user ID
        user_id = str(uuid.uuid4())
        # Insert user data into the database
        insert_user_query = """
              INSERT INTO users (userId, name, adminId, role, imagePath)
              VALUES (%s, %s, %s, %s, %s)
          """

        execute_commit(insert_user_query, (user_id, name, admin_id, role, image_path ))
        print(f"User {name} added with userId: {user_id}")

        # Insert user preferences into the `user_preferences` table
        if preferences:
            for pref in preferences:
                preference_id = str(uuid.uuid4())
                insert_preference_query = """
                    INSERT INTO user_preferences (preferenceId, userId, room, intent, intensity)
                    VALUES (%s, %s, %s, %s, %s)
                """
                execute_commit(insert_preference_query, (preference_id, user_id, pref['room'], pref['intent'], pref['intensity']))
                print(f"Preference added for room {pref['room']} with intent {pref['intent']} and intensity {pref['intensity']}")

    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        raise


@app.route('/edit-profile/<user_id>', methods=['PUT'])
def edit_profile(user_id):
    """
       Endpoint to edit a user's profile, including name and preferences with intensity, and image upload.

       :param user_id: The ID of the user to be updated.
       :return: JSON response with the updated user details or an error message.
       """

    print(user_id)
    # Validate inputs
    uuid.UUID(user_id)

    # Parse multipart form data
    name = request.form.get('name')
    preferences_raw = request.form.get('preferences')
    preferences = json.loads(preferences_raw) if preferences_raw else []
    image = request.files.get('image') # Image can be None if not provided

    # Validate input fields
    if not name:
        return jsonify({"error": "Name is required"}), 400

    try:
        # Save image if provided
        image_path = None
        if image:
            image_dir = "uploads\images"
            os.makedirs(image_dir, exist_ok=True)
            image_path = os.path.join(image_dir, image.filename)
            image.save(image_path)

        # Connect to the database
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor(dictionary=True)

        # Update user's details
        if image_path:
            # If new image is uploaded, update both name and image path
            update_query = "UPDATE users SET name = %s, imagePath = %s WHERE userId = %s"
            execute_commit(update_query, (name, image_path, user_id))
        else:
            # If no new image, only update name
            update_query = "UPDATE users SET name = %s WHERE userId = %s"
            execute_commit(update_query, (name, user_id))

        # Update preferences if provided
        if preferences:
            for pref in preferences:
                # Check if preference exists for the user and room
                check_preference_query = """
                       SELECT * FROM user_preferences 
                       WHERE userId = %s AND room = %s
                   """
                cursor.execute(check_preference_query, (user_id, pref['room']))
                existing_preference = cursor.fetchone()

                if existing_preference:
                    # Update existing preference
                    update_preference_query = """
                           UPDATE user_preferences 
                           SET intent = %s, intensity = %s 
                           WHERE userId = %s AND room = %s
                       """
                    execute_commit(update_preference_query,
                                   (pref['intent'], pref['intensity'], user_id, pref['room']))
                else:
                    # Insert new preference if it doesn't exist
                    insert_preference_query = """
                           INSERT INTO user_preferences (preferenceId, userId, room, intent, intensity)
                           VALUES (%s, %s, %s, %s, %s)
                       """
                    preference_id = str(uuid.uuid4())
                    execute_commit(insert_preference_query,
                                   (preference_id, user_id, pref['room'], pref['intent'], pref['intensity']))

        # Check if the user exists in the users table
        check_user_query = "SELECT * FROM users WHERE userId = %s"
        cursor.execute(check_user_query, (user_id,))
        user = cursor.fetchone()

        if user:
            # Fetch updated preferences
            preferences_query = "SELECT room, intent, intensity FROM user_preferences WHERE userId = %s"
            cursor.execute(preferences_query, (user_id,))
            updated_preferences = cursor.fetchall()

            response = {
                "message": "User updated successfully",
                "userId": user['userId'],
                "name": user['name'],
                "adminId": user['adminId'],
                "role": user['role'],
                "preferences": updated_preferences,
                "imagePath": image_path if image_path else user.get('imagePath')  # Preserve old image if no new image
            }
            return jsonify(response), 200
        else:
            return jsonify({"error": "User not found"}), 404

    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        return jsonify({"error": "An error occurred while updating the profile"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

@app.route('/users/<admin_id>', methods=['GET'])
def get_users_by_admin(admin_id):
    try:
        # Validate admin_id format
        uuid.UUID(admin_id)

        # Connect to the database
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor(dictionary=True)

        # Query to fetch users by adminId
        select_query = """
            SELECT *
            FROM users 
            WHERE adminId = %s
            ORDER BY 
                CASE WHEN role = 'owner' THEN 0 ELSE 1 END, 
                name ASC
        """
        cursor.execute(select_query, (admin_id,))
        results = cursor.fetchall()

        # If no results are found, return an appropriate message
        if not results:
            return jsonify({"message": "No users found for this admin ID."}), 404

        # Return the results as JSON
        return jsonify(results), 200

    except ValueError:
        return jsonify({"error": "Invalid admin ID format"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        # Close the database connection
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals():
            connection.close()


@app.route('/user-details/<user_id>', methods=['GET'])
def get_user_details(user_id):
    """
    Endpoint to fetch user details by userId, including name, preferences, role, and adminId.
    """
    try:
        # Validate userId
        uuid.UUID(user_id)
    except ValueError:
        return jsonify({"error": "Invalid userId format"}), 400

    connection = None
    cursor = None

    try:
        # Connect to the database
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor(dictionary=True)

        # Fetch user details
        user_query = "SELECT userId, name, role, adminId, imagePath FROM users WHERE userId = %s"
        cursor.execute(user_query, (user_id,))
        user = cursor.fetchone()

        if not user:
            return jsonify({"error": "User not found"}), 404

        # Fetch user preferences
        preferences_query = "SELECT room, intent, intensity FROM user_preferences WHERE userId = %s"
        cursor.execute(preferences_query, (user_id,))
        preferences = cursor.fetchall()

        # Construct response
        response = {
            "userId": user['userId'],
            "name": user['name'],
            "role": user['role'],
            "adminId": user['adminId'],
            "imagePath": user['imagePath'],
            "preferences": preferences or []  # Default to empty list if no preferences
        }

        return jsonify(response), 200

    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        return jsonify({"error": "An error occurred while fetching user details"}), 500

    finally:
        # Ensure cursors and connections are closed even if an error occurs
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# Define the route for transcription
@app.route('/transcribe/<user_id>', methods=['POST'])
def transcribe_audio(user_id):
    # Validate user_id
    try:
        uuid.UUID(user_id)  # Validate UUID format
    except ValueError:
        return jsonify({"error": "Invalid user ID format"}), 400

    # Check for audio file in the request
    if 'audioFile' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    # Get the audio file from the request
    audio_file = request.files['audioFile']
    if audio_file.filename == '':
        return jsonify({"error": "Audio file name is empty"}), 400

    # Save the audio file to a local folder
    audio_folder = os.path.join("uploads", user_id)
    os.makedirs(audio_folder, exist_ok=True)
    audio_path = os.path.join(audio_folder, audio_file.filename)
    audio_file.save(audio_path)

    try:
        # Perform speech-to-text recognition
        result = whisper(audio_path)
        transcribed_text = result['text']
        print("Transcribed Text: ", transcribed_text)

        # Process the transcribed text

        processed_result = process_text(transcribed_text)

        # Generate a unique ID for this audio file
        file_id = str(uuid.uuid4())

        # Save the audio file location to the database
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor()
        insert_query = """
            INSERT INTO audio_files (id, user_id, file_path, transcribed_text)
            VALUES (%s, %s, %s, %s)
        """
        cursor.execute(insert_query, (file_id, user_id, audio_path, transcribed_text))
        connection.commit()

        # Return the processed result
        return jsonify(json.loads(processed_result)), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        # Close the database connection
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals():
            connection.close()

def process_text(transcribed_text):
    # Initialize the fields
    room = None
    intent = None
    intensity = None
    response = None

    # Define keywords for each field
    intent_keywords = ["on", "off"]
    room_keywords = ["master", "kitchen", "guest", "hall"]
    intensity_keywords = {
        "low": ["low", "soft", "decrease"],
        "high": ["high", "bright", "increase"]
    }

    # Convert text to lowercase for easier matching
    text = transcribed_text.lower()

    # Extract room
    for keyword in room_keywords:
        if keyword in text:
            room = keyword

    # Extract intent
    for keyword in intent_keywords:
        if keyword in text:
            intent = keyword

    for intensity_level, keywords in intensity_keywords.items():
        if any(keyword in text for keyword in keywords):
            intensity = intensity_level
            intent = "on"

    # Special handling for "on" intent
    if intent == "on":
        # If no intensity specified, default to "low"
        if intensity is None:
            intensity = "low"
            response = f"The light is turned {intent} with {intensity} intensity in {room} room."
        else:
            response = f"The light is turned {intent} with {intensity} intensity in {room} room."
    else:  # "off" intent
        # For "off", intensity remains None
        response = f"The light is turned {intent} in {room} room."


    # If no room is found AND (intent or intensity is missing)
    if not room :
        # and (not intent or not intensity):
        return json.dumps({
            "room": None,
            "intent": None,
            "intensity": None,
            "text": transcribed_text,
            "response": "Please enter valid instructions."
        }, indent=4)

    # Construct the result JSON
    result = {
        "room": room,
        "intent": intent,
        "intensity": intensity,
        "text": transcribed_text,
        "response": response
    }

    return json.dumps(result, indent=4)

@app.route('/conversation-logs/<user_id>', methods=['GET'])
def get_conversations_logs(user_id):
    global cursor, connection
    try:
        # Validate user_id format
        uuid.UUID(user_id)

        # Connect to the database
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor(dictionary=True)

        # Fetch the last 10 conversations for the given user_id
        select_query = """
            SELECT user_id, transcribed_text, created_at 
            FROM audio_files 
            WHERE user_id = %s 
            ORDER BY created_at DESC 
            LIMIT 10
        """
        cursor.execute(select_query, (user_id,))
        results = cursor.fetchall()

        # If no results are found, return an appropriate message
        if not results:
            return jsonify({"message": "No conversations found for this user."}), 404

        # Return the results as JSON
        return jsonify(results), 200

    except ValueError:
        return jsonify({"error": "Invalid user ID format"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        # Close the database connection
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals():
            connection.close()

# Run the app
if __name__ == '__main__':
    app.run(debug=True, port=5000)