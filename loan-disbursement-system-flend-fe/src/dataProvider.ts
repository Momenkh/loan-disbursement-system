import { fetchUtils } from 'ra-core';
import type { DataProvider } from 'ra-core';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const httpClient = (url: string, options: RequestInit = {}) => {
  // Normalize headers into a Headers instance so we can safely call .set()
  const incoming = options.headers as HeadersInit | undefined;
  const headers = new Headers(incoming || { Accept: 'application/json' });

  try {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('ra_token') : null;
    if (token) headers.set('Authorization', `Bearer ${token}`);
  } catch (e) {
    // localStorage may be unavailable in some environments (SSR/tests)
  }

  return fetchUtils.fetchJson(url, { ...options, headers });
};

const mapGetListParams = (_resource: string, params: any) => {
  // react-admin params -> query string. Your API may support page/limit/sort/filter.
  // We'll send ?_page=&_limit=&_sort=&_order= and also include filters as query params.
  const { pagination, sort, filter } = params;
  const { page, perPage } = pagination || { page: 1, perPage: 25 };
  const { field, order } = sort || { field: 'id', order: 'DESC' };

  const encodedFilter: Record<string, any> = {};
  if (filter) {
    Object.keys(filter).forEach((k) => {
      const v = filter[k];
      // stringify objects/arrays so they transmit in a query string
      encodedFilter[k] = typeof v === 'object' ? JSON.stringify(v) : v;
    });
  }

  const query: any = {
    _page: page,
    _limit: perPage,
    _sort: field,
    _order: order === 'ASC' ? 'asc' : 'desc',
    ...encodedFilter,
  };

  const qs = Object.keys(query)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
    .join('&');
  return qs ? `?${qs}` : '';
};

const adaptListResponse = (_resource: string, json: any, params: any) => {
  // If backend returns { data, total }, use them. Otherwise assume array.
  if (Array.isArray(json)) {
    const total = json.length;
    // if pagination params, perform slicing on client side (only for development / small lists)
    if (params && params.pagination) {
      const { page, perPage } = params.pagination;
      const start = (page - 1) * perPage;
      const end = start + perPage;
      const data = json.slice(start, end);
      return { data, total };
    }
    return { data: json, total };
  } else if (json && Array.isArray(json.data) && typeof json.total !== 'undefined') {
    return { data: json.data, total: json.total };
  } else if (json && Array.isArray(json.items)) {
    return { data: json.items, total: json.items.length };
  }
  // fallback: try to coerce single object list
  return { data: Array.isArray(json) ? json : [json], total: Array.isArray(json) ? json.length : 1 };
};

const dataProvider: DataProvider = {
  getList: (resource, params) => {
    const qs = mapGetListParams(resource, params);
    return httpClient(`${API_URL}/${resource}${qs}`).then(({ json }) => adaptListResponse(resource, json, params));
  },

  getOne: (resource, params) =>
    httpClient(`${API_URL}/${resource}/${params.id}`).then(({ json }) => ({ data: json })),

  getMany: (resource, params) =>
    Promise.all(params.ids.map((id: any) => httpClient(`${API_URL}/${resource}/${id}`))).then((responses) => ({
      data: responses.map((r) => r.json),
    })),

  getManyReference: (resource, params) => {
    // map to GET /resource?reference=... or filter server-side
    const { target, id, pagination, sort } = params;
    const filter = { ...(params.filter || {}), [target]: id };
    const newParams = { ...params, filter, pagination, sort };
    const qs = mapGetListParams(resource, newParams);
    return httpClient(`${API_URL}/${resource}${qs}`).then(({ json }) => adaptListResponse(resource, json, params));
  },

  create: (resource, params) =>
    httpClient(`${API_URL}/${resource}`, {
      method: 'POST',
      body: JSON.stringify(params.data),
    }).then(({ json }) => ({ data: json })),

  update: (resource, params) =>
    httpClient(`${API_URL}/${resource}/${params.id}`, {
      method: 'PATCH',
      body: JSON.stringify(params.data),
    }).then(({ json }) => ({ data: json })),

  updateMany: (resource, params) =>
    Promise.all(params.ids.map((id: any) => httpClient(`${API_URL}/${resource}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(params.data),
    }))).then((responses) => ({ data: responses.map((r) => r.json.id) })),

  delete: (resource, params) =>
    httpClient(`${API_URL}/${resource}/${params.id}`, {
      method: 'DELETE',
    }).then(({ json }) => ({ data: json })),

  deleteMany: (resource, params) =>
    Promise.all(params.ids.map((id: any) => httpClient(`${API_URL}/${resource}/${id}`, {
      method: 'DELETE',
    }))).then((responses) => ({ data: responses.map((r) => r.json.id) })),
};

export default dataProvider;
