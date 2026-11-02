export type AppointmentType = 'class' | 'exam' | 'deadline' | 'personal' | 'other';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  title: string;
  description?: string;
  type: AppointmentType;
  status: AppointmentStatus;
  startsAt: string;
  endsAt: string;
  location?: string;
  createdAt: string;
}

export type CreateAppointmentInput = Pick<Appointment, 'title' | 'type' | 'startsAt' | 'endsAt'> &
  Partial<Pick<Appointment, 'description' | 'location'>>;

export type UpdateAppointmentInput = Partial<
  Pick<Appointment, 'title' | 'description' | 'type' | 'status' | 'startsAt' | 'endsAt' | 'location'>
>;
