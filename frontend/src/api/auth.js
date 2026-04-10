import api from './client';

export const authAPI = {
  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },

  me: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  }
};

export const jobOrdersAPI = {
  getAll: async () => {
    const response = await api.get('/job-orders');
    return response.data;
  },

  getOne: async (id) => {
    const response = await api.get(`/job-orders/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/job-orders', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/job-orders/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/job-orders/${id}`);
    return response.data;
  },

  addStage: async (id, stageData) => {
    const response = await api.post(`/job-orders/${id}/stage`, stageData);
    return response.data;
  },

  getJobCardPDF: async (id) => {
    const response = await api.get(`/job-orders/${id}/jobcard-pdf`, {
      responseType: 'blob'
    });
    return response.data;
  }
};

// Add more API modules as needed
export const salesOrdersAPI = {
  getAll: async () => {
    const response = await api.get('/sales-orders');
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/sales-orders', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/sales-orders/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/sales-orders/${id}`);
    return response.data;
  }
};

export const purchaseOrdersAPI = {
  getAll: async () => {
    const response = await api.get('/purchase-orders');
    return response.data;
  },

  getOne: async (id) => {
    const response = await api.get(`/purchase-orders/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/purchase-orders', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/purchase-orders/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/purchase-orders/${id}`);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.patch(`/purchase-orders/${id}/status`, { status });
    return response.data;
  }
};

export const materialInwardAPI = {
  getAll: async () => {
    const response = await api.get('/material-inward');
    return response.data;
  },

  getOne: async (id) => {
    const response = await api.get(`/material-inward/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/material-inward', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/material-inward/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/material-inward/${id}`);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.patch(`/material-inward/${id}/status`, { status });
    return response.data;
  }
};

export const categoryMasterAPI = {
  getAll: async () => {
    const response = await api.get('/category-master');
    return response.data;
  },

  getOne: async (id) => {
    const response = await api.get(`/category-master/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/category-master', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/category-master/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/category-master/${id}`);
    return response.data;
  }
};

export default api;
