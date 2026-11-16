/** Public surface of the clinic feature — other features and app routes import only from here. */
export { clinicApi } from './api';
export { ClinicProvider, useClinic } from './components/ClinicContext';
export { ClinicDetailsForm } from './components/ClinicDetailsForm';
export { ClinicInvitations } from './components/ClinicInvitations';
export { ClinicStartScreen } from './components/ClinicStartScreen';
export { ClinicSwitcher, roleKey } from './components/ClinicSwitcher';
export { ClinicAppointmentsScreen } from './components/appointments/ClinicAppointmentsScreen';
export { BranchesScreen } from './components/branches/BranchesScreen';
export { ClinicDirectoryScreen } from './components/directory/ClinicDirectoryScreen';
export { ClinicProfileScreen } from './components/directory/ClinicProfileScreen';
export { ClinicDoctorsScreen } from './components/doctors/ClinicDoctorsScreen';
export { ClinicOverviewScreen } from './components/overview/ClinicOverviewScreen';
export { SchedulesScreen } from './components/schedules/SchedulesScreen';
export { StaffScreen } from './components/staff/StaffScreen';
export { clinicKeys } from './hooks/keys';
export { useClinicNav } from './hooks/useClinicNav';
export { CLINIC_PERMISSIONS } from './types';
