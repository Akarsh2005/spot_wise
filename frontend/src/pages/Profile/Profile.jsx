import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "./Profile.css";

const Profile = () => {
  const navigate = useNavigate();
  const [seeker, setSeeker] = useState({
    userName: "",
    email: "",
    contactNumber: "",
    address: { street: "", city: "", state: "", postalCode: "", country: "" }
  });
  const [loading, setLoading] = useState(false);

  // Fetch profile
  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return navigate("/login");

      const res = await axios.get("http://localhost:5001/api/seekers/profile", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSeeker(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Error fetching profile");
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("address.")) {
      const field = name.split(".")[1];
      setSeeker((prev) => ({ ...prev, address: { ...prev.address, [field]: value } }));
    } else {
      setSeeker((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleUpdate = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.put("http://localhost:5001/api/seekers/profile", seeker, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(res.data.message);
      fetchProfile();
    } catch (err) {
      console.error(err);
      toast.error("Error updating profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("seeker");
    navigate("/login");
  };

  return (
    <div className="profile-container">
      <nav className="navbar">
        <h2 className="logo">Seeker Profile</h2>
        <div className="nav-links">
          <button onClick={() => navigate("/dashboard")} className="nav-button">Dashboard</button>
          <button onClick={() => navigate("/mybookings")} className="nav-button">My Bookings</button>
          <button onClick={handleLogout} className="nav-button logout">Logout</button>
        </div>
      </nav>

      <h2>My Profile</h2>
      <div className="profile-form">
        <label>Username</label>
        <input type="text" name="userName" value={seeker.userName} onChange={handleChange} />

        <label>Email</label>
        <input type="email" name="email" value={seeker.email} disabled />

        <label>Contact Number</label>
        <input type="text" name="contactNumber" value={seeker.contactNumber} onChange={handleChange} />

        <h4>Address</h4>
        {["street", "city", "state", "postalCode", "country"].map((field) => (
          <input
            key={field}
            type="text"
            name={`address.${field}`}
            placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
            value={seeker.address[field] || ''}
            onChange={handleChange}
          />
        ))}

        <button onClick={handleUpdate} disabled={loading}>
          {loading ? "Updating..." : "Update Profile"}
        </button>
      </div>
    </div>
  );
};

export default Profile;