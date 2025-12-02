import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    role: 'seeker', // 👈 Added role to match backend
    userName: '',
    email: '',
    contactNumber: '',
    password: '',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: ''
    }
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // handleChange function for nested address fields
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('address.')) {
      const field = name.split('.')[1];
      setFormData((prevData) => ({
        ...prevData,
        address: { ...prevData.address, [field]: value }
      }));
    } else {
      setFormData((prevData) => ({ ...prevData, [name]: value }));
    }
  };

  // handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!formData.userName || !formData.email || !formData.password || !formData.contactNumber) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!/^[0-9]{10}$/.test(formData.contactNumber)) {
      toast.error('Please enter a valid 10-digit contact number');
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post('http://localhost:5001/api/seekers/register', formData);

      toast.success('Registration successful!');
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('seeker', JSON.stringify(response.data.seeker));

      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <h2>Seeker Registration</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="userName">Username</label>
            <input
              type="text"
              id="userName"
              name="userName"
              value={formData.userName}
              onChange={handleChange}
              required
              placeholder="Enter your username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="contactNumber">Contact Number</label>
            <input
              type="tel"
              id="contactNumber"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleChange}
              required
              placeholder="Enter your 10-digit contact number"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              placeholder="Enter your password"
            />
          </div>

          {/* Address Fields */}
          {['street', 'city', 'state', 'postalCode', 'country'].map((field) => (
            <div key={field} className="form-group">
              <label htmlFor={`address.${field}`}>
                {field.charAt(0).toUpperCase() + field.slice(1)}
              </label>
              <input
                type="text"
                id={`address.${field}`}
                name={`address.${field}`}
                value={formData.address[field]}
                onChange={handleChange}
                required
                placeholder={`Enter your ${field}`}
              />
            </div>
          ))}

          <button type="submit" className="register-button" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="login-link">
          Already have an account? <a href="/">Login here</a>
        </p>
      </div>
    </div>
  );
};

export default Register;
