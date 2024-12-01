import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { UserPlusIcon } from '@heroicons/react/24/solid';
import toast, { Toaster } from 'react-hot-toast';
import RoomPreferences from './roomPreferences';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    Name: '',
    userName: '',
    password: '',
    confirmPassword: '',
    houseAddress: '',
    preferences: [
      { room: 'kitchen', intent: 1, intensity: 0 },
      { room: 'hall', intent: 1, intensity: 0 },
      { room: 'master', intent: 1, intensity: 0 },
      { room: 'guest', intent: 1, intensity: 0 }
    ]
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePreferencesChange = (updatedPreferences) => {
    setFormData(prev => ({
      ...prev,
      preferences: updatedPreferences
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
  
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      setIsLoading(false);
      return;
    }
  
    const requestData = {
      name: formData.Name,
      username: formData.userName,
      password: formData.password,
      houseAddress: formData.houseAddress,
      preferences: formData.preferences,
    };
  
    try {
      await axios.post('http://localhost:5000/register', requestData);
      toast.success('Registration successful!');
      setTimeout(() => {
        navigate('/', { state: { message: 'Registration successful! Please login.' } });
      }, 1500);
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-8 flex items-center justify-center">
      <Toaster position="top-center" />
     
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg shadow-indigo-100/50 p-4 sm:p-6 md:p-8">
        <div className="flex flex-col items-center mb-6">
          <UserPlusIcon className="h-10 w-10 text-indigo-600" />
          <h2 className="mt-2 text-2xl font-bold text-gray-900 text-center">Create your account</h2>
          <p className="text-sm text-gray-600 text-center">Register to manage your smart home system</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {['Name', 'userName', 'houseAddress'].map((field) => (
                <div key={field}>
                  <label htmlFor={field} className="block text-sm font-medium text-gray-700 mb-1">
                    {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
                  </label>
                  <input
                    id={field}
                    name={field}
                    type="text"
                    required
                    value={formData[field]}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    placeholder={`Enter your ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`}
                  />
                </div>
              ))}
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {[
                { name: 'password', type: 'password' },
                { name: 'confirmPassword', type: 'password' },
              ].map((field) => (
                <div key={field.name}>
                  <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
                    {field.name.charAt(0).toUpperCase() + field.name.slice(1).replace(/([A-Z])/g, ' $1')}
                  </label>
                  <input
                    id={field.name}
                    name={field.name}
                    type={field.type}
                    required
                    value={formData[field.name]}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    placeholder={`Enter your ${field.name.replace(/([A-Z])/g, ' $1').toLowerCase()}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Room Preferences */}
          <div className="w-full">
            <RoomPreferences
              preferences={formData.preferences}
              onChange={handlePreferencesChange}
            />
          </div>

          <div className="space-y-3 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
            >
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
