import React from 'react';
import { ChefHat, Sofa, Bed } from 'lucide-react';

const RoomPreference = ({ room, icon: Icon, preference, onPreferenceChange }) => {
  const roomDisplayName = 
    room === 'master' ? 'Master Bedroom' :
    room === 'guest' ? 'Guest Room' :
    room.charAt(0).toUpperCase() + room.slice(1);

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Icon className="w-6 h-6 text-gray-500" />
        <h3 className="font-medium text-gray-700">{roomDisplayName}</h3>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Status</span>
          <select
            value={preference.intent}
            onChange={(e) => onPreferenceChange(room, 'intent', Number(e.target.value))}
            className="px-3 py-1 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value={1}>On</option>
            <option value={0}>Off</option>
          </select>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Intensity</span>
          <select
            value={preference.intensity}
            onChange={(e) => onPreferenceChange(room, 'intensity', Number(e.target.value))}
            className="px-3 py-1 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value={0}>Low</option>
            <option value={1}>High</option>
          </select>
        </div>
      </div>
    </div>
  );
};

const RoomPreferences = ({ preferences, onChange }) => {
  const rooms = [
    { id: 'kitchen', icon: ChefHat },
    { id: 'hall', icon: Sofa },
    { id: 'master', icon: Bed },
    { id: 'guest', icon: Bed }
  ];

  const handlePreferenceChange = (room, field, value) => {
    const updatedPreferences = preferences.map(pref => 
      pref.room === room ? { ...pref, [field]: value } : pref
    );
    onChange(updatedPreferences);
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Room Preferences
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rooms.map(({ id, icon }) => (
          <RoomPreference
            key={id}
            room={id}
            icon={icon}
            preference={preferences.find(p => p.room === id) || { intent: 1, intensity: 0 }}
            onPreferenceChange={handlePreferenceChange}
          />
        ))}
      </div>
    </div>
  );
};

export default RoomPreferences;