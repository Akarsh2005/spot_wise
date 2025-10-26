import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './register.css';

const Register = () => {
  const [formData, setFormData] = useState({
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('address.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        address: { ...formData.address, [field]: value }
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.userName || !formData.email || !formData.password || !formData.contactNumber) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Basic client-side validation for contactNumber
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
              placeholder="Enter your password"
              minLength={6}
            />
          </div>
          <div className="form-group">
            <label htmlFor="address.street">Street</label>
            <input
              type="text"
              id="address.street"
              name="address.street"
              value={formData.address.street}
              onChange={handleChange}
              required
              placeholder="Enter your street"
            />
          </div>
          <div className="form-group">
            <label htmlFor="address.city">City</label>
            <input
              type="text"
              id="address.city"
              name="address.city"
              value={formData.address.city}
              onChange={handleChange}
              required
              placeholder="Enter your city"
            />
          </div>
          <div className="form-group">
            <label htmlFor="address.state">State</label>
            <input
              type="text"
              id="address.state"
              name="address.state"
              value={formData.address.state}
              onChange={handleChange}
              required
              placeholder="Enter your state"
            />
          </div>
          <div className="form-group">
            <label htmlFor="address.postalCode">Postal Code</label>
            <input
              type="text"
              id="address.postalCode"
              name="address.postalCode"
              value={formData.address.postalCode}
              onChange={handleChange}
              required
              placeholder="Enter your postal code"
            />
          </div>
          <div className="form-group">
            <label htmlFor="address.country">Country</label>
            <input
              type="text"
              id="address.country"
              name="address.country"
              value={formData.address.country}
              onChange={handleChange}
              required
              placeholder="Enter your country"
            />
          </div>
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