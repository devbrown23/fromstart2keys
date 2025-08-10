import React, { useState } from 'react';

function App() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    preferredArea: '',
    timeline: '0-3 months',
    message: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        alert('Thanks! We’ll be in touch shortly.');
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          preferredArea: '',
          timeline: '0-3 months',
          message: ''
        });
      } else {
        console.error('Error sending lead');
        alert('There was an error. Please try again.');
      }
    } catch (error) {
      console.error(error);
      alert('Network error. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="firstName" placeholder="First name" value={formData.firstName} onChange={handleChange} required />
      <input name="lastName" placeholder="Last name" value={formData.lastName} onChange={handleChange} required />
      <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
      <input type="tel" name="phone" placeholder="Phone" value={formData.phone} onChange={handleChange} required />
      <input name="preferredArea" placeholder="Preferred area" value={formData.preferredArea} onChange={handleChange} />
      <select name="timeline" value={formData.timeline} onChange={handleChange}>
        <option value="0-3 months">0-3 months</option>
        <option value="3-6 months">3-6 months</option>
        <option value="6+ months">6+ months</option>
      </select>
      <textarea name="message" placeholder="Tell us what you’re looking for…" value={formData.message} onChange={handleChange}></textarea>
      <button type="submit">Send message</button>
    </form>
  );
}

export default App;
