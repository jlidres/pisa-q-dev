import { useEffect, useMemo, useRef, useState } from 'react';
import './styles.css';

type QuestionType = 'mcq' | 'text' | 'true-false' | 'numerical' | 'gap-fill' | 'drag-drop' | 'calc-mcq' | 'table' | 'table-mcq';
type ResponseValue = string | number | string[] | number[] | Record<string, number>;

type Question = {
  id: string;
  number: number;
  type: QuestionType;
  prompt: string;
  image?: string;
  options: string[];
  correctAnswer: number;
  sampleAnswer: string;
  numericalAnswer?: number;
  numericalTolerance?: number;
  calcVariables?: { name: string; min: number; max: number }[];
  calcFormula?: string;
  tableData?: string[][];
  matrixAnswers?: number[];
};

type ArticleBlock = {
  id: string;
  type: 'article';
  label: string;
  title: string;
  content: string;
  image?: string;
};

type TableBlock = {
  id: string;
  type: 'table';
  label: string;
  title: string;
  headers: string[];
  rows: string[][];
  note: string;
};

type ChartBar = {
  id: string;
  label: string;
  value: number;
};

type ChartBlock = {
  id: string;
  type: 'chart';
  label: string;
  title: string;
  bars: ChartBar[];
  note: string;
};

type VisualBlock = {
  id: string;
  type: 'visual';
  label: string;
  title: string;
  note: string;
  image?: string;
};

type StimulusBlock = ArticleBlock | TableBlock | ChartBlock | VisualBlock;

type Unit = {
  id: string;
  title: string;
  competency: string;
  questions: Question[];
  stimulusBlocks: StimulusBlock[];
};

type SavedProgress = {
  selectedUnitIndex: number;
  currentQuestionIndex: number;
  activeStimulusIndex: number;
  responses: Record<string, ResponseValue>;
  flaggedQuestions: string[];
  timeRemaining: number;
};

type StudentProfile = {
  name: string;
  school: string;
  gradeLevel: string;
  section: string;
};

type UserRole = 'guest' | 'student' | 'admin';
type Subject = 'chemistry' | 'earth_science' | 'life_science' | 'physics';
type Grade = 'Grade 6' | 'Grade 7' | 'Grade 8' | 'Grade 9';

const PROGRESS_STORAGE_KEY_PREFIX = 'pisa_q_dev_progress_v6';
const BUILDER_STORAGE_KEY_PREFIX = 'pisa_q_dev_builder_v3';
const USER_ROLE_STORAGE_KEY = 'pisa_q_dev_user_role_v2';
const STUDENT_PROFILE_STORAGE_KEY = 'pisa_q_dev_student_profile_v2';
const SUBJECT_STORAGE_KEY = 'pisa_q_dev_subject';
const GRADE_STORAGE_KEY = 'pisa_q_dev_grade';
const DEFAULT_TIME_SECONDS = 30 * 60;
const MAX_UNITS = 5;
const MAX_QUESTIONS = 5;
const ADMIN_PIN = '123654';

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createQuestion(index: number): Question {
  return {
    id: uid('q'),
    number: index + 1,
    type: 'mcq',
    prompt: '',
    image: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    sampleAnswer: '',
    numericalAnswer: 0,
    numericalTolerance: 0,
    calcVariables: [{ name: 'x', min: 1, max: 10 }],
    calcFormula: '',
  };
}

function createArticleBlock(): ArticleBlock {
  return {
    id: uid('article'),
    type: 'article',
    label: 'Article',
    title: 'Reading Passage',
    content: '',
    image: '',
  };
}

function createTableBlock(): TableBlock {
  return {
    id: uid('table'),
    type: 'table',
    label: 'Table',
    title: 'Data Table',
    headers: ['Column 1', 'Column 2', 'Column 3'],
    rows: [
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
    ],
    note: '',
  };
}

function createChartBlock(): ChartBlock {
  return {
    id: uid('chart'),
    type: 'chart',
    label: 'Chart',
    title: 'Chart',
    bars: [
      { id: uid('bar'), label: 'A', value: 10 },
      { id: uid('bar'), label: 'B', value: 20 },
      { id: uid('bar'), label: 'C', value: 30 },
    ],
    note: '',
  };
}

function createVisualBlock(): VisualBlock {
  return {
    id: uid('visual'),
    type: 'visual',
    label: 'Visual',
    title: 'Visual',
    note: '',
    image: '',
  };
}

function createSampleUnit(n: number): Unit {
  return {
    id: `unit-${n}`,
    title: `Unit ${n}`,
    competency:
      'Analyze and interpret scientific information using article text, tables, charts, visuals, and written responses.',
    questions: [
      {
        id: uid('q'),
        number: 1,
        type: 'mcq',
        prompt: 'What happens during coral bleaching?',
        image: '',
        options: [
          'Corals grow faster',
          'Corals expel algae',
          'Corals become fish',
          'Corals instantly disappear',
        ],
        correctAnswer: 1,
        sampleAnswer: '',
      },
      {
        id: uid('q'),
        number: 2,
        type: 'mcq',
        prompt: 'Why are coral reefs important?',
        image: '',
        options: [
          'They increase ocean heat',
          'They provide habitat',
          'They reduce oxygen',
          'They block sunlight',
        ],
        correctAnswer: 1,
        sampleAnswer: '',
      },
      {
        id: uid('q'),
        number: 3,
        type: 'text',
        prompt: 'In one sentence, explain why heat stress is dangerous for coral reefs.',
        image: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        sampleAnswer:
          'Heat stress can cause corals to expel algae and become weak or bleached.',
      },
      {
        id: uid('q'),
        number: 4,
        type: 'mcq',
        prompt: 'Which format is best for comparing numeric changes over time?',
        image: '',
        options: ['Chart', 'Title', 'Button', 'Label'],
        correctAnswer: 0,
        sampleAnswer: '',
      },
      {
        id: uid('q'),
        number: 5,
        type: 'text',
        prompt: 'What does the table suggest about reef condition as temperature rises?',
        image: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        sampleAnswer:
          'As temperature rises, reef condition becomes more stressed and bleached.',
      },
    ],
    stimulusBlocks: [
      {
        id: uid('article'),
        type: 'article',
        label: 'Article',
        title: 'Reading Passage',
        content:
          'Coral reefs are sensitive to temperature changes. When ocean temperatures rise, corals may expel the algae living in their tissues. This process is called coral bleaching. Bleached corals are weaker and may die if stressful conditions continue.',
        image: '',
      },
      {
        id: uid('table'),
        type: 'table',
        label: 'Table',
        title: 'Temperature and Reef Condition',
        headers: ['Year', 'Average Temp', 'Condition'],
        rows: [
          ['2000', '26°C', 'Healthy'],
          ['2010', '27°C', 'Stressed'],
          ['2020', '28°C', 'Bleached'],
        ],
        note: 'The table shows how reef condition changes as temperature rises.',
      },
      {
        id: uid('chart'),
        type: 'chart',
        label: 'Chart',
        title: 'Temperature Rise',
        bars: [
          { id: uid('bar'), label: '2000', value: 26 },
          { id: uid('bar'), label: '2010', value: 27 },
          { id: uid('bar'), label: '2020', value: 28 },
        ],
        note: 'Higher bars indicate higher temperatures.',
      },
      {
        id: uid('visual'),
        type: 'visual',
        label: 'Visual',
        title: 'Reef Comparison Image',
        note: 'Upload a photo, diagram, or reference image for the stimulus.',
        image: '',
      },
    ],
  };
}

function createBlankUnit(n: number): Unit {
  return {
    id: `unit-${n}`,
    title: `Unit ${n}`,
    competency: '',
    questions: Array.from({ length: MAX_QUESTIONS }, (_, i) => createQuestion(i)),
    stimulusBlocks: [
      createArticleBlock(),
      createTableBlock(),
      createChartBlock(),
      createVisualBlock(),
    ],
  };
}

function createInitialUnits(): Unit[] {
  return [createSampleUnit(1), createBlankUnit(2), createBlankUnit(3)];
}

function loadSavedProgress(subject: Subject | null, grade: Grade | null): SavedProgress | null {
  if (!subject || !grade) return null;
  try {
    const raw = localStorage.getItem(`${PROGRESS_STORAGE_KEY_PREFIX}_${subject}_${grade}`);
    if (!raw) return null;
    return JSON.parse(raw) as SavedProgress;
  } catch {
    return null;
  }
}

function loadSavedRole(): UserRole {
  try {
    const raw = localStorage.getItem(USER_ROLE_STORAGE_KEY);
    if (raw === 'student' || raw === 'admin') return raw;
    return 'guest';
  } catch {
    return 'guest';
  }
}

function loadSavedStudentProfile(): StudentProfile {
  try {
    const raw = localStorage.getItem(STUDENT_PROFILE_STORAGE_KEY);
    if (!raw) return { name: '', school: '', gradeLevel: '', section: '' };
    return JSON.parse(raw) as StudentProfile;
  } catch {
    return { name: '', school: '', gradeLevel: '', section: '' };
  }
}

function formatTime(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renumberQuestions(questions: Question[]) {
  return questions.map((q, index) => ({
    ...q,
    number: index + 1,
  }));
}

function isTextCorrect(response: string, sample: string) {
  const cleanResponse = response.trim().toLowerCase();
  const cleanSample = sample.trim().toLowerCase();
  if (!cleanResponse || !cleanSample) return false;
  return cleanResponse.includes(cleanSample) || cleanSample.includes(cleanResponse);
}

function evaluateFormula(formula: string, vars: Record<string, number>): number {
  try {
    const keys = Object.keys(vars);
    const values = Object.values(vars);
    return new Function(...keys, `return ${formula};`)(...values);
  } catch {
    return NaN;
  }
}

function hasQuestionAnswered(q: Question, response: ResponseValue): boolean {
  if (response === undefined || response === null) return false;
  if (['mcq', 'true-false', 'calc-mcq'].includes(q.type)) {
    return typeof response === 'number';
  }
  if (['gap-fill', 'drag-drop', 'table'].includes(q.type)) {
    return Array.isArray(response) && response.some((r) => String(r).trim() !== '');
  }
  if (q.type === 'table-mcq') {
    return Array.isArray(response) && q.matrixAnswers 
      ? response.length === q.matrixAnswers.length && response.every((r) => r !== undefined && r !== null) 
      : false;
  }
  return typeof response === 'string' && response.trim() !== '';
}

function gradeQuestion(q: Question, response: ResponseValue): boolean {
  if (!hasQuestionAnswered(q, response)) return false;
  if (['mcq', 'true-false', 'calc-mcq'].includes(q.type)) {
    return response === q.correctAnswer;
  }
  if (q.type === 'numerical') {
    const numResp = Number(response);
    if (isNaN(numResp)) return false;
    const target = q.numericalAnswer || 0;
    const tol = q.numericalTolerance || 0;
    return Math.abs(numResp - target) <= tol;
  }
  if (['gap-fill', 'drag-drop', 'table'].includes(q.type)) {
    const arr = Array.isArray(response) ? response : [];
    const sourceString = q.type === 'table' && q.tableData 
      ? q.tableData.map(row => row.join(' ')).join(' ') 
      : q.prompt;
    const correctAnswers = (sourceString.match(/\[(.*?)\]/g) || []).map((b) => b.slice(1, -1));
    return correctAnswers.every((ans, idx) => {
      const resp = String(arr[idx] || '');
      return resp.trim().toLowerCase() === ans.trim().toLowerCase();
    });
  }
  if (q.type === 'table-mcq') {
    const arr = Array.isArray(response) ? response : [];
    if (!q.matrixAnswers) return false;
    return q.matrixAnswers.every((ans, idx) => arr[idx] === ans);
  }
  if (typeof response === 'string') {
    return isTextCorrect(response, q.sampleAnswer);
  }
  return false;
}

async function fetchPublishedUnits(subject: Subject | null, grade: Grade | null): Promise<Unit[] | null> {
  if (!subject || !grade) return null;
  try {
    const base = import.meta.env.BASE_URL || '/';
    const formattedGrade = grade.toLowerCase().replace(/\s+/g, '');
    const filename = `${subject}-${formattedGrade}.json`;
    const res = await fetch(`${base}${filename}`, { cache: 'no-store' });

    if (!res.ok) {
      console.warn('test-data.json request failed with status:', res.status);
      return null;
    }

    const json = await res.json();

    if (Array.isArray(json) && json.length > 0) {
      return json as Unit[];
    }

    if (json && Array.isArray(json.units) && json.units.length > 0) {
      return json.units as Unit[];
    }

    console.warn('test-data.json loaded but format is invalid.');
    return null;
  } catch (error) {
    console.error('Failed to fetch published test-data.json:', error);
    return null;
  }
}

export default function App() {
  const importRef = useRef<HTMLInputElement | null>(null);

  const [userRole, setUserRole] = useState<UserRole>(loadSavedRole());
  const [studentProfile, setStudentProfile] = useState<StudentProfile>(loadSavedStudentProfile());
  const [studentForm, setStudentForm] = useState<StudentProfile>(loadSavedStudentProfile());
  const [adminPin, setAdminPin] = useState('');
  const [adminPinError, setAdminPinError] = useState('');

  const [subject, setSubject] = useState<Subject | null>(() => (localStorage.getItem(SUBJECT_STORAGE_KEY) as Subject) || null);
  const [grade, setGrade] = useState<Grade | null>(() => (localStorage.getItem(GRADE_STORAGE_KEY) as Grade) || null);
  const [subjectForm, setSubjectForm] = useState<Subject | ''>(() => (localStorage.getItem(SUBJECT_STORAGE_KEY) as Subject) || '');
  const [gradeForm, setGradeForm] = useState<Grade | ''>(() => (localStorage.getItem(GRADE_STORAGE_KEY) as Grade) || '');

  const [view, setView] = useState<'admin' | 'assessment' | 'analytics' | 'print'>('assessment');
  const [assessmentMode, setAssessmentMode] = useState<'question' | 'review'>('question');
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);
  const [dataSourceLabel, setDataSourceLabel] = useState<string>('Loading...');

  const [savedProgress, setSavedProgress] = useState<SavedProgress | null>(() => loadSavedProgress((localStorage.getItem(SUBJECT_STORAGE_KEY) as Subject) || null, (localStorage.getItem(GRADE_STORAGE_KEY) as Grade) || null));

  const [selectedUnitIndex, setSelectedUnitIndex] = useState(savedProgress?.selectedUnitIndex ?? 0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(savedProgress?.currentQuestionIndex ?? 0);
  const [activeStimulusIndex, setActiveStimulusIndex] = useState(savedProgress?.activeStimulusIndex ?? 0);
  const [responses, setResponses] = useState<Record<string, ResponseValue>>(savedProgress?.responses ?? {});
  const [flaggedQuestions, setFlaggedQuestions] = useState<string[]>(savedProgress?.flaggedQuestions ?? []);
  const [timeRemaining, setTimeRemaining] = useState(savedProgress?.timeRemaining ?? DEFAULT_TIME_SECONDS);
  const [builderSavedAt, setBuilderSavedAt] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'Saved' | 'Saving...'>('Saved');
  const [previewUnitIndex, setPreviewUnitIndex] = useState<number | null>(null);

  useEffect(() => {
    const prog = loadSavedProgress(subject, grade);
    setSavedProgress(prog);
    setSelectedUnitIndex(prog?.selectedUnitIndex ?? 0);
    setCurrentQuestionIndex(prog?.currentQuestionIndex ?? 0);
    setActiveStimulusIndex(prog?.activeStimulusIndex ?? 0);
    setResponses(prog?.responses ?? {});
    setFlaggedQuestions(prog?.flaggedQuestions ?? []);
    setTimeRemaining(prog?.timeRemaining ?? DEFAULT_TIME_SECONDS);
    
    if (subject && grade) {
      localStorage.setItem(SUBJECT_STORAGE_KEY, subject);
      localStorage.setItem(GRADE_STORAGE_KEY, grade);
    }
  }, [subject, grade]);

  useEffect(() => {
    async function loadUnits() {
      setIsLoadingUnits(true);
      if (!subject || !grade) {
        setUnits([]);
        setIsLoadingUnits(false);
        return;
      }
      try {
        if (userRole === 'student') {
          const publishedUnits = await fetchPublishedUnits(subject, grade);
          if (publishedUnits) {
            setUnits(publishedUnits);
            setDataSourceLabel(`Published ${subject}-${grade.replace(/\s+/g, '')}.json`);
            return;
          }

          setUnits(createInitialUnits());
          setDataSourceLabel('Fallback template');
          return;
        }

        const localBuilder = localStorage.getItem(`${BUILDER_STORAGE_KEY_PREFIX}_${subject}_${grade}`);
        if (localBuilder) {
          setUnits(JSON.parse(localBuilder));
          setDataSourceLabel('Local admin draft');
          return;
        }

        const publishedUnits = await fetchPublishedUnits(subject, grade);
        if (publishedUnits) {
          setUnits(publishedUnits);
          setDataSourceLabel(`Published ${subject}-${grade.replace(/\s+/g, '')}.json`);
          return;
        }

        setUnits(createInitialUnits());
        setDataSourceLabel('Fallback template');
      } catch (error) {
        console.error('Failed to load units:', error);
        setUnits(createInitialUnits());
        setDataSourceLabel('Fallback template');
      } finally {
        setIsLoadingUnits(false);
      }
    }

    loadUnits();
  }, [userRole, subject, grade]);

  useEffect(() => {
    localStorage.setItem(USER_ROLE_STORAGE_KEY, userRole);
  }, [userRole]);

  useEffect(() => {
    localStorage.setItem(STUDENT_PROFILE_STORAGE_KEY, JSON.stringify(studentProfile));
  }, [studentProfile]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeRemaining((prev) => {
        if (view !== 'assessment' || userRole !== 'student') return prev;
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [view, userRole]);

  useEffect(() => {
    if (!subject || !grade) return;
    const payload: SavedProgress = {
      selectedUnitIndex,
      currentQuestionIndex,
      activeStimulusIndex,
      responses,
      flaggedQuestions,
      timeRemaining,
    };
    localStorage.setItem(`${PROGRESS_STORAGE_KEY_PREFIX}_${subject}_${grade}`, JSON.stringify(payload));
  }, [
    selectedUnitIndex,
    currentQuestionIndex,
    activeStimulusIndex,
    responses,
    flaggedQuestions,
    timeRemaining,
    subject,
    grade,
  ]);

  useEffect(() => {
    if (!units.length) return;
    if (userRole !== 'admin') return;
    if (!subject || !grade) return;

    setSaveStatus('Saving...');
    const timer = window.setTimeout(() => {
      localStorage.setItem(`${BUILDER_STORAGE_KEY_PREFIX}_${subject}_${grade}`, JSON.stringify(units));
      setSaveStatus('Saved');
      setBuilderSavedAt(new Date().toLocaleString());
    }, 450);

    return () => window.clearTimeout(timer);
  }, [units, userRole, subject, grade]);

  useEffect(() => {
    if (userRole === 'student') {
      setView('assessment');
    } else if (userRole === 'admin') {
      setView('admin');
    }
  }, [userRole]);

  const selectedUnit = units[selectedUnitIndex];
  const currentQuestion =
    selectedUnit?.questions[currentQuestionIndex] ?? selectedUnit?.questions[0];
  const activeStimulus =
    selectedUnit?.stimulusBlocks[activeStimulusIndex] ?? selectedUnit?.stimulusBlocks[0];
  const previewUnit = previewUnitIndex !== null ? units[previewUnitIndex] : null;

  function saveBuilderNow() {
    if (!subject || !grade) return;
    localStorage.setItem(`${BUILDER_STORAGE_KEY_PREFIX}_${subject}_${grade}`, JSON.stringify(units));
    setSaveStatus('Saved');
    setBuilderSavedAt(new Date().toLocaleString());
    setDataSourceLabel('Local admin draft');
  }

  function resetBuilder() {
    const fresh = createInitialUnits();
    setUnits(fresh);
    if (subject && grade) localStorage.removeItem(`${BUILDER_STORAGE_KEY_PREFIX}_${subject}_${grade}`);
    setSelectedUnitIndex(0);
    setCurrentQuestionIndex(0);
    setActiveStimulusIndex(0);
    setBuilderSavedAt('');
    setSaveStatus('Saved');
    setDataSourceLabel('Fallback template');
  }

  function resetProgress() {
    setResponses({});
    setFlaggedQuestions([]);
    setSelectedUnitIndex(0);
    setCurrentQuestionIndex(0);
    setActiveStimulusIndex(0);
    setTimeRemaining(DEFAULT_TIME_SECONDS);
    setAssessmentMode('question');
    if (subject && grade) localStorage.removeItem(`${PROGRESS_STORAGE_KEY_PREFIX}_${subject}_${grade}`);
  }

  function handleLogout() {
    setUserRole('guest');
    setAdminPin('');
    setAdminPinError('');
    setSubject(null);
    setGrade(null);
    setSubjectForm('');
    setGradeForm('');
  }

  function handleStudentStart() {
    const { name, school, gradeLevel, section } = studentForm;
    if (!name.trim() || !school.trim() || !gradeLevel.trim() || !section.trim()) return;
    if (!subjectForm || !gradeForm) return;
    setStudentProfile(studentForm);
    setSubject(subjectForm);
    setGrade(gradeForm);
    setUserRole('student');
    setView('assessment');
  }

  function handleAdminLogin() {
    if (adminPin === ADMIN_PIN) {
      if (!subjectForm || !gradeForm) {
        setAdminPinError('Select Subject and Grade');
        return;
      }
      setSubject(subjectForm);
      setGrade(gradeForm);
      setUserRole('admin');
      setAdminPin('');
      setAdminPinError('');
      setView('admin');
      return;
    }
    setAdminPinError('Invalid PIN.');
  }

  function exportPrintable() {
    setView('print');
    setTimeout(() => window.print(), 100);
  }

  function exportJSON() {
    const payload = {
      exportedAt: new Date().toISOString(),
      units,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = subject && grade ? `${subject}-${grade.toLowerCase().replace(/\\s+/g, '')}.json` : 'test-data.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    importRef.current?.click();
  }

  async function handleImportJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const importedUnits = Array.isArray(parsed) ? parsed : parsed.units;

      if (!Array.isArray(importedUnits)) {
        alert('Invalid JSON format.');
        return;
      }

      setUnits(importedUnits);
      setSelectedUnitIndex(0);
      setCurrentQuestionIndex(0);
      setActiveStimulusIndex(0);
      setBuilderSavedAt(`Imported on ${new Date().toLocaleString()}`);
      setSaveStatus('Saved');
      setDataSourceLabel('Local admin draft');
    } catch {
      alert('Unable to import JSON file.');
    } finally {
      e.target.value = '';
    }
  }

  function selectUnit(index: number) {
    setSelectedUnitIndex(index);
    setCurrentQuestionIndex(0);
    setActiveStimulusIndex(0);
    setAssessmentMode('question');
  }

  function answer(questionId: string, value: ResponseValue) {
    setResponses((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  }

  function toggleFlag(questionId: string) {
    setFlaggedQuestions((prev) =>
      prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId]
    );
  }

  function addUnit() {
    setUnits((prev) => {
      if (prev.length >= MAX_UNITS) return prev;
      return [...prev, createBlankUnit(prev.length + 1)];
    });
  }

  function updateUnitField(
    unitIndex: number,
    field: keyof Pick<Unit, 'title' | 'competency'>,
    value: string
  ) {
    setUnits((prev) =>
      prev.map((unit, i) => (i === unitIndex ? { ...unit, [field]: value } : unit))
    );
  }

  function updateQuestionField(
    unitIndex: number,
    questionIndex: number,
    field: keyof Question,
    value: any
  ) {
    setUnits((prev) =>
      prev.map((unit, i) => {
        if (i !== unitIndex) return unit;

        const questions = unit.questions.map((q, qi) => {
          if (qi !== questionIndex) return q;

          if (field === 'type') {
            const nextType = value as QuestionType;
            return {
              ...q,
              type: nextType,
              options: ['mcq', 'drag-drop', 'calc-mcq'].includes(nextType) ? q.options : ['', '', '', ''],
              sampleAnswer: nextType === 'text' ? q.sampleAnswer : '',
            };
          }

          return { ...q, [field]: value };
        });

        return { ...unit, questions };
      })
    );
  }

  function updateQuestionOption(
    unitIndex: number,
    questionIndex: number,
    optionIndex: number,
    value: string
  ) {
    setUnits((prev) =>
      prev.map((unit, i) => {
        if (i !== unitIndex) return unit;
        const questions = unit.questions.map((q, qi) => {
          if (qi !== questionIndex) return q;
          const options = [...q.options];
          options[optionIndex] = value;
          return { ...q, options };
        });
        return { ...unit, questions };
      })
    );
  }

  function deleteQuestion(unitIndex: number, questionIndex: number) {
    const unit = units[unitIndex];
    const questionToDelete = unit?.questions[questionIndex];
    if (!questionToDelete) return;
    if (unit.questions.length <= 1) return;

    setUnits((prev) =>
      prev.map((u, i) => {
        if (i !== unitIndex) return u;
        const filtered = u.questions.filter((_, qi) => qi !== questionIndex);
        return { ...u, questions: renumberQuestions(filtered) };
      })
    );

    setResponses((prev) => {
      const next = { ...prev };
      delete next[questionToDelete.id];
      return next;
    });

    setFlaggedQuestions((prev) => prev.filter((id) => id !== questionToDelete.id));

    if (selectedUnitIndex === unitIndex) {
      setCurrentQuestionIndex((prev) => Math.max(0, Math.min(prev, unit.questions.length - 2)));
    }
  }

  function addQuestion(unitIndex: number) {
    setUnits((prev) =>
      prev.map((u, i) => {
        if (i !== unitIndex) return u;
        const newQ = createQuestion(u.questions.length);
        return { ...u, questions: [...u.questions, newQ] };
      })
    );
  }

  async function uploadQuestionImage(unitIndex: number, questionIndex: number, file: File) {
    const base64 = await fileToBase64(file);
    updateQuestionField(unitIndex, questionIndex, 'image', base64);
  }

  function addStimulusBlock(unitIndex: number, type: StimulusBlock['type']) {
    setUnits((prev) =>
      prev.map((unit, i) => {
        if (i !== unitIndex) return unit;
        let newBlock: StimulusBlock;
        if (type === 'article') newBlock = createArticleBlock();
        else if (type === 'table') newBlock = createTableBlock();
        else if (type === 'chart') newBlock = createChartBlock();
        else newBlock = createVisualBlock();
        return { ...unit, stimulusBlocks: [...unit.stimulusBlocks, newBlock] };
      })
    );
  }

  function deleteStimulusBlock(unitIndex: number, blockIndex: number) {
    setUnits((prev) =>
      prev.map((unit, i) => {
        if (i !== unitIndex) return unit;
        if (unit.stimulusBlocks.length <= 1) return unit;
        return {
          ...unit,
          stimulusBlocks: unit.stimulusBlocks.filter((_, bi) => bi !== blockIndex),
        };
      })
    );

    if (selectedUnitIndex === unitIndex) {
      setActiveStimulusIndex((prev) =>
        Math.max(0, Math.min(prev, units[unitIndex].stimulusBlocks.length - 2))
      );
    }
  }

  function updateArticleBlock(
    unitIndex: number,
    blockIndex: number,
    field: keyof ArticleBlock,
    value: string
  ) {
    setUnits((prev) =>
      prev.map((unit, i) => {
        if (i !== unitIndex) return unit;
        const stimulusBlocks = [...unit.stimulusBlocks];
        const block = stimulusBlocks[blockIndex];
        if (!block || block.type !== 'article') return unit;
        stimulusBlocks[blockIndex] = { ...block, [field]: value };
        return { ...unit, stimulusBlocks };
      })
    );
  }

  async function uploadArticleImage(unitIndex: number, blockIndex: number, file: File) {
    const base64 = await fileToBase64(file);
    updateArticleBlock(unitIndex, blockIndex, 'image', base64);
  }

  function updateTableBlockMeta(
    unitIndex: number,
    blockIndex: number,
    field: keyof Pick<TableBlock, 'label' | 'title' | 'note'>,
    value: string
  ) {
    setUnits((prev) =>
      prev.map((unit, i) => {
        if (i !== unitIndex) return unit;
        const stimulusBlocks = [...unit.stimulusBlocks];
        const block = stimulusBlocks[blockIndex];
        if (!block || block.type !== 'table') return unit;
        stimulusBlocks[blockIndex] = { ...block, [field]: value };
        return { ...unit, stimulusBlocks };
      })
    );
  }

  function updateTableHeader(
    unitIndex: number,
    blockIndex: number,
    headerIndex: number,
    value: string
  ) {
    setUnits((prev) =>
      prev.map((unit, i) => {
        if (i !== unitIndex) return unit;
        const stimulusBlocks = [...unit.stimulusBlocks];
        const block = stimulusBlocks[blockIndex];
        if (!block || block.type !== 'table') return unit;
        const headers = [...block.headers];
        headers[headerIndex] = value;
        stimulusBlocks[blockIndex] = { ...block, headers };
        return { ...unit, stimulusBlocks };
      })
    );
  }

  function updateTableCell(
    unitIndex: number,
    blockIndex: number,
    rowIndex: number,
    colIndex: number,
    value: string
  ) {
    setUnits((prev) =>
      prev.map((unit, i) => {
        if (i !== unitIndex) return unit;
        const stimulusBlocks = [...unit.stimulusBlocks];
        const block = stimulusBlocks[blockIndex];
        if (!block || block.type !== 'table') return unit;
        const rows = block.rows.map((row) => [...row]);
        rows[rowIndex][colIndex] = value;
        stimulusBlocks[blockIndex] = { ...block, rows };
        return { ...unit, stimulusBlocks };
      })
    );
  }

  function addTableRow(unitIndex: number, blockIndex: number) {
    setUnits((prev) =>
      prev.map((unit, i) => {
        if (i !== unitIndex) return unit;
        const stimulusBlocks = [...unit.stimulusBlocks];
        const block = stimulusBlocks[blockIndex];
        if (!block || block.type !== 'table') return unit;
        const rows = [...block.rows, Array.from({ length: block.headers.length }, () => '')];
        stimulusBlocks[blockIndex] = { ...block, rows };
        return { ...unit, stimulusBlocks };
      })
    );
  }

  function deleteTableRow(unitIndex: number, blockIndex: number, rowIndex: number) {
    setUnits((prev) =>
      prev.map((unit, i) => {
        if (i !== unitIndex) return unit;
        const stimulusBlocks = [...unit.stimulusBlocks];
        const block = stimulusBlocks[blockIndex];
        if (!block || block.type !== 'table' || block.rows.length <= 1) return unit;
        const rows = block.rows.filter((_, ri) => ri !== rowIndex);
        stimulusBlocks[blockIndex] = { ...block, rows };
        return { ...unit, stimulusBlocks };
      })
    );
  }

  function addTableColumn(unitIndex: number, blockIndex: number) {
    setUnits((prev) =>
      prev.map((unit, i) => {
        if (i !== unitIndex) return unit;
        const stimulusBlocks = [...unit.stimulusBlocks];
        const block = stimulusBlocks[blockIndex];
        if (!block || block.type !== 'table') return unit;
        const headers = [...block.headers, `Column ${block.headers.length + 1}`];
        const rows = block.rows.map((row) => [...row, '']);
        stimulusBlocks[blockIndex] = { ...block, headers, rows };
        return { ...unit, stimulusBlocks };
      })
    );
  }

  function deleteTableColumn(unitIndex: number, blockIndex: number, colIndex: number) {
    setUnits((prev) =>
      prev.map((unit, i) => {
        if (i !== unitIndex) return unit;
        const stimulusBlocks = [...unit.stimulusBlocks];
        const block = stimulusBlocks[blockIndex];
        if (!block || block.type !== 'table' || block.headers.length <= 1) return unit;
        const headers = block.headers.filter((_, ci) => ci !== colIndex);
        const rows = block.rows.map((row) => row.filter((_, ci) => ci !== colIndex));
        stimulusBlocks[blockIndex] = { ...block, headers, rows };
        return { ...unit, stimulusBlocks };
      })
    );
  }

  function updateChartMeta(
    unitIndex: number,
    blockIndex: number,
    field: keyof Pick<ChartBlock, 'label' | 'title' | 'note'>,
    value: string
  ) {
    setUnits((prev) =>
      prev.map((unit, i) => {
        if (i !== unitIndex) return unit;
        const stimulusBlocks = [...unit.stimulusBlocks];
        const block = stimulusBlocks[blockIndex];
        if (!block || block.type !== 'chart') return unit;
        stimulusBlocks[blockIndex] = { ...block, [field]: value };
        return { ...unit, stimulusBlocks };
      })
    );
  }

  function updateChartBar(
    unitIndex: number,
    blockIndex: number,
    barIndex: number,
    field: keyof ChartBar,
    value: string | number
  ) {
    setUnits((prev) =>
      prev.map((unit, i) => {
        if (i !== unitIndex) return unit;
        const stimulusBlocks = [...unit.stimulusBlocks];
        const block = stimulusBlocks[blockIndex];
        if (!block || block.type !== 'chart') return unit;
        const bars = [...block.bars];
        bars[barIndex] = { ...bars[barIndex], [field]: value };
        stimulusBlocks[blockIndex] = { ...block, bars };
        return { ...unit, stimulusBlocks };
      })
    );
  }

  function addChartBar(unitIndex: number, blockIndex: number) {
    setUnits((prev) =>
      prev.map((unit, i) => {
        if (i !== unitIndex) return unit;
        const stimulusBlocks = [...unit.stimulusBlocks];
        const block = stimulusBlocks[blockIndex];
        if (!block || block.type !== 'chart') return unit;
        const bars = [...block.bars, { id: uid('bar'), label: `Bar ${block.bars.length + 1}`, value: 10 }];
        stimulusBlocks[blockIndex] = { ...block, bars };
        return { ...unit, stimulusBlocks };
      })
    );
  }

  function deleteChartBar(unitIndex: number, blockIndex: number, barIndex: number) {
    setUnits((prev) =>
      prev.map((unit, i) => {
        if (i !== unitIndex) return unit;
        const stimulusBlocks = [...unit.stimulusBlocks];
        const block = stimulusBlocks[blockIndex];
        if (!block || block.type !== 'chart' || block.bars.length <= 1) return unit;
        const bars = block.bars.filter((_, bi) => bi !== barIndex);
        stimulusBlocks[blockIndex] = { ...block, bars };
        return { ...unit, stimulusBlocks };
      })
    );
  }

  function updateVisualBlock(
    unitIndex: number,
    blockIndex: number,
    field: keyof VisualBlock,
    value: string
  ) {
    setUnits((prev) =>
      prev.map((unit, i) => {
        if (i !== unitIndex) return unit;
        const stimulusBlocks = [...unit.stimulusBlocks];
        const block = stimulusBlocks[blockIndex];
        if (!block || block.type !== 'visual') return unit;
        stimulusBlocks[blockIndex] = { ...block, [field]: value };
        return { ...unit, stimulusBlocks };
      })
    );
  }

  async function uploadVisualImage(unitIndex: number, blockIndex: number, file: File) {
    const base64 = await fileToBase64(file);
    updateVisualBlock(unitIndex, blockIndex, 'image', base64);
  }

  const allQuestions = useMemo(() => units.flatMap((u) => u.questions), [units]);

  const analytics = useMemo(() => {
    const perUnit = units.map((unit) => {
      const total = unit.questions.length;
      let answered = 0;
      let correct = 0;
      let flagged = 0;

      unit.questions.forEach((q) => {
        const response = responses[q.id];
        if (hasQuestionAnswered(q, response)) {
          answered += 1;
          if (gradeQuestion(q, response)) correct += 1;
        }

        if (flaggedQuestions.includes(q.id)) flagged += 1;
      });

      return {
        unitId: unit.id,
        title: unit.title,
        total,
        answered,
        correct,
        incorrect: answered - correct,
        flagged,
        completionRate: total ? ((answered / total) * 100).toFixed(1) : '0.0',
        accuracyRate: answered ? ((correct / answered) * 100).toFixed(1) : '0.0',
      };
    });

    let totalAnswered = 0;
    let totalCorrect = 0;

    allQuestions.forEach((q) => {
      const response = responses[q.id];
      if (hasQuestionAnswered(q, response)) {
        totalAnswered += 1;
        if (gradeQuestion(q, response)) totalCorrect += 1;
      }
    });

    return {
      totalQuestions: allQuestions.length,
      totalAnswered,
      totalCorrect,
      totalIncorrect: totalAnswered - totalCorrect,
      totalFlagged: flaggedQuestions.length,
      completionRate: allQuestions.length
        ? ((totalAnswered / allQuestions.length) * 100).toFixed(1)
        : '0.0',
      accuracyRate: totalAnswered ? ((totalCorrect / totalAnswered) * 100).toFixed(1) : '0.0',
      perUnit,
    };
  }, [units, allQuestions, responses, flaggedQuestions]);

  const answeredInUnit = selectedUnit
    ? selectedUnit.questions.filter((q) => hasQuestionAnswered(q, responses[q.id])).length
    : 0;

  const flaggedInUnit = selectedUnit
    ? selectedUnit.questions.filter((q) => flaggedQuestions.includes(q.id)).length
    : 0;

  const unitProgress = useMemo(() => {
    return units.map((unit) => {
      const answered = unit.questions.filter((q) => hasQuestionAnswered(q, responses[q.id])).length;

      const percent = unit.questions.length
        ? Math.round((answered / unit.questions.length) * 100)
        : 0;

      return {
        id: unit.id,
        title: unit.title,
        answered,
        total: unit.questions.length,
        percent,
      };
    });
  }, [units, responses]);

  const reviewItems = selectedUnit
    ? selectedUnit.questions.map((q) => {
        const answered = hasQuestionAnswered(q, responses[q.id]);

        return {
          ...q,
          answered,
          flagged: flaggedQuestions.includes(q.id),
        };
      })
    : [];

  function submitAssessment() {
    setAssessmentMode('question');
    setView('analytics');
  }

  if (isLoadingUnits) {
    return (
      <div className="app-shell">
        <div className="entry-page-shell">
          <div className="entry-card role-card">
            <h1>SDO - San Juan City PISA Type Assessment</h1>
            <p className="page-subtitle">Loading assessment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (userRole === 'guest') {
    return (
      <div className="app-shell">
        <div className="entry-page-shell">
          <div className="entry-card role-card">
            <h1>SDO - San Juan City PISA Type Assessment</h1>
            <p className="page-subtitle">Pinaglabanan St, San Juan City</p>

            <div style={{ marginBottom: '20px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
              <div className="field-label" style={{ marginTop: 0 }}>Select Subject</div>
              <select 
                value={subjectForm} 
                onChange={(e) => setSubjectForm(e.target.value as Subject)}
                style={{ width: '100%', padding: '8px', marginBottom: '16px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem' }}
              >
                <option value="">-- Choose Subject --</option>
                <option value="chemistry">Chemistry</option>
                <option value="earth_science">Earth Science</option>
                <option value="life_science">Life Science</option>
                <option value="physics">Physics</option>
              </select>

              <div className="field-label">Select Grade</div>
              <select 
                value={gradeForm} 
                onChange={(e) => setGradeForm(e.target.value as Grade)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem' }}
              >
                <option value="">-- Choose Grade --</option>
                <option value="Grade 6">Grade 6</option>
                <option value="Grade 7">Grade 7</option>
                <option value="Grade 8">Grade 8</option>
                <option value="Grade 9">Grade 9</option>
              </select>
            </div>

            <div className="role-grid">
              <div className="role-panel">
                <div className="section-chip">Student Access</div>
                <h2>Student</h2>

                <div className="field-label">Name</div>
                <input
                  value={studentForm.name}
                  onChange={(e) => setStudentForm((prev) => ({ ...prev, name: e.target.value }))}
                />

                <div className="field-label">School</div>
                <input
                  value={studentForm.school}
                  onChange={(e) => setStudentForm((prev) => ({ ...prev, school: e.target.value }))}
                />

                <div className="field-label">Grade Level</div>
                <input
                  value={studentForm.gradeLevel}
                  onChange={(e) =>
                    setStudentForm((prev) => ({ ...prev, gradeLevel: e.target.value }))
                  }
                />

                <div className="field-label">Section</div>
                <input
                  value={studentForm.section}
                  onChange={(e) => setStudentForm((prev) => ({ ...prev, section: e.target.value }))}
                />

                <button className="primary-btn full-btn" onClick={handleStudentStart}>
                  Start as Student
                </button>
              </div>

              <div className="role-panel">
                <div className="section-chip">Administrator Access</div>
                <h2>Admin</h2>

                <div className="field-label">PIN</div>
                <input
                  type="password"
                  value={adminPin}
                  onChange={(e) => {
                    setAdminPin(e.target.value);
                    setAdminPinError('');
                  }}
                />

                {adminPinError && <p className="error-text">{adminPinError}</p>}

                <button className="primary-btn full-btn" onClick={handleAdminLogin}>
                  Login as Admin
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isStudent = userRole === 'student';
  const isAdmin = userRole === 'admin';

  return (
    <div className="app-shell">
      <input
        ref={importRef}
        type="file"
        accept=".json,application/json"
        className="hidden-file-input"
        onChange={handleImportJSON}
      />

      <div className="page-title-wrap no-print">
        <div>
          <h1>SDO - San Juan City PISA Type Assessment</h1>
          <p className="page-subtitle">Pinaglabanan St, San Juan City</p>
          {isStudent && (
            <p className="student-profile-line">
              Student: <strong>{studentProfile.name}</strong> • {studentProfile.school} •{' '}
              {studentProfile.gradeLevel} • {studentProfile.section}
            </p>
          )}
          {isAdmin && (
            <>
              <p className="save-status">
                {`${saveStatus}${builderSavedAt ? ` • ${builderSavedAt}` : ''}`}
              </p>
              <p className="page-subtitle">Source: {dataSourceLabel}</p>
            </>
          )}
        </div>

        <div className="top-actions">
          {isAdmin && (
            <>
              <button onClick={() => setView('admin')} className="ghost-btn">
                Admin
              </button>
              <button onClick={() => setView('assessment')} className="ghost-btn">
                Assessment
              </button>
              <button onClick={() => setView('analytics')} className="ghost-btn">
                Analytics
              </button>
              <button onClick={() => setView('print')} className="ghost-btn">
                Print View
              </button>
              <button onClick={saveBuilderNow} className="primary-btn">
                Save Builder
              </button>
              <button onClick={exportJSON} className="secondary-btn">
                Export JSON
              </button>
              <button onClick={handleImportClick} className="secondary-btn">
                Import JSON
              </button>
              <button onClick={exportPrintable} className="secondary-btn">
                Print / Export
              </button>
              <button onClick={resetBuilder} className="danger-mini-btn">
                Reset Builder
              </button>
              <button onClick={resetProgress} className="danger-mini-btn">
                Reset Progress
              </button>
            </>
          )}

          {isStudent && (
            <>
              <button onClick={() => setView('assessment')} className="ghost-btn">
                Assessment
              </button>
              <button onClick={() => setView('analytics')} className="ghost-btn">
                Analytics
              </button>
              <button onClick={exportPrintable} className="secondary-btn">
                Print Results
              </button>
              <button onClick={resetProgress} className="danger-mini-btn">
                Reset Progress
              </button>
            </>
          )}

          <button onClick={handleLogout} className="secondary-btn">
            Logout
          </button>
        </div>
      </div>

      {isAdmin && view === 'admin' && selectedUnit && (
        <div className="admin-layout">
          <div className="unit-switcher-card">
            <div className="field-label">Select Unit</div>
            <div className="unit-nav">
              {units.map((unit, idx) => (
                <button
                  key={unit.id}
                  onClick={() => selectUnit(idx)}
                  className={selectedUnitIndex === idx ? 'active' : ''}
                >
                  {unit.title}
                </button>
              ))}
            </div>

            <div className="admin-status-row">
              <span className={`status-pill ${saveStatus === 'Saved' ? 'saved' : 'saving'}`}>
                {saveStatus}
              </span>
            </div>

            <button
              className="primary-btn add-unit-btn"
              onClick={addUnit}
              disabled={units.length >= MAX_UNITS}
            >
              Add Unit ({units.length}/{MAX_UNITS})
            </button>

            <button
              className="secondary-btn add-unit-btn"
              onClick={() => setPreviewUnitIndex(selectedUnitIndex)}
            >
              Preview Unit
            </button>
          </div>

          <div className="unit-card">
            <div className="unit-header">
              <div>
                <div className="section-chip">Admin Builder</div>
                <h2>{selectedUnit.title}</h2>
              </div>
            </div>

            <div className="field-label">Unit Title</div>
            <input
              value={selectedUnit.title}
              onChange={(e) => updateUnitField(selectedUnitIndex, 'title', e.target.value)}
            />

            <div className="field-label">Learning Competencies</div>
            <textarea
              value={selectedUnit.competency}
              onChange={(e) => updateUnitField(selectedUnitIndex, 'competency', e.target.value)}
            />

            <div className="admin-section-title">Stimulus Panel Blocks</div>

            <div className="block-toolbar-buttons">
              <button className="mini-btn" onClick={() => addStimulusBlock(selectedUnitIndex, 'article')}>
                Add Article
              </button>
              <button className="mini-btn" onClick={() => addStimulusBlock(selectedUnitIndex, 'table')}>
                Add Table
              </button>
              <button className="mini-btn" onClick={() => addStimulusBlock(selectedUnitIndex, 'chart')}>
                Add Chart
              </button>
              <button className="mini-btn" onClick={() => addStimulusBlock(selectedUnitIndex, 'visual')}>
                Add Visual
              </button>
            </div>

            {selectedUnit.stimulusBlocks.map((block, blockIndex) => (
              <div key={block.id} className="stimulus-editor-card">
                <div className="admin-question-head">
                  <h3>{block.type.toUpperCase()} Block</h3>
                  <div className="admin-question-actions">
                    <button
                      className="danger-mini-btn"
                      onClick={() => deleteStimulusBlock(selectedUnitIndex, blockIndex)}
                    >
                      Delete Block
                    </button>
                  </div>
                </div>

                {block.type === 'article' && (
                  <>
                    <div className="field-label">Tab Label</div>
                    <input
                      value={block.label}
                      onChange={(e) =>
                        updateArticleBlock(selectedUnitIndex, blockIndex, 'label', e.target.value)
                      }
                    />

                    <div className="field-label">Title</div>
                    <input
                      value={block.title}
                      onChange={(e) =>
                        updateArticleBlock(selectedUnitIndex, blockIndex, 'title', e.target.value)
                      }
                    />

                    <div className="field-label">Content</div>
                    <textarea
                      value={block.content}
                      onChange={(e) =>
                        updateArticleBlock(selectedUnitIndex, blockIndex, 'content', e.target.value)
                      }
                    />

                    <div className="field-label">Article Image</div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadArticleImage(selectedUnitIndex, blockIndex, file);
                      }}
                    />
                    {block.image && <img src={block.image} alt="" className="preview-img" />}
                  </>
                )}

                {block.type === 'table' && (
                  <>
                    <div className="field-label">Tab Label</div>
                    <input
                      value={block.label}
                      onChange={(e) =>
                        updateTableBlockMeta(selectedUnitIndex, blockIndex, 'label', e.target.value)
                      }
                    />

                    <div className="field-label">Title</div>
                    <input
                      value={block.title}
                      onChange={(e) =>
                        updateTableBlockMeta(selectedUnitIndex, blockIndex, 'title', e.target.value)
                      }
                    />

                    <div className="table-controls">
                      <button className="mini-btn" onClick={() => addTableRow(selectedUnitIndex, blockIndex)}>
                        Add Row
                      </button>
                      <button
                        className="mini-btn"
                        onClick={() => addTableColumn(selectedUnitIndex, blockIndex)}
                      >
                        Add Column
                      </button>
                    </div>

                    <div
                      className="dynamic-grid"
                      style={{ gridTemplateColumns: `repeat(${block.headers.length}, minmax(0, 1fr))` }}
                    >
                      {block.headers.map((header, headerIndex) => (
                        <div key={headerIndex} className="table-cell-wrap">
                          <input
                            value={header}
                            onChange={(e) =>
                              updateTableHeader(selectedUnitIndex, blockIndex, headerIndex, e.target.value)
                            }
                          />
                          <button
                            className="mini-btn small-btn"
                            onClick={() => deleteTableColumn(selectedUnitIndex, blockIndex, headerIndex)}
                          >
                            Delete Col
                          </button>
                        </div>
                      ))}
                    </div>

                    {block.rows.map((row, rowIndex) => (
                      <div
                        key={rowIndex}
                        className="dynamic-grid table-row-grid"
                        style={{
                          gridTemplateColumns: `repeat(${block.headers.length}, minmax(0, 1fr)) auto`,
                        }}
                      >
                        {row.map((cell, colIndex) => (
                          <input
                            key={colIndex}
                            value={cell}
                            onChange={(e) =>
                              updateTableCell(
                                selectedUnitIndex,
                                blockIndex,
                                rowIndex,
                                colIndex,
                                e.target.value
                              )
                            }
                          />
                        ))}
                        <button
                          className="danger-mini-btn small-btn"
                          onClick={() => deleteTableRow(selectedUnitIndex, blockIndex, rowIndex)}
                        >
                          Delete Row
                        </button>
                      </div>
                    ))}

                    <div className="field-label">Note</div>
                    <textarea
                      value={block.note}
                      onChange={(e) =>
                        updateTableBlockMeta(selectedUnitIndex, blockIndex, 'note', e.target.value)
                      }
                    />
                  </>
                )}

                {block.type === 'chart' && (
                  <>
                    <div className="field-label">Tab Label</div>
                    <input
                      value={block.label}
                      onChange={(e) =>
                        updateChartMeta(selectedUnitIndex, blockIndex, 'label', e.target.value)
                      }
                    />

                    <div className="field-label">Title</div>
                    <input
                      value={block.title}
                      onChange={(e) =>
                        updateChartMeta(selectedUnitIndex, blockIndex, 'title', e.target.value)
                      }
                    />

                    <button className="mini-btn" onClick={() => addChartBar(selectedUnitIndex, blockIndex)}>
                      Add Bar
                    </button>

                    {block.bars.map((bar, barIndex) => (
                      <div key={bar.id} className="options-grid options-grid-2 chart-bar-editor">
                        <input
                          value={bar.label}
                          onChange={(e) =>
                            updateChartBar(selectedUnitIndex, blockIndex, barIndex, 'label', e.target.value)
                          }
                        />
                        <input
                          type="number"
                          value={bar.value}
                          onChange={(e) =>
                            updateChartBar(
                              selectedUnitIndex,
                              blockIndex,
                              barIndex,
                              'value',
                              Number(e.target.value)
                            )
                          }
                        />
                        <button
                          className="danger-mini-btn small-btn"
                          onClick={() => deleteChartBar(selectedUnitIndex, blockIndex, barIndex)}
                        >
                          Delete Bar
                        </button>
                      </div>
                    ))}

                    <div className="field-label">Note</div>
                    <textarea
                      value={block.note}
                      onChange={(e) =>
                        updateChartMeta(selectedUnitIndex, blockIndex, 'note', e.target.value)
                      }
                    />
                  </>
                )}

                {block.type === 'visual' && (
                  <>
                    <div className="field-label">Tab Label</div>
                    <input
                      value={block.label}
                      onChange={(e) =>
                        updateVisualBlock(selectedUnitIndex, blockIndex, 'label', e.target.value)
                      }
                    />

                    <div className="field-label">Title</div>
                    <input
                      value={block.title}
                      onChange={(e) =>
                        updateVisualBlock(selectedUnitIndex, blockIndex, 'title', e.target.value)
                      }
                    />

                    <div className="field-label">Visual Image</div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadVisualImage(selectedUnitIndex, blockIndex, file);
                      }}
                    />
                    {block.image && <img src={block.image} alt="" className="preview-img" />}

                    <div className="field-label">Note</div>
                    <textarea
                      value={block.note}
                      onChange={(e) =>
                        updateVisualBlock(selectedUnitIndex, blockIndex, 'note', e.target.value)
                      }
                    />
                  </>
                )}
              </div>
            ))}

            <div className="admin-section-title">Questions</div>

            {selectedUnit.questions.map((q, qIndex) => (
              <div key={q.id} className="question-card admin-question-card">
                <div className="admin-question-head">
                  <h3>Question {q.number}</h3>
                  <div className="admin-question-actions">
                    <button
                      className="danger-mini-btn"
                      onClick={() => deleteQuestion(selectedUnitIndex, qIndex)}
                    >
                      Delete Question
                    </button>
                  </div>
                </div>

                <div className="field-label">Question Type</div>
                <select
                  value={q.type}
                  onChange={(e) =>
                    updateQuestionField(selectedUnitIndex, qIndex, 'type', e.target.value as QuestionType)
                  }
                >
                  <option value="mcq">Multiple Choice</option>
                  <option value="text">Text Response</option>
                  <option value="true-false">True / False</option>
                  <option value="numerical">Numerical</option>
                  <option value="gap-fill">Gap Fill</option>
                  <option value="drag-drop">Drag and Drop</option>
                  <option value="calc-mcq">Calculated MCQ</option>
                  <option value="table">Table Response</option>
                  <option value="table-mcq">Table MCQ (Matrix)</option>
                </select>

                <div className="field-label">
                  Prompt
                  {(q.type === 'gap-fill' || q.type === 'drag-drop' || q.type === 'table' || q.type === 'table-mcq') && (
                    <span style={{ fontWeight: 'normal', fontSize: '13px', marginLeft: '8px', color: '#666' }}>
                      {['table', 'table-mcq'].includes(q.type) ? '(Use the Reference Table below for the grid)' : '(Wrap words in [brackets] to create blanks. e.g. "The capital is [Paris]")'}
                    </span>
                  )}
                </div>
                <textarea
                  value={q.prompt}
                  onChange={(e) =>
                    updateQuestionField(selectedUnitIndex, qIndex, 'prompt', e.target.value)
                  }
                />

                <div className="field-label">Question Image</div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadQuestionImage(selectedUnitIndex, qIndex, file);
                  }}
                />
                {q.image && (
                  <div style={{ marginTop: '10px' }}>
                    <img src={q.image} alt="" className="preview-img" style={{ display: 'block', marginBottom: '8px' }} />
                    <button
                      className="danger-mini-btn small-btn"
                      onClick={() => updateQuestionField(selectedUnitIndex, qIndex, 'image', undefined)}
                    >
                      Remove Image
                    </button>
                  </div>
                )}

                <div className="field-label" style={{ marginTop: '16px' }}>Reference Table</div>
                {q.tableData ? (
                  <div className="admin-table-builder" style={{ marginBottom: '16px', background: '#f8fbff', padding: '12px', border: '1px solid var(--line)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                      <button className="danger-mini-btn small-btn" onClick={() => updateQuestionField(selectedUnitIndex, qIndex, 'tableData', undefined)}>Remove Table</button>
                    </div>
                    <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
                      <table className="builder-table">
                        <tbody>
                          {q.tableData.map((row, rIndex) => (
                            <tr key={rIndex}>
                              {row.map((cell, cIndex) => {
                                if (q.type === 'table-mcq' && rIndex > 0 && cIndex > 0) {
                                  return (
                                    <td key={cIndex} style={{ padding: '4px', textAlign: 'center' }}>
                                      <input
                                        type="radio"
                                        name={`admin-matrix-${qIndex}-${rIndex}`}
                                        checked={q.matrixAnswers?.[rIndex - 1] === cIndex - 1}
                                        onChange={() => {
                                          const newAnswers = [...(q.matrixAnswers || new Array(q.tableData!.length - 1).fill(undefined))];
                                          newAnswers[rIndex - 1] = cIndex - 1;
                                          updateQuestionField(selectedUnitIndex, qIndex, 'matrixAnswers', newAnswers);
                                        }}
                                        style={{ cursor: 'pointer' }}
                                      />
                                    </td>
                                  );
                                }
                                return (
                                  <td key={cIndex} style={{ padding: '4px' }}>
                                    <input
                                      value={cell}
                                      placeholder={q.type === 'table-mcq' && rIndex === 0 && cIndex === 0 ? "Top-Left Label (Optional)" : "Cell text..."}
                                      style={{ margin: 0, padding: '6px 8px', width: '120px' }}
                                      onChange={(e) => {
                                        const newTable = [...q.tableData!];
                                        newTable[rIndex] = [...newTable[rIndex]];
                                        newTable[rIndex][cIndex] = e.target.value;
                                        updateQuestionField(selectedUnitIndex, qIndex, 'tableData', newTable);
                                      }}
                                    />
                                  </td>
                                );
                              })}
                              <td style={{ verticalAlign: 'middle', border: 'none', background: 'transparent' }}>
                                <button className="danger-mini-btn small-btn" title="Remove Row" onClick={() => {
                                  const newTable = q.tableData!.filter((_, idx) => idx !== rIndex);
                                  updateQuestionField(selectedUnitIndex, qIndex, 'tableData', newTable.length ? newTable : undefined);
                                }}>- Row</button>
                              </td>
                            </tr>
                          ))}
                          <tr>
                            {q.tableData[0]?.map((_, cIndex) => (
                               <td key={`col-rem-${cIndex}`} style={{ textAlign: 'center', border: 'none', background: 'transparent' }}>
                                 <button className="danger-mini-btn small-btn" title="Remove Column" onClick={() => {
                                   const newTable = q.tableData!.map(r => r.filter((_, idx) => idx !== cIndex));
                                   updateQuestionField(selectedUnitIndex, qIndex, 'tableData', newTable[0].length ? newTable : undefined);
                                 }}>- Col</button>
                               </td>
                            ))}
                            <td style={{ border: 'none', background: 'transparent' }}></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button className="secondary-btn small-btn" onClick={() => {
                        const newTable = [...q.tableData!, new Array(q.tableData![0].length).fill('')];
                        updateQuestionField(selectedUnitIndex, qIndex, 'tableData', newTable);
                      }}>+ Add Row</button>
                      <button className="secondary-btn small-btn" onClick={() => {
                        const newTable = q.tableData!.map(row => [...row, '']);
                        updateQuestionField(selectedUnitIndex, qIndex, 'tableData', newTable);
                      }}>+ Add Column</button>
                    </div>

                    {q.type === 'table' && (
                      <div style={{ marginTop: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div className="field-label" style={{ marginTop: 0, color: 'var(--primary)' }}>Correct Answers Extracted</div>
                        <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                          Add [brackets] to the Table cells above to define the correct answers for the students to fill in.
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {(q.tableData.map(row => row.join(' ')).join(' ').match(/\[(.*?)\]/g) || []).map((ans, i) => (
                            <span key={i} style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '4px', fontSize: '13px', fontWeight: 600 }}>
                              Blank {i + 1}: <span style={{ color: 'var(--primary)' }}>{ans.slice(1, -1)}</span>
                            </span>
                          ))}
                          {(q.tableData.map(row => row.join(' ')).join(' ').match(/\[(.*?)\]/g) || []).length === 0 && (
                            <span style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>No blanks defined yet...</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button className="secondary-btn small-btn" style={{ marginBottom: '16px' }} onClick={() => {
                    updateQuestionField(selectedUnitIndex, qIndex, 'tableData', [['Header 1', 'Header 2'], ['Value 1', 'Value 2']]);
                  }}>
                    + Add Reference Table
                  </button>
                )}

                {q.type === 'mcq' && (
                  <>
                    <div className="options-grid options-grid-2">
                      {q.options.map((opt, i) => (
                        <div key={`${q.id}-option-${i}`}>
                          <div className="field-label">Option {String.fromCharCode(65 + i)}</div>
                          <input
                            value={opt}
                            onChange={(e) =>
                              updateQuestionOption(selectedUnitIndex, qIndex, i, e.target.value)
                            }
                          />
                        </div>
                      ))}
                    </div>

                    <div className="field-label">Correct Answer</div>
                    <select
                      value={q.correctAnswer}
                      onChange={(e) =>
                        updateQuestionField(
                          selectedUnitIndex,
                          qIndex,
                          'correctAnswer',
                          Number(e.target.value)
                        )
                      }
                    >
                      <option value={0}>A</option>
                      <option value={1}>B</option>
                      <option value={2}>C</option>
                      <option value={3}>D</option>
                    </select>
                  </>
                )}

                {q.type === 'true-false' && (
                  <>
                    <div className="field-label">Correct Answer</div>
                    <select
                      value={q.correctAnswer}
                      onChange={(e) =>
                        updateQuestionField(
                          selectedUnitIndex,
                          qIndex,
                          'correctAnswer',
                          Number(e.target.value)
                        )
                      }
                    >
                      <option value={0}>True</option>
                      <option value={1}>False</option>
                    </select>
                  </>
                )}

                {q.type === 'numerical' && (
                  <div className="options-grid options-grid-2">
                    <div>
                      <div className="field-label">Correct Value</div>
                      <input
                        type="number"
                        value={q.numericalAnswer || 0}
                        onChange={(e) =>
                          updateQuestionField(selectedUnitIndex, qIndex, 'numericalAnswer', Number(e.target.value))
                        }
                      />
                    </div>
                    <div>
                      <div className="field-label">Tolerance (±)</div>
                      <input
                        type="number"
                        value={q.numericalTolerance || 0}
                        onChange={(e) =>
                          updateQuestionField(selectedUnitIndex, qIndex, 'numericalTolerance', Number(e.target.value))
                        }
                      />
                    </div>
                  </div>
                )}

                {q.type === 'drag-drop' && (
                  <>
                    <div className="field-label">Distractor Options</div>
                    <div className="options-grid options-grid-2">
                      {q.options.map((opt, i) => (
                        <div key={`${q.id}-distractor-${i}`} className="table-cell-wrap" style={{ display: 'flex', gap: '4px' }}>
                          <input
                            value={opt}
                            onChange={(e) =>
                              updateQuestionOption(selectedUnitIndex, qIndex, i, e.target.value)
                            }
                            placeholder={`Distractor ${i + 1}`}
                          />
                          <button
                            className="mini-btn small-btn danger-mini-btn"
                            onClick={() => {
                              const options = q.options.filter((_, idx) => idx !== i);
                              updateQuestionField(selectedUnitIndex, qIndex, 'options', options);
                            }}
                          >
                            X
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      className="mini-btn"
                      style={{ marginTop: '8px' }}
                      onClick={() => {
                        const options = [...q.options, ''];
                        updateQuestionField(selectedUnitIndex, qIndex, 'options', options);
                      }}
                    >
                      Add Distractor
                    </button>
                  </>
                )}

                {q.type === 'calc-mcq' && (
                  <>
                    <div className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Variables
                      <span style={{ fontWeight: 'normal', fontSize: '13px', color: '#666' }}>
                        (Use [var_name] in Prompt)
                      </span>
                    </div>
                    {(q.calcVariables || []).map((v, i) => (
                      <div key={i} className="options-grid options-grid-3" style={{ marginBottom: '8px' }}>
                        <input
                          placeholder="Name (e.g. x)"
                          value={v.name}
                          onChange={(e) => {
                            const vars = [...(q.calcVariables || [])];
                            vars[i] = { ...vars[i], name: e.target.value };
                            updateQuestionField(selectedUnitIndex, qIndex, 'calcVariables', vars);
                          }}
                        />
                        <input
                          type="number"
                          placeholder="Min"
                          value={v.min}
                          onChange={(e) => {
                            const vars = [...(q.calcVariables || [])];
                            vars[i] = { ...vars[i], min: Number(e.target.value) };
                            updateQuestionField(selectedUnitIndex, qIndex, 'calcVariables', vars);
                          }}
                        />
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <input
                            type="number"
                            placeholder="Max"
                            value={v.max}
                            onChange={(e) => {
                              const vars = [...(q.calcVariables || [])];
                              vars[i] = { ...vars[i], max: Number(e.target.value) };
                              updateQuestionField(selectedUnitIndex, qIndex, 'calcVariables', vars);
                            }}
                          />
                          <button
                            className="mini-btn small-btn danger-mini-btn"
                            onClick={() => {
                              const vars = (q.calcVariables || []).filter((_, idx) => idx !== i);
                              updateQuestionField(selectedUnitIndex, qIndex, 'calcVariables', vars);
                            }}
                          >
                            X
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      className="mini-btn"
                      onClick={() => {
                        const vars = [...(q.calcVariables || []), { name: 'y', min: 1, max: 10 }];
                        updateQuestionField(selectedUnitIndex, qIndex, 'calcVariables', vars);
                      }}
                    >
                      Add Variable
                    </button>

                    <div className="field-label" style={{ marginTop: '16px' }}>Option Formulas & Correct Answer</div>
                    <div className="options-grid options-grid-2">
                      {q.options.map((opt, i) => (
                        <div key={`${q.id}-calc-opt-${i}`} className="table-cell-wrap" style={{ display: 'flex', gap: '4px' }}>
                          <input
                            value={opt}
                            onChange={(e) =>
                              updateQuestionOption(selectedUnitIndex, qIndex, i, e.target.value)
                            }
                            placeholder={`Formula for Option ${String.fromCharCode(65 + i)}`}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="field-label" style={{ marginTop: '16px' }}>Correct Answer</div>
                    <select
                      value={q.correctAnswer}
                      onChange={(e) =>
                        updateQuestionField(
                          selectedUnitIndex,
                          qIndex,
                          'correctAnswer',
                          Number(e.target.value)
                        )
                      }
                    >
                      {q.options.map((_, i) => (
                        <option key={i} value={i}>{String.fromCharCode(65 + i)}</option>
                      ))}
                    </select>
                  </>
                )}

                {['gap-fill', 'drag-drop'].includes(q.type) && (
                  <div style={{ marginTop: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div className="field-label" style={{ marginTop: 0, color: 'var(--primary)' }}>Correct Answers Extracted</div>
                    <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                      Add [brackets] to the Prompt above to define the correct answers.
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {(q.prompt.match(/\[(.*?)\]/g) || []).map((ans, i) => (
                        <span key={i} style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '4px', fontSize: '13px', fontWeight: 600 }}>
                          Blank {i + 1}: <span style={{ color: 'var(--primary)' }}>{ans.slice(1, -1)}</span>
                        </span>
                      ))}
                      {(q.prompt.match(/\[(.*?)\]/g) || []).length === 0 && (
                        <span style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>No blanks defined yet...</span>
                      )}
                    </div>
                  </div>
                )}
                
                {q.type === 'text' && (
                  <>
                    <div className="field-label">Correct Answer / Sample Answer</div>
                    <textarea
                      value={q.sampleAnswer}
                      placeholder="Admin will use this string as the golden answer to grade against..."
                      onChange={(e) =>
                        updateQuestionField(selectedUnitIndex, qIndex, 'sampleAnswer', e.target.value)
                      }
                    />
                  </>
                )}
              </div>
            ))}
            
            <button
              className="primary-btn"
              style={{ marginTop: '20px' }}
              onClick={() => addQuestion(selectedUnitIndex)}
            >
              + Add Question
            </button>
          </div>
        </div>
      )}

      {view === 'assessment' &&
        assessmentMode === 'question' &&
        selectedUnit &&
        currentQuestion &&
        activeStimulus && (
          <>
            <div className="assessment-topbar">
              <div className="assessment-brand">
                <div className="brand-mark">P</div>
                <div>
                  <h2>{selectedUnit.title}</h2>
                  <p>{isStudent ? `Source: ${dataSourceLabel}` : ''}</p>
                </div>
              </div>

              <div className="assessment-metrics">
                <div className="metric-card timer-card">
                  <span>Timer</span>
                  <strong>{formatTime(timeRemaining)}</strong>
                </div>
                <div className="metric-card">
                  <span>Answered</span>
                  <strong>{answeredInUnit}</strong>
                </div>
                <div className="metric-card">
                  <span>Flagged</span>
                  <strong>{flaggedInUnit}</strong>
                </div>
                <div className="metric-card accent">
                  <span>Current</span>
                  <strong>
                    {currentQuestionIndex + 1}/{selectedUnit.questions.length}
                  </strong>
                </div>
              </div>
            </div>

            <div className="unit-progress-strip">
              {unitProgress.map((item, idx) => (
                <div key={item.id} className={`unit-progress-card ${idx === selectedUnitIndex ? 'active' : ''}`}>
                  <div className="unit-progress-top">
                    <span>{item.title}</span>
                    <span>
                      {item.answered}/{item.total}
                    </span>
                  </div>
                  <div className="unit-progress-bar">
                    <div className="unit-progress-fill" style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="assessment-main">
              <div className="question-pane">
                <div className="unit-nav">
                  {units.map((unit, idx) => (
                    <button
                      key={unit.id}
                      onClick={() => selectUnit(idx)}
                      className={selectedUnitIndex === idx ? 'active' : ''}
                    >
                      {unit.title}
                    </button>
                  ))}
                </div>

                <div className="question-progress-card">
                  <div className="question-progress-head">
                    <span>Question Navigator</span>
                    <span>
                      {currentQuestionIndex + 1} / {selectedUnit.questions.length}
                    </span>
                  </div>

                  <div className="question-number-grid">
                    {selectedUnit.questions.map((q, idx) => {
                      const isAnswered = hasQuestionAnswered(q, responses[q.id]);
                      const isActive = idx === currentQuestionIndex;
                      const isFlagged = flaggedQuestions.includes(q.id);

                      return (
                        <button
                          key={q.id}
                          className={`question-number-btn ${isAnswered ? 'answered' : ''} ${
                            isActive ? 'active' : ''
                          } ${isFlagged ? 'flagged' : ''}`}
                          onClick={() => setCurrentQuestionIndex(idx)}
                        >
                          {q.number}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="question-workspace">
                  <div className="question-meta-line">
                    <span className="question-tag">Question {currentQuestion.number}</span>
                    <span className="question-domain">
                      {currentQuestion.type === 'mcq' ? 'Multiple Choice' : 
                       currentQuestion.type === 'true-false' ? 'True / False' :
                       currentQuestion.type === 'numerical' ? 'Numerical' :
                       currentQuestion.type === 'gap-fill' ? 'Gap Fill' :
                       currentQuestion.type === 'drag-drop' ? 'Drag and Drop' :
                       currentQuestion.type === 'calc-mcq' ? 'Calculated MCQ' :
                       currentQuestion.type === 'table' ? 'Table Response' :
                       currentQuestion.type === 'table-mcq' ? 'Table MCQ (Matrix)' : 'Text Response'}
                    </span>
                  </div>

                  <div className="flag-row">
                    <button
                      className={`flag-btn ${flaggedQuestions.includes(currentQuestion.id) ? 'active' : ''}`}
                      onClick={() => toggleFlag(currentQuestion.id)}
                    >
                      {flaggedQuestions.includes(currentQuestion.id)
                        ? 'Unflag for Review'
                        : 'Flag for Review'}
                    </button>
                  </div>

                  <div className="assessment-question-card">
                    {currentQuestion.type !== 'gap-fill' && currentQuestion.type !== 'drag-drop' && (
                      <h3>
                        {currentQuestion.type === 'calc-mcq' 
                          ? (() => {
                              const vars = (responses[`${currentQuestion.id}:vars`] as Record<string, number>) || {};
                              return currentQuestion.prompt.replace(/\[(.*?)\]/g, (match, v) => vars[v] !== undefined ? String(vars[v]) : match);
                            })()
                          : currentQuestion.prompt}
                      </h3>
                    )}

                    {(currentQuestion.type === 'gap-fill' || currentQuestion.type === 'drag-drop') && (
                      <h3 className="gap-fill-prompt" style={{ lineHeight: '2' }}>
                        {currentQuestion.prompt.split(/(\[.*?\])/g).map((part, i) => {
                          if (part.startsWith('[') && part.endsWith(']')) {
                            const partsBefore = currentQuestion.prompt.split(/(\[.*?\])/g).slice(0, i);
                            const blankIndex = partsBefore.filter((p) => p.startsWith('[') && p.endsWith(']')).length;
                            const curResponses = Array.isArray(responses[currentQuestion.id]) 
                              ? (responses[currentQuestion.id] as string[]) 
                              : [];
                            
                            if (currentQuestion.type === 'gap-fill') {
                              return (
                                <input
                                  key={i}
                                  type="text"
                                  className="text-response-area inline-gap-fill"
                                  style={{ display: 'inline-block', width: '120px', padding: '4px', margin: '0 8px', minHeight: 'auto' }}
                                  value={curResponses[blankIndex] || ''}
                                  onChange={(e) => {
                                    const next = [...curResponses];
                                    next[blankIndex] = e.target.value;
                                    answer(currentQuestion.id, next);
                                  }}
                                />
                              );
                            } else {
                              return (
                                <span
                                  key={i}
                                  className="drop-zone"
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    minWidth: '100px', padding: '4px 8px', margin: '0 8px',
                                    border: '2px dashed #0056b3', minHeight: '32px', backgroundColor: '#f0f8ff',
                                    verticalAlign: 'middle', cursor: 'pointer', borderRadius: '4px'
                                  }}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    const data = e.dataTransfer.getData('text/plain');
                                    if (data) {
                                      const next = [...curResponses];
                                      next[blankIndex] = data;
                                      answer(currentQuestion.id, next);
                                    }
                                  }}
                                  onClick={() => {
                                    if (curResponses[blankIndex]) {
                                      const next = [...curResponses];
                                      next[blankIndex] = '';
                                      answer(currentQuestion.id, next);
                                    }
                                  }}
                                >
                                  {curResponses[blankIndex] || <span style={{ opacity: 0.5, fontSize: '14px' }}>Drop here</span>}
                                </span>
                              );
                            }
                          }
                          return <span key={i}>{part}</span>;
                        })}
                      </h3>
                    )}

                    {currentQuestion.type === 'drag-drop' && (
                      <div className="drag-options-container" style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #ddd' }}>
                        <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>Draggable Options:</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {Array.from(new Set([
                            ...(currentQuestion.prompt.match(/\[(.*?)\]/g) || []).map((b) => b.slice(1, -1)),
                            ...currentQuestion.options
                          ]))
                            .filter((o) => o?.trim() !== '')
                            .map((opt, i) => (
                              <div
                                key={i}
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData('text/plain', opt)}
                                style={{
                                  padding: '6px 12px', backgroundColor: '#fff', border: '1px solid #ccc',
                                  borderRadius: '4px', cursor: 'grab', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                }}
                              >
                                {opt}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {currentQuestion.image && (
                      <img src={currentQuestion.image} alt="" className="preview-img assessment-img" />
                    )}

                    {currentQuestion.tableData && currentQuestion.tableData.length > 0 && (
                      <div className="assessment-table-wrap" style={{ overflowX: 'auto', marginBottom: '16px', marginTop: '12px' }}>
                        <table className="builder-table" style={{ width: '100%', minWidth: '400px' }}>
                          {currentQuestion.tableData.length > 1 && (
                            <thead>
                              <tr>
                                {currentQuestion.tableData[0].map((header, i) => {
                                  if (currentQuestion.type === 'table' && header.includes('[')) {
                                    return <th key={i}>{header}</th>; // Actually, allow parsing headers too if they want
                                  }
                                  return <th key={i}>{header}</th>;
                                })}
                              </tr>
                            </thead>
                          )}
                          <tbody>
                            {currentQuestion.tableData.slice(currentQuestion.tableData.length > 1 ? 1 : 0).map((row, r) => (
                              <tr key={r}>
                                {row.map((cell, c) => {
                                  if (currentQuestion.type === 'table-mcq' && c > 0) {
                                    const curResponses = Array.isArray(responses[currentQuestion.id])
                                      ? (responses[currentQuestion.id] as number[])
                                      : new Array(currentQuestion.tableData!.length - 1).fill(undefined);
                                    
                                    return (
                                      <td key={c} style={{ textAlign: 'center' }}>
                                        <input 
                                          type="radio"
                                          name={`student-matrix-${currentQuestion.id}-${r}`}
                                          checked={curResponses[r] === c - 1}
                                          onChange={() => {
                                            const next = [...curResponses];
                                            next[r] = c - 1;
                                            answer(currentQuestion.id, next);
                                          }}
                                          style={{ width: '20px', height: '20px', cursor: 'pointer', margin: 0 }}
                                        />
                                      </td>
                                    );
                                  }

                                  if (currentQuestion.type === 'table') {
                                    // Parse cell for [brackets]
                                    let cellBlankIndexCount = 0;
                                    // Count blanks in all PREVIOUS cells (headers, earlier rows, earlier cols)
                                    if (currentQuestion.tableData) {
                                      const flatTable = currentQuestion.tableData.flat();
                                      const rowOffset = currentQuestion.tableData.length > 1 ? 1 : 0;
                                      const flatIndexToHere = (r + rowOffset) * currentQuestion.tableData[0].length + c;
                                      const tableBefore = flatTable.slice(0, flatIndexToHere).join(' ');
                                      cellBlankIndexCount = (tableBefore.match(/\[(.*?)\]/g) || []).length;
                                    }

                                    const curResponses = Array.isArray(responses[currentQuestion.id])
                                      ? (responses[currentQuestion.id] as string[])
                                      : [];

                                    return (
                                      <td key={c}>
                                        {cell.split(/(\[.*?\])/g).map((part, i) => {
                                          if (part.startsWith('[') && part.endsWith(']')) {
                                            const partsBeforeInCell = cell.split(/(\[.*?\])/g).slice(0, i);
                                            const blankInCell = partsBeforeInCell.filter(p => p.startsWith('[') && p.endsWith(']')).length;
                                            const overallBlankIndex = cellBlankIndexCount + blankInCell;

                                            return (
                                              <input
                                                key={i}
                                                type="text"
                                                className="text-response-area inline-gap-fill"
                                                style={{ display: 'inline-block', width: '90px', padding: '4px', margin: '4px', minHeight: 'auto', border: '1px solid #cad5e2' }}
                                                value={curResponses[overallBlankIndex] || ''}
                                                onChange={(e) => {
                                                  const next = [...curResponses];
                                                  next[overallBlankIndex] = e.target.value;
                                                  answer(currentQuestion.id, next);
                                                }}
                                              />
                                            );
                                          }
                                          return <span key={i}>{part}</span>;
                                        })}
                                      </td>
                                    );
                                  }
                                  
                                  // Standard rendering for non-table types
                                  return <td key={c}>{cell}</td>;
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {currentQuestion.type === 'calc-mcq' && (
                      <div className="assessment-options">
                        {currentQuestion.options.map((opt, i) => {
                          const vars = (responses[`${currentQuestion.id}:vars`] as Record<string, number>) || {};
                          const evaluated = evaluateFormula(opt, vars);
                          const finalDisplay = isNaN(evaluated) ? 'Error in formula' : evaluated;

                          return (
                            <label key={`${currentQuestion.id}-${i}`} className="assessment-option">
                              <input
                                type="radio"
                                name={currentQuestion.id}
                                checked={responses[currentQuestion.id] === i}
                                onChange={() => answer(currentQuestion.id, i)}
                              />
                              <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                              <span>{finalDisplay}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {currentQuestion.type === 'mcq' && (
                      <div className="assessment-options">
                        {currentQuestion.options.map((opt, i) => (
                          <label key={`${currentQuestion.id}-${i}`} className="assessment-option">
                            <input
                              type="radio"
                              name={currentQuestion.id}
                              checked={responses[currentQuestion.id] === i}
                              onChange={() => answer(currentQuestion.id, i)}
                            />
                            <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {currentQuestion.type === 'true-false' && (
                      <div className="assessment-options">
                        <label className="assessment-option">
                          <input
                            type="radio"
                            name={currentQuestion.id}
                            checked={responses[currentQuestion.id] === 0}
                            onChange={() => answer(currentQuestion.id, 0)}
                          />
                          <span className="option-letter">T</span>
                          <span>True</span>
                        </label>
                        <label className="assessment-option">
                          <input
                            type="radio"
                            name={currentQuestion.id}
                            checked={responses[currentQuestion.id] === 1}
                            onChange={() => answer(currentQuestion.id, 1)}
                          />
                          <span className="option-letter">F</span>
                          <span>False</span>
                        </label>
                      </div>
                    )}

                    {currentQuestion.type === 'numerical' && (
                      <div className="text-response-box">
                        <label className="field-label">Your Numerical Answer</label>
                        <input
                          type="number"
                          className="text-response-area"
                          style={{ maxWidth: '300px' }}
                          value={
                            typeof responses[currentQuestion.id] === 'string'
                              ? (responses[currentQuestion.id] as string)
                              : ''
                          }
                          onChange={(e) => answer(currentQuestion.id, e.target.value)}
                          placeholder="Type a number..."
                        />
                      </div>
                    )}

                    {currentQuestion.type === 'text' && (
                      <div className="text-response-box">
                        <label className="field-label">Your Answer</label>
                        <textarea
                          className="text-response-area"
                          value={
                            typeof responses[currentQuestion.id] === 'string'
                              ? (responses[currentQuestion.id] as string)
                              : ''
                          }
                          onChange={(e) => answer(currentQuestion.id, e.target.value)}
                          placeholder="Type your response here..."
                        />
                      </div>
                    )}
                  </div>

                  <div className="assessment-nav-row">
                    <button
                      className="soft-btn"
                      disabled={currentQuestionIndex === 0}
                      onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                    >
                      Previous
                    </button>

                    <div className="assessment-nav-center">
                      <button className="secondary-btn" onClick={() => setAssessmentMode('review')}>
                        Review Screen
                      </button>
                    </div>

                    <button
                      className="primary-btn"
                      disabled={currentQuestionIndex === selectedUnit.questions.length - 1}
                      onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>

              <div className="stimulus-pane">
                <div className="stimulus-window">
                  <div className="stimulus-window-top">
                    <div className="window-dots">
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="window-title">{selectedUnit.title}</div>
                  </div>

                  <div className="stimulus-hero">
                    <h3>Learning Competencies</h3>
                    <p>{selectedUnit.competency}</p>
                  </div>

                  <div className="stimulus-tabs">
                    {selectedUnit.stimulusBlocks.map((block, idx) => (
                      <button
                        key={block.id}
                        className={`stimulus-tab ${activeStimulusIndex === idx ? 'active' : ''}`}
                        onClick={() => setActiveStimulusIndex(idx)}
                      >
                        {block.label}
                      </button>
                    ))}
                  </div>

                  <div className="stimulus-body-stacked">
                    {activeStimulus.type === 'article' && (
                      <div className="stimulus-content-card">
                        <h4>{activeStimulus.title || 'Article'}</h4>
                        {activeStimulus.image && (
                          <img src={activeStimulus.image} alt="" className="preview-img stimulus-img" />
                        )}
                        <p>{activeStimulus.content || 'No content added yet.'}</p>
                      </div>
                    )}

                    {activeStimulus.type === 'table' && (
                      <div className="stimulus-content-card">
                        <h4>{activeStimulus.title || 'Table'}</h4>
                        <table className="builder-table">
                          <thead>
                            <tr>
                              {activeStimulus.headers.map((header, i) => (
                                <th key={i}>{header}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {activeStimulus.rows.map((row, i) => (
                              <tr key={i}>
                                {row.map((cell, ci) => (
                                  <td key={ci}>{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {activeStimulus.note && <p className="tab-note">{activeStimulus.note}</p>}
                      </div>
                    )}

                    {activeStimulus.type === 'chart' && (
                      <div className="stimulus-content-card">
                        <h4>{activeStimulus.title || 'Chart'}</h4>
                        <div className="chart-card">
                          <div className="chart-bars">
                            {activeStimulus.bars.map((bar) => {
                              const max = Math.max(...activeStimulus.bars.map((b) => b.value), 1);
                              return (
                                <div key={bar.id} className="chart-bar-group">
                                  <div className="chart-value">{bar.value}</div>
                                  <div className="chart-bar-shell">
                                    <div
                                      className="chart-bar"
                                      style={{ height: `${(bar.value / max) * 100}%` }}
                                    />
                                  </div>
                                  <div className="chart-label">{bar.label}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {activeStimulus.note && <p className="tab-note">{activeStimulus.note}</p>}
                      </div>
                    )}

                    {activeStimulus.type === 'visual' && (
                      <div className="stimulus-content-card">
                        <h4>{activeStimulus.title || 'Visual'}</h4>
                        {activeStimulus.image ? (
                          <img src={activeStimulus.image} alt="" className="visual-only-image" />
                        ) : (
                          <div className="visual-empty-state">No visual image uploaded yet.</div>
                        )}
                        {activeStimulus.note && <p className="tab-note">{activeStimulus.note}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

      {view === 'assessment' && assessmentMode === 'review' && selectedUnit && (
        <div className="entry-card review-card">
          <div className="review-header">
            <div>
              <h2>Review Screen</h2>
              <p className="page-subtitle">
                Review answered, unanswered, and flagged items before submission.
              </p>
            </div>
            <div className="review-actions">
              <button className="secondary-btn" onClick={() => setAssessmentMode('question')}>
                Back to Questions
              </button>
              <button className="primary-btn" onClick={submitAssessment}>
                Submit Assessment
              </button>
            </div>
          </div>

          <div className="review-grid">
            {reviewItems.map((item, idx) => (
              <button
                key={item.id}
                className={`review-item ${item.answered ? 'answered' : 'unanswered'} ${
                  item.flagged ? 'flagged' : ''
                }`}
                onClick={() => {
                  setCurrentQuestionIndex(idx);
                  setAssessmentMode('question');
                }}
              >
                <span>Q{item.number}</span>
                <small>{item.answered ? 'Answered' : 'Unanswered'}</small>
              </button>
            ))}
          </div>

          <div className="review-summary-row">
            <div className="review-summary-box">
              <span>Answered</span>
              <strong>{reviewItems.filter((x) => x.answered).length}</strong>
            </div>
            <div className="review-summary-box">
              <span>Unanswered</span>
              <strong>{reviewItems.filter((x) => !x.answered).length}</strong>
            </div>
            <div className="review-summary-box">
              <span>Flagged</span>
              <strong>{reviewItems.filter((x) => x.flagged).length}</strong>
            </div>
          </div>
        </div>
      )}

      {view === 'analytics' && (
        <div className="analytics-layout">
          <div className="entry-card analytics-card">
            <h2>Overall Analytics</h2>
            <div className="result-grid">
              <div className="result-box">
                <span>Total Questions</span>
                <strong>{analytics.totalQuestions}</strong>
              </div>
              <div className="result-box">
                <span>Answered</span>
                <strong>{analytics.totalAnswered}</strong>
              </div>
              <div className="result-box">
                <span>Correct</span>
                <strong>{analytics.totalCorrect}</strong>
              </div>
              <div className="result-box accent-result">
                <span>Accuracy</span>
                <strong>{analytics.accuracyRate}%</strong>
              </div>
            </div>

            <div className="result-grid analytics-second-row">
              <div className="result-box">
                <span>Incomplete</span>
                <strong>{analytics.totalQuestions - analytics.totalAnswered}</strong>
              </div>
              <div className="result-box">
                <span>Incorrect</span>
                <strong>{analytics.totalIncorrect}</strong>
              </div>
              <div className="result-box">
                <span>Completion Rate</span>
                <strong>{analytics.completionRate}%</strong>
              </div>
              <div className="result-box">
                <span>Flagged</span>
                <strong>{analytics.totalFlagged}</strong>
              </div>
            </div>
          </div>

          <div className="entry-card analytics-card">
            <h2>Per Unit Analytics</h2>
            <div className="analytics-table-wrap">
              <table className="builder-table">
                <thead>
                  <tr>
                    <th>Unit</th>
                    <th>Total</th>
                    <th>Answered</th>
                    <th>Correct</th>
                    <th>Incorrect</th>
                    <th>Flagged</th>
                    <th>Completion %</th>
                    <th>Accuracy %</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.perUnit.map((row) => (
                    <tr key={row.unitId}>
                      <td>{row.title}</td>
                      <td>{row.total}</td>
                      <td>{row.answered}</td>
                      <td>{row.correct}</td>
                      <td>{row.incorrect}</td>
                      <td>{row.flagged}</td>
                      <td>{row.completionRate}%</td>
                      <td>{row.accuracyRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {view === 'print' && isStudent && (
        <div className="print-layout">
          <div className="print-toolbar no-print">
            <button className="primary-btn" onClick={() => window.print()}>
              Print Now
            </button>
            <button className="secondary-btn" onClick={() => setView('analytics')}>
              Back
            </button>
          </div>

          <div className="print-document">
            <h1 className="print-title">SDO - San Juan City PISA Type Assessment</h1>
            <p className="page-subtitle">Pinaglabanan St, San Juan City</p>

            <div className="print-unit">
              <h2>Student Information</h2>
              <p>
                <strong>Name:</strong> {studentProfile.name || '—'}
              </p>
              <p>
                <strong>School:</strong> {studentProfile.school || '—'}
              </p>
              <p>
                <strong>Grade Level:</strong> {studentProfile.gradeLevel || '—'}
              </p>
              <p>
                <strong>Section:</strong> {studentProfile.section || '—'}
              </p>
            </div>

            <div className="print-unit">
              <h2>Assessment Results</h2>
              <div className="result-grid">
                <div className="result-box">
                  <span>Total Questions</span>
                  <strong>{analytics.totalQuestions}</strong>
                </div>
                <div className="result-box">
                  <span>Answered</span>
                  <strong>{analytics.totalAnswered}</strong>
                </div>
                <div className="result-box">
                  <span>Correct</span>
                  <strong>{analytics.totalCorrect}</strong>
                </div>
                <div className="result-box accent-result">
                  <span>Accuracy</span>
                  <strong>{analytics.accuracyRate}%</strong>
                </div>
              </div>

              <div className="analytics-table-wrap print-section">
                <table className="builder-table">
                  <thead>
                    <tr>
                      <th>Unit</th>
                      <th>Total</th>
                      <th>Answered</th>
                      <th>Correct</th>
                      <th>Incorrect</th>
                      <th>Flagged</th>
                      <th>Completion %</th>
                      <th>Accuracy %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.perUnit.map((row) => (
                      <tr key={row.unitId}>
                        <td>{row.title}</td>
                        <td>{row.total}</td>
                        <td>{row.answered}</td>
                        <td>{row.correct}</td>
                        <td>{row.incorrect}</td>
                        <td>{row.flagged}</td>
                        <td>{row.completionRate}%</td>
                        <td>{row.accuracyRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAdmin && view === 'print' && (
        <div className="print-layout">
          <div className="print-toolbar no-print">
            <button className="primary-btn" onClick={() => window.print()}>
              Print Now
            </button>
            <button className="secondary-btn" onClick={() => setView('admin')}>
              Back
            </button>
          </div>

          <div className="print-document">
            <h1 className="print-title">SDO - San Juan City PISA Type Assessment</h1>

            {units.map((unit) => (
              <div key={unit.id} className="print-unit">
                <h2>{unit.title}</h2>
                <p>
                  <strong>Learning Competencies:</strong> {unit.competency || '—'}
                </p>

                <div className="print-section">
                  <h3>Stimulus Blocks</h3>
                  {unit.stimulusBlocks.map((block) => (
                    <div key={block.id} className="print-block">
                      <h4>
                        {block.label} — {block.title}
                      </h4>

                      {block.type === 'article' && (
                        <>
                          {block.image && <img src={block.image} alt="" className="print-img" />}
                          <p>{block.content || '—'}</p>
                        </>
                      )}

                      {block.type === 'table' && (
                        <>
                          <table className="builder-table print-table">
                            <thead>
                              <tr>
                                {block.headers.map((h, i) => (
                                  <th key={i}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {block.rows.map((row, i) => (
                                <tr key={i}>
                                  {row.map((cell, ci) => (
                                    <td key={ci}>{cell}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {block.note && <p>{block.note}</p>}
                        </>
                      )}

                      {block.type === 'chart' && (
                        <>
                          <table className="builder-table print-table">
                            <thead>
                              <tr>
                                <th>Label</th>
                                <th>Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {block.bars.map((bar) => (
                                <tr key={bar.id}>
                                  <td>{bar.label}</td>
                                  <td>{bar.value}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {block.note && <p>{block.note}</p>}
                        </>
                      )}

                      {block.type === 'visual' && (
                        <>
                          {block.image && <img src={block.image} alt="" className="print-img" />}
                          {block.note && <p>{block.note}</p>}
                        </>
                      )}
                    </div>
                  ))}
                </div>

                <div className="print-section">
                  <h3>Questions</h3>
                  {unit.questions.map((q) => (
                    <div key={q.id} className="print-question">
                      <p>
                        <strong>Q{q.number}.</strong> {q.prompt}
                      </p>
                      {q.image && <img src={q.image} alt="" className="print-img" />}
                      <p>
                        <strong>Type:</strong> {q.type === 'mcq' ? 'Multiple Choice' : 
                       q.type === 'true-false' ? 'True / False' :
                       q.type === 'numerical' ? 'Numerical' :
                       q.type === 'gap-fill' ? 'Gap Fill' :
                       q.type === 'drag-drop' ? 'Drag and Drop' :
                       q.type === 'calc-mcq' ? 'Calculated MCQ' : 'Text Response'}
                      </p>

                      {q.type === 'mcq' && (
                        <ol type="A" className="print-options">
                          {q.options.map((opt, i) => (
                            <li key={i}>{opt}</li>
                          ))}
                        </ol>
                      )}

                      {q.type === 'text' && (
                        <p>
                          <strong>Expected Answer:</strong> {q.sampleAnswer || '—'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {previewUnit && isAdmin && (
        <div className="modal-overlay" onClick={() => setPreviewUnitIndex(null)}>
          <div className="modal-box preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{previewUnit.title}</h2>
                <p className="page-subtitle">Unit Preview</p>
              </div>
              <button className="secondary-btn" onClick={() => setPreviewUnitIndex(null)}>
                Close
              </button>
            </div>

            <div className="preview-section">
              <div className="stimulus-content-card">
                <h4>Learning Competencies</h4>
                <p>{previewUnit.competency || 'No competency added yet.'}</p>
              </div>

              {previewUnit.stimulusBlocks.map((block) => (
                <div key={block.id} className="stimulus-content-card">
                  <h4>
                    {block.label} — {block.title}
                  </h4>

                  {block.type === 'article' && (
                    <>
                      {block.image && <img src={block.image} alt="" className="preview-img" />}
                      <p>{block.content || 'No article content.'}</p>
                    </>
                  )}

                  {block.type === 'table' && (
                    <>
                      <table className="builder-table">
                        <thead>
                          <tr>
                            {block.headers.map((header, i) => (
                              <th key={i}>{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {block.rows.map((row, i) => (
                            <tr key={i}>
                              {row.map((cell, ci) => (
                                <td key={ci}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {block.note && <p className="tab-note">{block.note}</p>}
                    </>
                  )}

                  {block.type === 'chart' && (
                    <>
                      <div className="chart-card">
                        <div className="chart-bars">
                          {block.bars.map((bar) => {
                            const max = Math.max(...block.bars.map((b) => b.value), 1);
                            return (
                              <div key={bar.id} className="chart-bar-group">
                                <div className="chart-value">{bar.value}</div>
                                <div className="chart-bar-shell">
                                  <div
                                    className="chart-bar"
                                    style={{ height: `${(bar.value / max) * 100}%` }}
                                  />
                                </div>
                                <div className="chart-label">{bar.label}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      {block.note && <p className="tab-note">{block.note}</p>}
                    </>
                  )}

                  {block.type === 'visual' && (
                    <>
                      {block.image ? (
                        <img src={block.image} alt="" className="visual-only-image" />
                      ) : (
                        <div className="visual-empty-state">No visual image uploaded yet.</div>
                      )}
                      {block.note && <p className="tab-note">{block.note}</p>}
                    </>
                  )}
                </div>
              ))}

              <div className="stimulus-content-card">
                <h4>Questions Preview</h4>
                <div className="preview-question-list">
                  {previewUnit.questions.map((q) => (
                    <div key={q.id} className="preview-question-card">
                      <strong>Q{q.number}.</strong> <span>{q.prompt || 'No prompt yet.'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}