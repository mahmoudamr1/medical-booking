// قاعدة بيانات محلية للتطبيق
export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'patient' | 'doctor' | 'admin';
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface Doctor {
  id: string;
  user_id: string;
  specialty_id: string;
  location_id: string;
  price: number;
  consultation_duration: number;
  bio: string;
  experience_years: number;
  license_number: string;
  is_verified: boolean;
  is_active: boolean;
  rating: number;
  total_reviews: number;
  created_at: string;
}

export interface Specialty {
  id: string;
  name: string;
  description: string;
  icon: string;
  created_at: string;
}

export interface Location {
  id: string;
  governorate: string;
  area: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  doctor_id: string;
  patient_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  price: number;
  notes?: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  created_at: string;
}

export interface DoctorSchedule {
  id: string;
  doctor_id: string;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface DoctorVacation {
  id: string;
  doctor_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  created_at: string;
}

// قاعدة البيانات المحلية
class LocalDatabase {
  private users: User[] = [];
  private doctors: Doctor[] = [];
  private specialties: Specialty[] = [];
  private locations: Location[] = [];
  private appointments: Appointment[] = [];
  private doctorSchedules: DoctorSchedule[] = [];
  private doctorVacations: DoctorVacation[] = [];

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    // إنشاء التخصصات
    this.specialties = [
      { id: '1', name: 'طب القلب', description: 'تشخيص وعلاج أمراض القلب والأوعية الدموية', icon: 'heart', created_at: new Date().toISOString() },
      { id: '2', name: 'طب الأطفال', description: 'الرعاية الصحية للأطفال من الولادة حتى المراهقة', icon: 'baby', created_at: new Date().toISOString() },
      { id: '3', name: 'طب العيون', description: 'تشخيص وعلاج أمراض العين والجهاز البصري', icon: 'eye', created_at: new Date().toISOString() },
      { id: '4', name: 'طب الأعصاب', description: 'تشخيص وعلاج اضطرابات الجهاز العصبي', icon: 'brain', created_at: new Date().toISOString() },
      { id: '5', name: 'العظام والمفاصل', description: 'علاج إصابات وأمراض العظام والمفاصل', icon: 'bone', created_at: new Date().toISOString() },
      { id: '6', name: 'الطب الباطني', description: 'تشخيص وعلاج الأمراض الباطنية', icon: 'medical', created_at: new Date().toISOString() },
      { id: '7', name: 'الجراحة العامة', description: 'العمليات الجراحية العامة', icon: 'surgery', created_at: new Date().toISOString() },
      { id: '8', name: 'طب النساء والولادة', description: 'رعاية صحة المرأة والولادة', icon: 'female', created_at: new Date().toISOString() },
      { id: '9', name: 'الأمراض الجلدية', description: 'تشخيص وعلاج أمراض الجلد', icon: 'skin', created_at: new Date().toISOString() },
      { id: '10', name: 'طب الأسنان', description: 'علاج وتجميل الأسنان', icon: 'tooth', created_at: new Date().toISOString() },
    ];

    // إنشاء المواقع
    this.locations = [
      { id: '1', governorate: 'الرياض', area: 'الملز', created_at: new Date().toISOString() },
      { id: '2', governorate: 'الرياض', area: 'العليا', created_at: new Date().toISOString() },
      { id: '3', governorate: 'الرياض', area: 'النخيل', created_at: new Date().toISOString() },
      { id: '4', governorate: 'الرياض', area: 'الورود', created_at: new Date().toISOString() },
      { id: '5', governorate: 'جدة', area: 'الروضة', created_at: new Date().toISOString() },
      { id: '6', governorate: 'جدة', area: 'الحمراء', created_at: new Date().toISOString() },
      { id: '7', governorate: 'جدة', area: 'البلد', created_at: new Date().toISOString() },
      { id: '8', governorate: 'الدمام', area: 'الفيصلية', created_at: new Date().toISOString() },
      { id: '9', governorate: 'الدمام', area: 'الشاطئ', created_at: new Date().toISOString() },
      { id: '10', governorate: 'مكة المكرمة', area: 'العزيزية', created_at: new Date().toISOString() },
      { id: '11', governorate: 'المدينة المنورة', area: 'قباء', created_at: new Date().toISOString() },
      { id: '12', governorate: 'الطائف', area: 'الحوية', created_at: new Date().toISOString() },
    ];

    // إنشاء المستخدمين
    this.users = [
      // المدير
      { id: '1', name: 'مدير النظام', email: 'mahmoudamr700@gmail.com', password: '0123456789', role: 'admin', is_active: true, created_at: new Date().toISOString() },
      
      // الأطباء
      { id: '2', name: 'د. أحمد محمد السيد', email: 'doctor1@clinic.com', password: '12345678', role: 'doctor', phone: '+966501234567', is_active: true, created_at: new Date().toISOString() },
      { id: '3', name: 'د. فاطمة علي أحمد', email: 'doctor2@clinic.com', password: '12345678', role: 'doctor', phone: '+966507654321', is_active: true, created_at: new Date().toISOString() },
      { id: '4', name: 'د. محمد عبدالله', email: 'doctor3@clinic.com', password: '12345678', role: 'doctor', phone: '+966509876543', is_active: true, created_at: new Date().toISOString() },
      { id: '5', name: 'د. سارة أحمد', email: 'doctor4@clinic.com', password: '12345678', role: 'doctor', phone: '+966502468135', is_active: true, created_at: new Date().toISOString() },
      { id: '6', name: 'د. عبدالله محمد', email: 'doctor5@clinic.com', password: '12345678', role: 'doctor', phone: '+966508642097', is_active: true, created_at: new Date().toISOString() },
      { id: '10', name: 'د. نورا خالد', email: 'doctor6@clinic.com', password: '12345678', role: 'doctor', phone: '+966501111111', is_active: true, created_at: new Date().toISOString() },
      { id: '11', name: 'د. يوسف إبراهيم', email: 'doctor7@clinic.com', password: '12345678', role: 'doctor', phone: '+966502222222', is_active: true, created_at: new Date().toISOString() },
      { id: '12', name: 'د. ليلى حسن', email: 'doctor8@clinic.com', password: '12345678', role: 'doctor', phone: '+966503333333', is_active: true, created_at: new Date().toISOString() },
      { id: '13', name: 'د. خالد العتيبي', email: 'doctor9@clinic.com', password: '12345678', role: 'doctor', phone: '+966504444444', is_active: true, created_at: new Date().toISOString() },
      { id: '14', name: 'د. منى الزهراني', email: 'doctor10@clinic.com', password: '12345678', role: 'doctor', phone: '+966505555555', is_active: true, created_at: new Date().toISOString() },
      
      // المرضى
      { id: '7', name: 'أحمد علي', email: 'patient1@example.com', password: 'password123', role: 'patient', phone: '+966551234567', is_active: true, created_at: new Date().toISOString() },
      { id: '8', name: 'فاطمة محمد', email: 'patient2@example.com', password: 'password123', role: 'patient', phone: '+966557654321', is_active: true, created_at: new Date().toISOString() },
      { id: '9', name: 'محمد أحمد', email: 'patient3@example.com', password: 'password123', role: 'patient', phone: '+966559876543', is_active: true, created_at: new Date().toISOString() },
    ];

    // إنشاء بيانات الأطباء
    this.doctors = [
      { id: '1', user_id: '2', specialty_id: '1', location_id: '1', price: 300, consultation_duration: 30, bio: 'استشاري أمراض القلب مع خبرة 15 عام', experience_years: 15, license_number: 'LIC001', is_verified: true, is_active: true, rating: 4.9, total_reviews: 127, created_at: new Date().toISOString() },
      { id: '2', user_id: '3', specialty_id: '2', location_id: '5', price: 250, consultation_duration: 30, bio: 'استشارية طب الأطفال مع خبرة 12 عام', experience_years: 12, license_number: 'LIC002', is_verified: true, is_active: true, rating: 4.8, total_reviews: 89, created_at: new Date().toISOString() },
      { id: '3', user_id: '4', specialty_id: '3', location_id: '8', price: 280, consultation_duration: 25, bio: 'استشاري طب العيون مع خبرة 18 عام', experience_years: 18, license_number: 'LIC003', is_verified: true, is_active: true, rating: 4.7, total_reviews: 156, created_at: new Date().toISOString() },
      { id: '4', user_id: '5', specialty_id: '4', location_id: '2', price: 350, consultation_duration: 45, bio: 'استشارية طب الأعصاب مع خبرة 10 عام', experience_years: 10, license_number: 'LIC004', is_verified: true, is_active: true, rating: 4.6, total_reviews: 73, created_at: new Date().toISOString() },
      { id: '5', user_id: '6', specialty_id: '5', location_id: '6', price: 320, consultation_duration: 40, bio: 'استشاري العظام والمفاصل مع خبرة 20 عام', experience_years: 20, license_number: 'LIC005', is_verified: true, is_active: true, rating: 4.8, total_reviews: 201, created_at: new Date().toISOString() },
      { id: '6', user_id: '10', specialty_id: '6', location_id: '3', price: 280, consultation_duration: 30, bio: 'استشارية الطب الباطني مع خبرة 8 سنوات', experience_years: 8, license_number: 'LIC006', is_verified: true, is_active: true, rating: 4.5, total_reviews: 45, created_at: new Date().toISOString() },
      { id: '7', user_id: '11', specialty_id: '7', location_id: '7', price: 400, consultation_duration: 45, bio: 'استشاري الجراحة العامة مع خبرة 22 عام', experience_years: 22, license_number: 'LIC007', is_verified: true, is_active: true, rating: 4.9, total_reviews: 312, created_at: new Date().toISOString() },
      { id: '8', user_id: '12', specialty_id: '8', location_id: '10', price: 350, consultation_duration: 40, bio: 'استشارية طب النساء والولادة مع خبرة 14 عام', experience_years: 14, license_number: 'LIC008', is_verified: true, is_active: true, rating: 4.7, total_reviews: 198, created_at: new Date().toISOString() },
      { id: '9', user_id: '13', specialty_id: '9', location_id: '11', price: 200, consultation_duration: 20, bio: 'استشاري الأمراض الجلدية مع خبرة 9 سنوات', experience_years: 9, license_number: 'LIC009', is_verified: true, is_active: true, rating: 4.4, total_reviews: 67, created_at: new Date().toISOString() },
      { id: '10', user_id: '14', specialty_id: '10', location_id: '12', price: 180, consultation_duration: 25, bio: 'استشارية طب الأسنان مع خبرة 11 عام', experience_years: 11, license_number: 'LIC010', is_verified: true, is_active: true, rating: 4.6, total_reviews: 134, created_at: new Date().toISOString() },
    ];

    // إنشاء جداول الأطباء
    this.doctorSchedules = [
      // د. أحمد محمد (الأحد إلى الخميس)
      { id: '1', doctor_id: '1', day_of_week: 0, start_time: '09:00', end_time: '13:00', is_active: true },
      { id: '2', doctor_id: '1', day_of_week: 0, start_time: '16:00', end_time: '20:00', is_active: true },
      { id: '3', doctor_id: '1', day_of_week: 1, start_time: '09:00', end_time: '13:00', is_active: true },
      { id: '4', doctor_id: '1', day_of_week: 2, start_time: '09:00', end_time: '13:00', is_active: true },
      { id: '5', doctor_id: '1', day_of_week: 3, start_time: '09:00', end_time: '13:00', is_active: true },
      { id: '6', doctor_id: '1', day_of_week: 4, start_time: '09:00', end_time: '13:00', is_active: true },
      
      // د. فاطمة علي (السبت إلى الأربعاء)
      { id: '7', doctor_id: '2', day_of_week: 6, start_time: '10:00', end_time: '14:00', is_active: true },
      { id: '8', doctor_id: '2', day_of_week: 0, start_time: '10:00', end_time: '14:00', is_active: true },
      { id: '9', doctor_id: '2', day_of_week: 1, start_time: '10:00', end_time: '14:00', is_active: true },
      { id: '10', doctor_id: '2', day_of_week: 2, start_time: '10:00', end_time: '14:00', is_active: true },
      { id: '11', doctor_id: '2', day_of_week: 3, start_time: '10:00', end_time: '14:00', is_active: true },
    ];

    // إنشاء مواعيد تجريبية
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    this.appointments = [
      {
        id: '1',
        doctor_id: '1',
        patient_id: '7',
        date: tomorrow.toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '09:30',
        status: 'confirmed',
        price: 300,
        notes: 'فحص دوري للقلب',
        patient_name: 'أحمد علي',
        patient_email: 'patient1@example.com',
        patient_phone: '+966551234567',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        doctor_id: '2',
        patient_id: '8',
        date: today.toISOString().split('T')[0],
        start_time: '10:30',
        end_time: '11:00',
        status: 'completed',
        price: 250,
        notes: 'فحص طفل',
        patient_name: 'فاطمة محمد',
        patient_email: 'patient2@example.com',
        patient_phone: '+966557654321',
        created_at: new Date().toISOString()
      }
    ];
  }

  // Users methods
  getUsers(): User[] { return this.users; }
  getUserById(id: string): User | undefined { return this.users.find(u => u.id === id); }
  getUserByEmail(email: string): User | undefined { return this.users.find(u => u.email === email); }
  createUser(user: Omit<User, 'id' | 'created_at'>): User {
    const newUser: User = {
      ...user,
      id: (this.users.length + 1).toString(),
      created_at: new Date().toISOString()
    };
    this.users.push(newUser);
    return newUser;
  }
  updateUser(id: string, updates: Partial<User>): User | null {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return null;
    this.users[index] = { ...this.users[index], ...updates };
    return this.users[index];
  }

  // Doctors methods
  getDoctors(): Doctor[] { return this.doctors; }
  getDoctorById(id: string): Doctor | undefined { return this.doctors.find(d => d.id === id); }
  getDoctorByUserId(userId: string): Doctor | undefined { return this.doctors.find(d => d.user_id === userId); }
  createDoctor(doctor: Omit<Doctor, 'id' | 'created_at'>): Doctor {
    const newDoctor: Doctor = {
      ...doctor,
      id: (this.doctors.length + 1).toString(),
      created_at: new Date().toISOString()
    };
    this.doctors.push(newDoctor);
    return newDoctor;
  }
  updateDoctor(id: string, updates: Partial<Doctor>): Doctor | null {
    const index = this.doctors.findIndex(d => d.id === id);
    if (index === -1) return null;
    this.doctors[index] = { ...this.doctors[index], ...updates };
    return this.doctors[index];
  }

  // Specialties methods
  getSpecialties(): Specialty[] { return this.specialties; }
  getSpecialtyById(id: string): Specialty | undefined { return this.specialties.find(s => s.id === id); }

  // Locations methods
  getLocations(): Location[] { return this.locations; }
  getLocationById(id: string): Location | undefined { return this.locations.find(l => l.id === id); }

  // Appointments methods
  getAppointments(): Appointment[] { return this.appointments; }
  getAppointmentById(id: string): Appointment | undefined { return this.appointments.find(a => a.id === id); }
  getAppointmentsByDoctorId(doctorId: string): Appointment[] { return this.appointments.filter(a => a.doctor_id === doctorId); }
  getAppointmentsByPatientId(patientId: string): Appointment[] { return this.appointments.filter(a => a.patient_id === patientId); }
  createAppointment(appointment: Omit<Appointment, 'id' | 'created_at'>): Appointment {
    const newAppointment: Appointment = {
      ...appointment,
      id: (this.appointments.length + 1).toString(),
      created_at: new Date().toISOString()
    };
    this.appointments.push(newAppointment);
    return newAppointment;
  }
  updateAppointment(id: string, updates: Partial<Appointment>): Appointment | null {
    const index = this.appointments.findIndex(a => a.id === id);
    if (index === -1) return null;
    this.appointments[index] = { ...this.appointments[index], ...updates };
    return this.appointments[index];
  }

  // Doctor Schedules methods
  getDoctorSchedules(): DoctorSchedule[] { return this.doctorSchedules; }
  getDoctorSchedulesByDoctorId(doctorId: string): DoctorSchedule[] { return this.doctorSchedules.filter(s => s.doctor_id === doctorId); }
  createDoctorSchedule(schedule: Omit<DoctorSchedule, 'id'>): DoctorSchedule {
    const newSchedule: DoctorSchedule = {
      ...schedule,
      id: (this.doctorSchedules.length + 1).toString()
    };
    this.doctorSchedules.push(newSchedule);
    return newSchedule;
  }
  updateDoctorSchedule(id: string, updates: Partial<DoctorSchedule>): DoctorSchedule | null {
    const index = this.doctorSchedules.findIndex(s => s.id === id);
    if (index === -1) return null;
    this.doctorSchedules[index] = { ...this.doctorSchedules[index], ...updates };
    return this.doctorSchedules[index];
  }

  // Doctor Vacations methods
  getDoctorVacations(): DoctorVacation[] { return this.doctorVacations; }
  getDoctorVacationsByDoctorId(doctorId: string): DoctorVacation[] { return this.doctorVacations.filter(v => v.doctor_id === doctorId); }
  createDoctorVacation(vacation: Omit<DoctorVacation, 'id' | 'created_at'>): DoctorVacation {
    const newVacation: DoctorVacation = {
      ...vacation,
      id: (this.doctorVacations.length + 1).toString(),
      created_at: new Date().toISOString()
    };
    this.doctorVacations.push(newVacation);
    return newVacation;
  }

  // Helper methods
  getDoctorWithDetails(doctorId: string) {
    const doctor = this.getDoctorById(doctorId);
    if (!doctor) return null;

    const user = this.getUserById(doctor.user_id);
    const specialty = this.getSpecialtyById(doctor.specialty_id);
    const location = this.getLocationById(doctor.location_id);

    return {
      ...doctor,
      user,
      specialty,
      location
    };
  }

  searchDoctors(filters: {
    specialty?: string;
    location?: string;
    searchTerm?: string;
  }) {
    return this.doctors.filter(doctor => {
      const user = this.getUserById(doctor.user_id);
      const specialty = this.getSpecialtyById(doctor.specialty_id);
      const location = this.getLocationById(doctor.location_id);

      if (!doctor.is_active || !doctor.is_verified) return false;

      if (filters.specialty && specialty?.name !== filters.specialty) return false;
      if (filters.location && location?.governorate !== filters.location) return false;
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesName = user?.name.toLowerCase().includes(searchLower);
        const matchesBio = doctor.bio.toLowerCase().includes(searchLower);
        const matchesSpecialty = specialty?.name.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesBio && !matchesSpecialty) return false;
      }

      return true;
    }).map(doctor => this.getDoctorWithDetails(doctor.id));
  }

  getStatistics() {
    const totalDoctors = this.doctors.length;
    const activeDoctors = this.doctors.filter(d => d.is_active).length;
    const verifiedDoctors = this.doctors.filter(d => d.is_verified).length;
    const totalPatients = this.users.filter(u => u.role === 'patient').length;
    const totalAppointments = this.appointments.length;
    const todayAppointments = this.appointments.filter(a => a.date === new Date().toISOString().split('T')[0]).length;
    const totalSpecialties = this.specialties.length;

    return {
      totalDoctors,
      activeDoctors,
      verifiedDoctors,
      totalPatients,
      totalAppointments,
      todayAppointments,
      totalSpecialties
    };
  }
}

// إنشاء instance واحد من قاعدة البيانات
export const db = new LocalDatabase();