import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "./Register.css";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contactNumber: "",
    password: "",
    skills: "",
    rate: "",
    address: {
      street: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
    },
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith("address.")) {
      const field = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        address: { ...prev.address, [field]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(
        "http://localhost:5001/api/providers/register",
        {
          ...formData,
          skills: formData.skills.split(",").map((s) => s.trim()),
        }
      );

      toast.success("Registration successful!");
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("provider", JSON.stringify(response.data.provider));

      navigate("/dashboard");
    } catch (error) {
      console.error("Register Error:", error);
      toast.error(
        error.response?.data?.message || "Registration failed. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <form className="register-box" onSubmit={handleSubmit}>
        <h2>Provider Registration</h2>

        <div className="input-group">
          <label>Name</label>
          <input
            type="text"
            name="name"
            placeholder="Enter full name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="input-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            placeholder="Enter email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="input-group">
          <label>Contact Number</label>
          <input
            type="text"
            name="contactNumber"
            placeholder="10-digit number"
            value={formData.contactNumber}
            onChange={handleChange}
          />
        </div>

        <div className="input-group">
          <label>Password</label>
          <input
            type="password"
            name="password"
            placeholder="Enter password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        <div className="input-group">
          <label>Skills (comma-separated)</label>
          <input
            type="text"
            name="skills"
            placeholder="plumber, electrician"
            value={formData.skills}
            onChange={handleChange}
            required
          />
        </div>

        <div className="input-group">
          <label>Rate (per hour)</label>
          <input
            type="number"
            name="rate"
            placeholder="Enter rate"
            value={formData.rate}
            onChange={handleChange}
          />
        </div>

        <h4 className="section-title">Address</h4>
        {["street", "city", "state", "postalCode", "country"].map((field) => (
          <div className="input-group" key={field}>
            <input
              type="text"
              name={`address.${field}`}
              placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
              value={formData.address[field]}
              onChange={handleChange}
            />
          </div>
        ))}

        <button type="submit" className="register-btn" disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>

        <p className="register-link">
          Already have an account?{" "}
          <span onClick={() => navigate("/")}>Login</span>
        </p>
      </form>
    </div>
  );
};

export default Register;