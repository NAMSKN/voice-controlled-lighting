import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Sun, Moon, Bed, Sofa, ChefHat, LampFloor, Mic, MicOff, Loader2, ClipboardList, FileClock, LogOut, User, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'

// Import images
import kitchenImage from './kitchen1.png';
import hallImage from './hall1.png';
import masterImage from './master1.png';
import guestImage from './guest1.png';

const VirtualHome = () => {
  const navigate = useNavigate();
  const [bulbStates, setBulbStates] = useState({
    kitchen: { intensity: 0 },
    hall: { intensity: 0 },
    bedroom1: { intensity: 0 },
    bedroom2: { intensity: 0 },
  });
  
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const userId = localStorage.getItem('userId');

  const handleLogout = () => {
    localStorage.removeItem('userId');
    navigate('/');
    toast.success('Logged out successfully');
  };

  const NavigationHeader = () => (
    <div className="flex justify-between items-center mb-8 bg-white rounded-lg shadow-md px-6 py-4">
      <div className="flex-1">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
      </div>
  
      <div className="flex-1 flex justify-end">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-red-600 hover:text-red-700 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

 // Add new log entry
const addLog = (logData) => {
  const newLog = {
    timestamp: new Date(logData.created_at).toLocaleTimeString(), 
    action: logData.transcribed_text,  
    userId: logData.user_id, 
    id: Date.now()
  };

  setLogs(prevLogs => [newLog, ...prevLogs]);
};

  
  const mapAreaToRoom = (room) => {
    const areaMap = {
      'kitchen': 'kitchen',
      'hall': 'hall',
      'master': 'bedroom1',
      'guest': 'bedroom2'
    };
    return areaMap[room] || room;
  };

   // Fetch user preferences
useEffect(() => {
  const fetchUserPreferences = async () => {
    try {
      if (!userId) {
        toast.error('No user ID found');
        return;
      }

      const response = await axios.get(`http://localhost:5000/user-details/${userId}`);
      
      if (response.data && response.data.preferences) {
        // Create a new bulb states object based on preferences
        const newBulbStates = { ...bulbStates };

        response.data.preferences.forEach(pref => {
          const roomKey = mapAreaToRoom(pref.room);
          
          // Determine intensity based on preference
          let intensity = 0; // Default to off
          if (pref.intent === 1) { // If intent is 'on'
            intensity = pref.intensity === 1 ? 2 : 1; // High intensity becomes bright, low becomes warm
          }

          // Update the specific room's intensity
          newBulbStates[roomKey] = { intensity };
       });

        // Update bulb states
        setBulbStates(newBulbStates);
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      toast.error('Failed to load user preferences');
    }
  };

  fetchUserPreferences();
}, [userId]); // Only trigger when `userId` changes

useEffect(() => {
  const fetchLogs = async () => {
    try {
      if (!userId) {
        toast.error('No user ID found');
        return;
      }

      const response = await axios.get(`http://localhost:5000/conversation-logs/${userId}`);
      console.log(response.data)
      setLogs(response.data);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Failed to load logs');
    }
  };

  fetchLogs();
}, [userId]); 

  const handleVoiceCommand = (response) => {
    const { room, intent, intensity } = response;
    
    // Map the spoken area to the internal room identifiers
    const mappedRoom = mapAreaToRoom(room);
    if (!mappedRoom) {
      toast.error(`Unrecognized area: ${room}`);
      return;
    }
  
    // Determine the power level based on the intent and intensity
    let power = 0; // Default is off
    if (intent === "on") {
      // Handle different intensity formats
      if (
        intensity === "low"
      ) {
        power = 1; // Warm light
      } else if (
        intensity === "high" 
      ) {
        power = 2; // Bright light
      } else {
        power = 1; 
      }
    }
  
    console.log(power)
    // Update the state for the specified room
    setBulbStates((prev) => ({
      ...prev,
      [mappedRoom]: { ...prev[mappedRoom], intensity: power },
    }));    
  
    // Log and notify the user of the action
    const actionDescription =
      intent === "off"
        ? `Turned off the ${mappedRoom}`
        : `Set ${mappedRoom} light to ${
            power === 1 ? "warm light" : "bright light"
          }`;
    addLog(actionDescription);
    toast.success(actionDescription);
  };
  

  // Modified light control slider component
  const LightIntensitySlider = ({ room, intensity }) => (
    <div className="flex items-center gap-2 w-full max-w-[200px]">
      <Moon className="w-4 h-4 text-gray-600" />
      <input
        type="range"
        min="0"
        max="2"
        value={intensity}
        onChange={(e) => {
          const newIntensity = parseInt(e.target.value);
          setBulbStates(prev => ({
            ...prev,
            [room]: { ...prev[room], intensity: newIntensity }
          }));
        }}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
      <Sun className="w-4 h-4 text-yellow-600" />
    </div>
  );

  // Audio Recording Functions (same as before)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
        await sendAudioToServer(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      addLog('Started voice recording');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      addLog('Error: Failed to access microphone');
      alert('Unable to access microphone. Please ensure you have granted permission.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      addLog('Stopped voice recording');
    }
  };

  const sendAudioToServer = async (audioBlob) => {
    setIsProcessing(true);
    addLog('Processing voice command...');
  
    try {
      const formData = new FormData();
      formData.append('audioFile', audioBlob, 'recording.wav');
  
      const axiosInstance = axios.create({
        baseURL: 'http://localhost:5000',
        timeout: 120000,
      });
  
      const userId = localStorage.getItem('userId');
      const response = await axiosInstance.post(`/transcribe/${userId}`, formData, {
        headers: { 'Accept': 'application/json' },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
  
      if (response.data) {
        handleVoiceCommand(response.data);
        addLog('Voice command processed successfully');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Unknown server error';
      addLog(`Error: ${errorMessage}`);
      alert(`Server error: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const RoomCard = ({ room, title, icon: Icon, bgImage }) => {
    const { intensity } = bulbStates[room];
    const getBrightness = () => {
      switch (intensity) {
        case 0: return 'brightness(0.6) contrast(0.95)';
        case 1: return 'brightness(1.1) contrast(1.05)';
        case 2: return 'brightness(1.3) contrast(1.1)';
        default: return 'brightness(0.6) contrast(0.95)';
      }
    };
    


    return (
      <div className="space-y-4 bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <Icon className="w-6 h-6 text-gray-700" />
            <h2 className="font-bold text-lg text-gray-900">{title}</h2>
          </div>
          <LightIntensitySlider room={room} intensity={intensity} />
        </div>
        <div className="relative h-64 md:h-80 w-full">
          <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-500"
            style={{ 
              backgroundImage: `url(${bgImage || '/api/placeholder/800/400'})`,
              filter: getBrightness()
            }}
          />

          <div 
            className={`absolute inset-0 transition-opacity duration-500 ${
              intensity > 0 ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className={`w-32 h-32 rounded-full blur-2xl ${
                intensity === 1 ? 'bg-yellow-400/30' : 'bg-blue-100/30'
              }`} />
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-yellow-400/10 via-transparent to-transparent" />
          </div>

          <div className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md bg-black/20">
            <LampFloor className={`w-4 h-4 ${intensity > 0 ? 'text-yellow-400' : 'text-gray-400'}`} />
            <span className="text-sm font-medium text-white">
              {intensity === 0 ? 'Off' : intensity === 1 ? 'Warm Light' : 'Bright Light'}
            </span>
          </div>

          <div className="absolute top-4 left-4">
            <div className={`px-3 py-1 rounded-full text-sm backdrop-blur-md ${
              intensity > 0 
                ? 'bg-green-500/90 text-white' 
                : 'bg-gray-700/50 text-gray-100'
            }`}>
              {intensity > 0 ? 'Active' : 'Standby'}
            </div>
          </div>
        </div>
      </div>
    );
  };

// Logs Panel Component
const LogsPanel = () => {
  if (!showLogs) return null;

  return (
    <div className="fixed bottom-32 right-8 w-80 max-h-96 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-semibold">Activity Logs</h2>
        <button 
          onClick={() => setShowLogs(false)} 
          className="text-gray-500 hover:text-gray-700 bg-white"
        >
          Close
        </button>
      </div>
      
      <div className="overflow-y-auto max-h-[300px] p-4">
        {logs.length === 0 ? (
          <p className="text-gray-500 text-center">No logs available</p>
        ) : (
          logs.map((log, index) => (
            <div 
              key={log.id || `log-${index}-${log.created_at}`} 
              className="mb-2 p-2 bg-gray-100 rounded"
            >
              <strong>{new Date(log.created_at).toLocaleTimeString()}</strong>: {log.transcribed_text}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
  
  
 // Enhanced Microphone Button Component with Logs Toggle
  const ControlButtons = () => (
    <div className="fixed right-8 bottom-8 flex flex-col items-center gap-4">
      <button
        onClick={() => setShowLogs(!showLogs)}
        className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-600 hover:bg-gray-700 transition-colors shadow-lg"
      >
        <FileClock className="w-6 h-6 text-white" />
      </button>
      
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
          isRecording 
            ? 'bg-red-500 hover:bg-red-600' 
            : 'bg-blue-500 hover:bg-blue-600'
        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isProcessing ? (
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        ) : isRecording ? (
          <MicOff className="w-8 h-8 text-white" />
        ) : (
          <Mic className="w-8 h-8 text-white" />
        )}
      </button>
    </div>
    
  );

  return (
    <div className="p-8 max-w-6xl mx-auto bg-gray-100 min-h-screen relative">
      <div className="absolute top-4 left-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <RoomCard
          room="kitchen"
          title="Smart Kitchen"
          icon={ChefHat}
          bgImage={kitchenImage}
        />
        
        <RoomCard
          room="hall"
          title="Hall"
          icon={Sofa}
          bgImage={hallImage}
        />
        
        <RoomCard
          room="bedroom1"
          title="Master Bedroom"
          icon={Bed}
          bgImage={masterImage}
        />
        
        <RoomCard
          room="bedroom2"
          title="Guest Room"
          icon={Bed}
          bgImage={guestImage}
        />
      </div>
      
      <LogsPanel />
      <ControlButtons />
    </div>
  );
};

export default VirtualHome;