import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "./Profile.css";

const Profile = () => {
  const navigate = useNavigate();
  const [provider, setProvider] = useState({
    name: "",
    email: "",
    contactNumber: "",
    skills: "",
    rate: "",
    address: { street: "", city: "", state: "", postalCode: "", country: "" }
  });
  const [loading, setLoading] = useState(false);

  // Fetch profile
  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return navigate("/");

      const res = await axios.get("http://localhost:5001/api/providers/profile", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProvider({
        ...res.data,
        skills: res.data.skills.join(", ")
      });
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
      setProvider((prev) => ({ ...prev, address: { ...prev.address, [field]: value } }));
    } else {
      setProvider((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleUpdate = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const payload = {
        ...provider,
        skills: provider.skills.split(",").map((s) => s.trim())
      };
      const res = await axios.put("http://localhost:5001/api/providers/profile", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(res.data.message);
      fetchProfile(); // Refresh
    } catch (err) {
      console.error(err);
      toast.error("Error updating profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("provider");
    navigate("/");
  };

  return (
    <div className="profile-container">
      <nav className="navbar">
        <h2 className="logo">Provider Profile</h2>
        <div className="nav-links">
          <button onClick={() => navigate("/dashboard")} className="nav-button">Dashboard</button>
          <button onClick={() => navigate("/bookings")} className="nav-button">Bookings</button>
          <button onClick={handleLogout} className="nav-button logout">Logout</button>
        </div>
      </nav>

      <h2>My Profile</h2>
      <div className="profile-form">
        <label>Name</label>
        <input type="text" name="name" value={provider.name} onChange={handleChange} />

        <label>Email</label>
        <input type="email" name="email" value={provider.email} disabled />

        <label>Contact Number</label>
        <input type="text" name="contactNumber" value={provider.contactNumber} onChange={handleChange} />

        <label>Skills (comma separated)</label>
        <input type="text" name="skills" value={provider.skills} onChange={handleChange} />

        <label>Rate (per hour)</label>
        <input type="number" name="rate" value={provider.rate} onChange={handleChange} />

        <h4>Address</h4>
        {["street", "city", "state", "postalCode", "country"].map((field) => (
          <input
            key={field}
            type="text"
            name={`address.${field}`}
            placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
            value={provider.address[field] || ''}
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