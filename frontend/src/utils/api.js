const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper to make API requests with Authorization header
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('intern_tracker_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || errorMsg;
    } catch (e) {
      // JSON parsing failed, use status text
      errorMsg = response.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }

  // Handle successful empty response (e.g. DELETE)
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  // Auth API
  auth: {
    login: async (username, password) => {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      localStorage.setItem('intern_tracker_token', data.token);
      return data;
    },
    register: async (registerData) => {
      const data = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(registerData)
      });
      localStorage.setItem('intern_tracker_token', data.token);
      return data;
    },
    getMe: () => request('/auth/me'),
    logout: async () => {
      try {
        await request('/auth/logout', { method: 'POST' });
      } catch (err) {
        console.error('Logout API failed:', err);
      } finally {
        localStorage.removeItem('intern_tracker_token');
      }
    }
  },

  // Interns Management (Admin Only)
  interns: {
    getAll: () => request('/interns'),
    create: (data) => request('/interns', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id, data) => request(`/interns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id) => request(`/interns/${id}`, {
      method: 'DELETE'
    })
  },

  // Tasks API
  tasks: {
    getAll: () => request('/tasks'),
    create: (data) => request('/tasks', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id, data) => request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id) => request(`/tasks/${id}`, {
      method: 'DELETE'
    })
  },

  // Daily Logs API
  logs: {
    getAll: () => request('/logs'),
    create: (data) => request('/logs', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    review: (id, data) => request(`/logs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data) // data: { status: 'approved' | 'rejected', comments: '...' }
    })
  },

  // Skills Log API
  skills: {
    getAll: () => request('/skills'),
    create: (data) => request('/skills', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  // Feedback API
  feedback: {
    getAll: () => request('/feedback'),
    create: (data) => request('/feedback', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  // Notifications API
  notifications: {
    getAll: () => request('/notifications'),
    markAsRead: (id) => request(`/notifications/${id}/read`, {
      method: 'PUT'
    }),
    markAllAsRead: () => request('/notifications/read-all', {
      method: 'PUT'
    })
  }
};
