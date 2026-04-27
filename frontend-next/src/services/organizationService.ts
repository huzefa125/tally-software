import api from './api';

export const organizationService = {
  getAll: async () => {
    const { data } = await api.get('/organizations');
    return data;
  },
  getById: async (id: string) => {
    const { data } = await api.get(`/organizations/${id}`);
    return data;
  },
  create: async (orgData: any) => {
    const { data } = await api.post('/organizations', orgData);
    return data;
  },
  update: async (id: string, orgData: any) => {
    const { data } = await api.put(`/organizations/${id}`, orgData);
    return data;
  },
  delete: async (id: string) => {
    const { data } = await api.delete(`/organizations/${id}`);
    return data;
  },
};
