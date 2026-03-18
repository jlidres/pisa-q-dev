export interface UploadedImage {
  name?: string;
  src: string;
  alt?: string;
  caption?: string;
}

export interface TableData {
  columns: string[];
  rows: string[][];
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface ChartData {
  title: string;
  yLabel?: string;
  points: ChartPoint[];
}

export interface VisualData {
  type: "reef" | "plant";
  caption?: string;
}

export interface StimulusPage {
  id: string;
  label: string;
  heading?: string;
  paragraphs?: string[];
  image?: UploadedImage;
}

export interface StimulusUnit {
  id: string;
  title: string;
  learningCompetencies: string;
  pages: StimulusPage[];
}

export interface QuestionOption {
  value: string;
  label: string;
}

export interface Question {
  id: string;
  number: number;
  stimulusId: string;
  screenLabel: string;
  prompt: string;
  options: QuestionOption[];
  correctAnswer: string;
  image?: UploadedImage;
  table?: TableData;
  chart?: ChartData;
  visual?: VisualData;
}

export interface StudentInfo {
  studentName: string;
  studentId: string;
  section: string;
}