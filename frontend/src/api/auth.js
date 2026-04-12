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

export const dispatchAPI = {
  getAll: async () => {
    const response = await api.get('/dispatch');
    return response.data;
  },

  getOne: async (id) => {
    const response = await api.get(`/dispatch/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/dispatch', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/dispatch/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/dispatch/${id}`);
    return response.data;
  }
};


export const salesOrdersAPI = {
  getAll: async () => {
    const response = await api.get('/sales-orders');
    return response.data;
  },

  getOne: async (id) => {
    const response = await api.get(`/sales-orders/${id}`);
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
  },

  updateStatus: async (id, status) => {
    const response = await api.patch(`/sales-orders/${id}/status`, { status });
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

export const clientMasterAPI = {
  getAll: async () => {
    const response = await api.get('/client-master');
    return response.data;
  },

  getOne: async (id) => {
    const response = await api.get(`/client-master/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/client-master', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/client-master/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/client-master/${id}`);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.patch(`/client-master/${id}/status`, { status });
    return response.data;
  }
};

export const companyMasterAPI = {
  getAll: async () => {
    const response = await api.get('/company-master');
    return response.data;
  },

  getOne: async (id) => {
    const response = await api.get(`/company-master/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/company-master', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/company-master/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/company-master/${id}`);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.patch(`/company-master/${id}/status`, { status });
    return response.data;
  }
};

export const vendorMasterAPI = {
  getAll: async () => {
    const response = await api.get('/vendor-master');
    return response.data;
  },

  getOne: async (id) => {
    const response = await api.get(`/vendor-master/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/vendor-master', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/vendor-master/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/vendor-master/${id}`);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.patch(`/vendor-master/${id}/status`, { status });
    return response.data;
  }
};

export const usersAPI = {
  getAll: async () => {
    const response = await api.get('/auth/users');
    return response.data;
  },

  getOne: async (id) => {
    const response = await api.get(`/auth/users/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/auth/users', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/auth/users/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/auth/users/${id}`);
    return response.data;
  }
};

export const itemMasterAPI = {
  getAll: async (params) => {
    const response = await api.get('/item-master', { params });
    return response.data;
  },

  getOne: async (id) => {
    const response = await api.get(`/item-master/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/item-master', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/item-master/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/item-master/${id}`);
    return response.data;
  },

  bulkDelete: async (ids) => {
    const response = await api.post("/item-master/bulk-delete", { ids });
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.patch(`/item-master/${id}/status`, { status });
    return response.data;
  },

  bulkImport: async (items) => {
    const response = await api.post('/item-master/bulk-import', { items });
    return response.data;
  }
};

export const machineMasterAPI = {
  getAll: async (params) => {
    const response = await api.get('/machine-master', { params });
    return response.data;
  },

  getOne: async (id) => {
    const response = await api.get(`/machine-master/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/machine-master', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/machine-master/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/machine-master/${id}`);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.patch(`/machine-master/${id}/status`, { status });
    return response.data;
  }
};

export const sizeMasterAPI = {
  getAll: async () => {
    const response = await api.get('/size-master');
    return response.data;
  },

  getByCategory: async (category) => {
    const response = await api.get(`/size-master/${category}`);
    return response.data;
  },

  addSize: async (category, size) => {
    const response = await api.post('/size-master/add', { category, size });
    return response.data;
  },

  updateSize: async (category, oldSize, newSize) => {
    const response = await api.put('/size-master/update', { category, oldSize, newSize });
    return response.data;
  },

  deleteSize: async (category, size) => {
    const response = await api.delete('/size-master/delete', { data: { category, size } });
    return response.data;
  },

  deleteCategory: async (category) => {
    const response = await api.delete(`/size-master/category/${category}`);
    return response.data;
  }
};

export const printingDetailMasterAPI = {
  getAll: async (params) => {
    const response = await api.get('/printing-detail-master', { params });
    return response.data;
  },

  getOne: async (id) => {
    const response = await api.get(`/printing-detail-master/${id}`);
    return response.data;
  },

  getByItemAndClient: async (itemName, clientName) => {
    const response = await api.get(`/printing-detail-master/item/${itemName}/client/${clientName}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/printing-detail-master', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/printing-detail-master/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/printing-detail-master/${id}`);
    return response.data;
  }
};

export const rawMaterialStockAPI = {
  getAll: async (params) => {
    const response = await api.get('/raw-material-stock', { params });
    return response.data;
  },

  getOne: async (id) => {
    const response = await api.get(`/raw-material-stock/${id}`);
    return response.data;
  },

  getLowStock: async () => {
    const response = await api.get('/raw-material-stock/low-stock');
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/raw-material-stock', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/raw-material-stock/${id}`, data);
    return response.data;
  },

  adjustStock: async (id, adjustment, reason) => {
    const response = await api.patch(`/raw-material-stock/${id}/adjust`, { adjustment, reason });
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/raw-material-stock/${id}`);
    return response.data;
  }
};

export const fgStockAPI = {
  getAll: async (params) => {
    const response = await api.get('/fg-stock', { params });
    return response.data;
  },

  getOne: async (id) => {
    const response = await api.get(`/fg-stock/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/fg-stock', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/fg-stock/${id}`, data);
    return response.data;
  },

  adjustStock: async (id, adjustment) => {
    const response = await api.patch(`/fg-stock/${id}/adjust`, { adjustment });
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/fg-stock/${id}`);
    return response.data;
  }
};

export const consumableStockAPI = {
  getAll: async (params) => {
    const response = await api.get('/consumable-stock', { params });
    return response.data;
  },

  getOne: async (id) => {
    const response = await api.get(`/consumable-stock/${id}`);
    return response.data;
  },

  getLowStock: async () => {
    const response = await api.get('/consumable-stock/low-stock');
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/consumable-stock', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/consumable-stock/${id}`, data);
    return response.data;
  },

  adjustStock: async (id, adjustment) => {
    const response = await api.patch(`/consumable-stock/${id}/adjust`, { adjustment });
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/consumable-stock/${id}`);
    return response.data;
  }
};

export default api;
