import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Edit2, User, Camera ,LogOut } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '../components/ui/alert';
import RoomPreferences from './roomPreferences';
import 'react-toastify/dist/ReactToastify.css';

const UserProfileSelection = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [profiles, setProfiles] = useState([
    { id: 1, name: 'Master User', isAdmin: true, photoUrl: null }
  ]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    photoUrl: null, 
    preferences: [
      { room: "kitchen", intent: 1, intensity: 0 },
      { room: "master", intent: 1, intensity: 0 },
      { room: "guest", intent: 1, intensity: 0 },
      { room: "hall", intent: 1, intensity: 0 }
    ]
  });
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState(null);

  
  // Keep existing useEffect and API calls unchanged...
  useEffect(() => {
    const adminId = localStorage.getItem('adminId');
    if (!adminId) {
      setError('Admin ID is missing. Please log in again.');
      return;
    }

    const fetchProfiles = async () => {
      try {
        const profilesResponse = await axios.get(`http://localhost:5000/users/${adminId}`);
        const processedProfiles = profilesResponse.data.map(profile => ({
          ...profile,
          imagePath: profile.imagePath
          ? `http://localhost:5000/uploads/images/${profile.imagePath.split('\\').pop()}`
          : null
        }));
        setProfiles(processedProfiles);
        setError('');
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.response?.data?.message || 'Could not load profiles. Please try again later.');
      }    
    };

    fetchProfiles();
  }, []);

  // Keep existing handlers unchanged...
  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, photoUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditProfile = (profile) => {
    setSelectedProfile({
      ...profile,
      id: profile.userId 
    });
    setFormData({ 
      name: profile.name, 
      photoUrl: profile.imagePath,
      preferences: profile.preferences || [
        { room: "kitchen", intent: 1, intensity: 0 },
        { room: "master", intent: 1, intensity: 0 },
        { room: "guest", intent: 1, intensity: 0 },
        { room: "hall", intent: 1, intensity: 0 }
      ]
    });
    setShowEditModal(true);
  };



  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/');
    toast.success('Logged out successfully');
  };

  
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('name', formData.name);
    formDataToSend.append('preferences', JSON.stringify(formData.preferences));
    
    if (imageFile) {
      formDataToSend.append('image', imageFile);
    }

    try {
      if (showAddModal) {
        const adminId = localStorage.getItem('adminId');
        const response = await axios.post(
          `http://localhost:5000/add-profile/${adminId}`, 
          formDataToSend,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        );

        setProfiles([...profiles, response.data]);
        setShowAddModal(false);
      } else if (showEditModal && selectedProfile) {
        const profileId = selectedProfile.userId;
        const response = await axios.put(
          `http://localhost:5000/edit-profile/${profileId}`, 
          formDataToSend,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        );

        setProfiles(profiles.map(profile => 
          profile.id === selectedProfile.id ? response.data : profile
        ));
        setShowEditModal(false);
      }
      
      setFormData({ 
        name: '', 
        photoUrl: null, 
        preferences: [
          { room: "kitchen", intent: 1, intensity: 0 },
          { room: "master", intent: 1, intensity: 0 },
          { room: "guest", intent: 1, intensity: 0 },
          { room: "hall", intent: 1, intensity: 0 }
        ]
      });
      setImageFile(null);
      setError('');
    } catch (err) {
      console.error('Profile operation error:', err);
      setError(err.response?.data?.message || 'Could not perform operation. Please try again.');
    }
  };

  const handleProfileSelect = (profile) => {
    const userId = localStorage.setItem('userId', profile.userId);
    navigate(`/virtual-home/${userId}`);
  };

  const Modal = ({ show, title, onClose }) => {
    if (!show) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] flex flex-col">
          {/* Fixed Header */}
          <div className="p-6 border-b">
            <h3 className="text-xl font-semibold">{title}</h3>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 overflow-y-auto flex-1">
            <div className="space-y-6">
              {/* Profile Photo Upload */}
              <div className="flex justify-center">
                <div 
                  className="relative cursor-pointer" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                    {formData.photoUrl ? (
                      <img
                        src={formData.photoUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center">
                        <Camera className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">Upload Photo</span>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter name"
                  autoFocus
                />
              </div>

              {/* Room Preferences Component */}
              <RoomPreferences
                preferences={formData.preferences}
                onChange={(newPreferences) => setFormData({ ...formData, preferences: newPreferences })}
              />

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="border-t p-4 flex justify-end gap-4 bg-white rounded-b-lg">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              {showAddModal ? 'Add Profile' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white-50 to-gray-50 flex items-center justify-center p-8">
      <div className="absolute top-4 right-4">
  <button
    onClick={handleLogout}
    className="flex items-center gap-2 px-4 py-2 bg-white/80 hover:bg-white rounded-lg shadow-md transition-all duration-300"
  >
    <LogOut className="w-4 h-4" />
    <span>Logout</span>
  </button>
</div>

      <div className="max-w-4xl w-full mx-auto mt-8">

        <h1 className="text-3xl font-bold text-center mb-12">Who's watching?</h1>
  
        {error && <div className="text-red-500 text-center mb-4">{error}</div>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {profiles.map((profile) => (
            <div key={profile.userId} className="relative group">
              <button
                onClick={() => handleProfileSelect(profile)}
                className="w-full aspect-square rounded-full bg-white shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center p-4"
              >
                <div className="w-24 h-24 rounded-full overflow-hidden mb-3">
                  {profile.imagePath ? (
                    <img
                      src={profile.imagePath}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-full h-full text-gray-400 p-4" />
                  )}
                </div>
                <span className="text-base font-medium text-gray-900">
                  {profile.name}
                </span>
                {profile.role === 'owner' && (
                  <span className="text-sm text-blue-600 mt-1">Admin</span>
                )}
              </button>

              
              
              {profile.role !== 'owner' && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditProfile(profile);
                    }}
                    className="p-2 bg-white rounded-full shadow-lg hover:bg-blue-50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-blue-600" />
                  </button>
                </div>
              )}
            </div>
          ))}
            
          
          {profiles.length < 4 && (
            <button
              onClick={() => {
                setShowAddModal(true);
                setFormData({ 
                  name: '', 
                  photoUrl: null, 
                  preferences: [
                    { room: "kitchen", intent: 1, intensity: 0 },
                    { room: "master", intent: 1, intensity: 0 },
                    { room: "guest", intent: 1, intensity: 0 },
                    { room: "hall", intent: 1, intensity: 0 }
                  ]
                });
              }}
              className="aspect-square rounded-full bg-white/80 hover:bg-white shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center p-4"
            >
              <UserPlus className="w-20 h-20 text-gray-400 mb-3" />
              <span className="text-base font-medium text-gray-900">
                Add Profile
              </span>
            </button>
          )}
        </div>
  
        <Modal
          show={showAddModal || showEditModal}
          title={showAddModal ? "Add New Profile" : "Edit Profile"}
          onClose={() => {
            setShowAddModal(false);
            setShowEditModal(false);
            setError('');
          }}
        />
      </div>
    </div>
  );
};  

export default UserProfileSelection;