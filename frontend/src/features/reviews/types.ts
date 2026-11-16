export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  patient_display_name: string | null;
  created_at: string | null;
}
