import axios from 'axios';
import { ClassroomStatus, ClassroomDashboardCourse, ClassroomCourseDetail } from '../types/classroom';

// In dev these are proxied by Vite (see vite.config.ts) to the Node backend in /server.
// In prod, point VITE_CLASSROOM_SERVER_URL at wherever that backend is deployed and
// swap these base paths for `${VITE_CLASSROOM_SERVER_URL}/api/classroom` / `/auth`.
const API_BASE = '/gc-api';
const AUTH_BASE = '/gc-auth';

const client = axios.create({ baseURL: API_BASE, timeout: 30000 });

export const classroomService = {
  /** Redirects the whole browser tab to Google's OAuth consent screen. */
  connect(studentId: string) {
    window.location.href = `${AUTH_BASE}/google?studentId=${encodeURIComponent(studentId)}`;
  },

  async disconnect(studentId: string): Promise<void> {
    await axios.post(`${AUTH_BASE}/google/disconnect`, { studentId });
  },

  async getStatus(studentId: string): Promise<ClassroomStatus> {
    const { data } = await client.get('/status', { params: { studentId } });
    return data;
  },

  /** Always hits the live Google Classroom API — nothing is cached server-side. */
  async getDashboard(studentId: string): Promise<ClassroomDashboardCourse[]> {
    const { data } = await client.get('/dashboard', { params: { studentId } });
    return data.courses || [];
  },

  async getCourseDetail(studentId: string, classroomCourseId: string): Promise<ClassroomCourseDetail> {
    const { data } = await client.get(`/courses/${encodeURIComponent(classroomCourseId)}`, {
      params: { studentId },
    });
    return data;
  },
};

export default classroomService;
