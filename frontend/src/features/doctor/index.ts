/** Public surface of the doctor feature — other features and app routes import only from here. */
export { doctorApi } from './api';
export { availableDoctorActions } from './components/DoctorAppointmentActions';
export { ScheduleEditor } from './components/ScheduleEditor';
export { VerificationBanner } from './components/VerificationBanner';
export { CalendarScreen } from './components/calendar/CalendarScreen';
export { ExceptionsScreen } from './components/exceptions/ExceptionsScreen';
export { DoctorOverviewScreen } from './components/overview/DoctorOverviewScreen';
export { PreferencesScreen } from './components/preferences/PreferencesScreen';
export { DoctorProfileScreen } from './components/profile/DoctorProfileScreen';
export { ServicesScreen } from './components/services/ServicesScreen';
export { VerificationScreen } from './components/verification/VerificationScreen';
export { doctorKeys } from './hooks/keys';
export { useDoctorNav } from './hooks/useDoctorNav';
export { useDoctorBranches, useDoctorProfile } from './hooks/useDoctorProfile';
export type { DoctorSelf } from './types';
