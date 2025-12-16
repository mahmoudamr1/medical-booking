import PocketBase from 'pocketbase';

const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090');

// Configure PocketBase to persist auth in localStorage (browser only)
if (typeof window !== 'undefined') {
  // Use localStorage as the storage backend
  pb.authStore.onChange(() => {
    // PocketBase automatically handles localStorage updates
  });
}

export default pb;

// Types for our collections
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin';
  is_active: boolean;
}

export interface Specialty {
  id: string;
  name: string;
  slug: string;
}

export interface Location {
  id: string;
  governorate: string;
  area: string;
}

export interface Doctor {
  id: string;
  user: string;
  specialty: string;
  location: string;
  price: number;
  consultation_duration: number;
  bio: string;
  is_verified: boolean;
  is_active: boolean;
  doctorName?: string; // اسم الطبيب مباشرة
  expand?: {
    user: User;
    specialty: Specialty;
    location: Location;
  };
}

export interface DoctorSchedule {
  id: string;
  doctor: string;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  start_time: string; // "14:00"
  end_time: string; // "18:00"
  is_active: boolean;
}

export interface DoctorBlock {
  id: string;
  doctor: string;
  date: string; // "2024-01-15"
  start_time: string;
  end_time: string;
  reason: string;
}

export interface Booking {
  id: string;
  doctor: string;
  patient: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'confirmed' | 'cancelled' | 'completed';
  expand?: {
    doctor: Doctor;
    patient: User;
  };
}

export interface DoctorContact {
  id: string;
  doctor: string;
  phone_number: string; // رقم هاتف حقيقي
  whatsapp?: string;
  email: string;
  is_primary: boolean;
}

// ===== API FUNCTIONS =====

// 🔐 Authentication Functions
export const authAPI = {
  // تسجيل دخول
  async login(email: string, password: string) {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password);
      return { success: true, user: authData.record };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // تسجيل مريض جديد
  async registerPatient(data: {
    email: string;
    password: string;
    passwordConfirm: string;
    name: string;
  }) {
    try {
      const userData = {
        ...data,
        role: 'patient' as const,
        is_active: true,
      };
      const user = await pb.collection('users').create(userData);
      return { success: true, user };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // تسجيل طبيب جديد
  async registerDoctor(data: {
    email: string;
    password: string;
    passwordConfirm: string;
    name: string;
  }) {
    try {
      const userData = {
        ...data,
        role: 'doctor' as const,
        is_active: false, // يحتاج موافقة admin
      };
      const user = await pb.collection('users').create(userData);
      return { success: true, user };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // تسجيل خروج
  logout() {
    pb.authStore.clear();
  },

  // الحصول على المستخدم الحالي
  getCurrentUser() {
    return pb.authStore.model;
  },

  // فحص إذا كان مسجل دخول
  isLoggedIn() {
    return pb.authStore.isValid;
  }
};

// 🔍 Search & Doctors Functions
export const doctorsAPI = {
  // البحث عن الأطباء
  async searchDoctors(filters: {
    specialty?: string;
    location?: string;
    searchTerm?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      let filter = 'is_active = true && is_verified = true';
      
      if (filters.specialty) {
        filter += ` && specialty = "${filters.specialty}"`;
      }
      
      if (filters.location) {
        filter += ` && location = "${filters.location}"`;
      }
      
      if (filters.searchTerm) {
        // البحث عن اسم الطبيب في doctorName أو user.name أو bio
        const escapedSearchTerm = filters.searchTerm.replace(/"/g, '\\"');
        filter += ` && (doctorName ~ "${escapedSearchTerm}" || user.name ~ "${escapedSearchTerm}" || bio ~ "${escapedSearchTerm}")`;
      }

      const result = await pb.collection('doctors').getList<Doctor>(
        filters.page || 1,
        filters.limit || 20,
        {
          filter,
          expand: 'user,specialty,location',
          sort: '-created'
        }
      );
      
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // الحصول على تفاصيل طبيب
  async getDoctorProfile(doctorId: string) {
    try {
      const doctor = await pb.collection('doctors').getOne<Doctor>(doctorId, {
        expand: 'user,specialty,location'
      });
      return { success: true, data: doctor };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // الحصول على جدول مواعيد الطبيب
  async getDoctorSchedule(doctorId: string) {
    try {
      const schedules = await pb.collection('doctor_schedules').getFullList<DoctorSchedule>({
        filter: `doctor = "${doctorId}" && is_active = true`,
        sort: 'day_of_week,start_time'
      });
      return { success: true, data: schedules };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // الحصول على الفترات المغلقة للطبيب
  async getDoctorBlocks(doctorId: string, startDate?: string, endDate?: string) {
    try {
      let filter = `doctor = "${doctorId}"`;
      if (startDate && endDate) {
        filter += ` && date >= "${startDate}" && date <= "${endDate}"`;
      }

      const blocks = await pb.collection('doctor_blocks').getFullList<DoctorBlock>({
        filter,
        sort: 'date,start_time'
      });
      return { success: true, data: blocks };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
};

// 📅 Booking Functions
export const bookingAPI = {
  // إنشاء حجز جديد
  async createBooking(data: {
    doctorId: string;
    patientId: string;
    date: string;
    startTime: string;
    endTime: string;
  }) {
    try {
      const bookingData = {
        doctor: data.doctorId,
        patient: data.patientId,
        date: data.date,
        start_time: data.startTime,
        end_time: data.endTime,
        status: 'confirmed' as const
      };

      const booking = await pb.collection('bookings').create(bookingData);
      return { success: true, data: booking };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // الحصول على حجوزات المريض
  async getPatientBookings(patientId: string, status?: string) {
    try {
      let filter = `patient = "${patientId}"`;
      if (status) {
        filter += ` && status = "${status}"`;
      }

      const bookings = await pb.collection('bookings').getFullList<Booking>({
        filter,
        expand: 'doctor,doctor.user,doctor.specialty,patient',
        sort: '-date,-start_time'
      });
      return { success: true, data: bookings };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // الحصول على حجوزات الطبيب
  async getDoctorBookings(doctorId: string, status?: string) {
    try {
      let filter = `doctor = "${doctorId}"`;
      if (status) {
        filter += ` && status = "${status}"`;
      }

      const bookings = await pb.collection('bookings').getFullList<Booking>({
        filter,
        expand: 'patient,doctor,doctor.user',
        sort: '-date,-start_time'
      });
      return { success: true, data: bookings };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // إلغاء حجز
  async cancelBooking(bookingId: string) {
    try {
      const booking = await pb.collection('bookings').update(bookingId, {
        status: 'cancelled'
      });
      return { success: true, data: booking };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // الحصول على الحجوزات المتداخلة (للتحقق من التوفر)
  async getConflictingBookings(doctorId: string, date: string, startTime: string, endTime: string) {
    try {
      const filter = `doctor = "${doctorId}" && date = "${date}" && status != "cancelled" && ((start_time <= "${startTime}" && end_time > "${startTime}") || (start_time < "${endTime}" && end_time >= "${endTime}") || (start_time >= "${startTime}" && end_time <= "${endTime}"))`;
      
      const bookings = await pb.collection('bookings').getFullList<Booking>({
        filter
      });
      return { success: true, data: bookings };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
};

// 📊 Data Functions
export const dataAPI = {
  // الحصول على التخصصات
  async getSpecialties() {
    try {
      const specialties = await pb.collection('specialties').getFullList<Specialty>({
        sort: 'name'
      });
      return { success: true, data: specialties };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // الحصول على المناطق
  async getLocations() {
    try {
      const locations = await pb.collection('locations').getFullList<Location>({
        sort: 'governorate,area'
      });
      return { success: true, data: locations };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
};

// 📞 Contact Functions (نظام اتصال حقيقي)
export const contactAPI = {
  // الحصول على بيانات اتصال الطبيب
  async getDoctorContact(doctorId: string) {
    try {
      const contact = await pb.collection('doctor_contacts').getFirstListItem<DoctorContact>(
        `doctor = "${doctorId}" && is_primary = true`
      );
      return { success: true, data: contact };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // جميع بيانات الاتصال للطبيب
  async getDoctorAllContacts(doctorId: string) {
    try {
      const contacts = await pb.collection('doctor_contacts').getFullList<DoctorContact>({
        filter: `doctor = "${doctorId}"`
      });
      return { success: true, data: contacts };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
};