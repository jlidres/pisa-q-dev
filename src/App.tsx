import { useEffect, useMemo, useRef, useState } from 'react';
import './styles.css';

type QuestionType = 'mcq' | 'text';
type ResponseValue = string | number;

type Question = {
  id: string;
  number: number;
  type: QuestionType;
  prompt: string;
  image?: string;
  options: string[];
  correctAnswer: number;
  sampleAnswer: string;
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

const PROGRESS_STORAGE_KEY = 'pisa_q_dev_progress_v6';
const BUILDER_STORAGE_KEY = 'pisa_q_dev_builder_v3';
const USER_ROLE_STORAGE_KEY = 'pisa_q_dev_user_role_v2';
const STUDENT_PROFILE_STORAGE_KEY = 'pisa_q_dev_student_profile_v2';
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

function loadSavedProgress(): SavedProgress | null {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
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

export default function App() {
  const importRef = useRef<HTMLInputElement | null>(null);

  const [userRole, setUserRole] = useState<UserRole>(loadSavedRole());
  const [studentProfile, setStudentProfile] = useState<StudentProfile>(loadSavedStudentProfile());
  const [studentForm, setStudentForm] = useState<StudentProfile>(loadSavedStudentProfile());
  const [adminPin, setAdminPin] = useState('');
  const [adminPinError, setAdminPinError] = useState('');

  const [view, setView] = useState<'admin' | 'assessment' | 'analytics' | 'print'>('assessment');
  const [assessmentMode, setAssessmentMode] = useState<'question' | 'review'>('question');
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);

  const savedProgress = loadSavedProgress();

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
    async function loadUnits() {
      try {
        // Students always see the published deployed test
        if (userRole === 'student') {
          try {
            const res = await fetch('/test-data.json', { cache: 'no-store' });
            if (res.ok) {
              const json = await res.json();
              if (Array.isArray(json) && json.length > 0) {
                setUnits(json);
                return;
              }
            }
          } catch {
            // ignore and fallback below
          }

          setUnits(createInitialUnits());
          return;
        }

        // Admin/guest prefer local builder draft
        const localBuilder = localStorage.getItem(BUILDER_STORAGE_KEY);
        if (localBuilder) {
          setUnits(JSON.parse(localBuilder));
          return;
        }

        // Then published JSON
        try {
          const res = await fetch('/test-data.json', { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json) && json.length > 0) {
              setUnits(json);
              return;
            }
          }
        } catch {
          // ignore and fallback
        }

        setUnits(createInitialUnits());
      } catch {
        setUnits(createInitialUnits());
      } finally {
        setIsLoadingUnits(false);
      }
    }

    loadUnits();
  }, [userRole]);

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
    const payload: SavedProgress = {
      selectedUnitIndex,
      currentQuestionIndex,
      activeStimulusIndex,
      responses,
      flaggedQuestions,
      timeRemaining,
    };
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(payload));
  }, [
    selectedUnitIndex,
    currentQuestionIndex,
    activeStimulusIndex,
    responses,
    flaggedQuestions,
    timeRemaining,
  ]);

  useEffect(() => {
    if (!units.length) return;
    if (userRole !== 'admin') return;

    setSaveStatus('Saving...');
    const timer = window.setTimeout(() => {
      localStorage.setItem(BUILDER_STORAGE_KEY, JSON.stringify(units));
      setSaveStatus('Saved');
      setBuilderSavedAt(new Date().toLocaleString());
    }, 450);

    return () => window.clearTimeout(timer);
  }, [units, userRole]);

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
    localStorage.setItem(BUILDER_STORAGE_KEY, JSON.stringify(units));
    setSaveStatus('Saved');
    setBuilderSavedAt(new Date().toLocaleString());
  }

  function resetBuilder() {
    const fresh = createInitialUnits();
    setUnits(fresh);
    localStorage.removeItem(BUILDER_STORAGE_KEY);
    setSelectedUnitIndex(0);
    setCurrentQuestionIndex(0);
    setActiveStimulusIndex(0);
    setBuilderSavedAt('');
    setSaveStatus('Saved');
  }

  function resetProgress() {
    setResponses({});
    setFlaggedQuestions([]);
    setSelectedUnitIndex(0);
    setCurrentQuestionIndex(0);
    setActiveStimulusIndex(0);
    setTimeRemaining(DEFAULT_TIME_SECONDS);
    setAssessmentMode('question');
    localStorage.removeItem(PROGRESS_STORAGE_KEY);
  }

  function handleLogout() {
    setUserRole('guest');
    setAdminPin('');
    setAdminPinError('');
  }

  function handleStudentStart() {
    const { name, school, gradeLevel, section } = studentForm;
    if (!name.trim() || !school.trim() || !gradeLevel.trim() || !section.trim()) return;
    setStudentProfile(studentForm);
    setUserRole('student');
    setView('assessment');
  }

  function handleAdminLogin() {
    if (adminPin === ADMIN_PIN) {
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
    a.download = 'test-data.json';
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
    value: string | number | QuestionType
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
              options: nextType === 'mcq' ? q.options : ['', '', '', ''],
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
        const hasAnswer =
          q.type === 'mcq'
            ? typeof response === 'number'
            : typeof response === 'string' && response.trim() !== '';

        if (hasAnswer) {
          answered += 1;

          if (q.type === 'mcq') {
            if (response === q.correctAnswer) correct += 1;
          } else if (typeof response === 'string' && isTextCorrect(response, q.sampleAnswer)) {
            correct += 1;
          }
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
      const hasAnswer =
        q.type === 'mcq'
          ? typeof response === 'number'
          : typeof response === 'string' && response.trim() !== '';

      if (hasAnswer) {
        totalAnswered += 1;
        if (q.type === 'mcq') {
          if (response === q.correctAnswer) totalCorrect += 1;
        } else if (typeof response === 'string' && isTextCorrect(response, q.sampleAnswer)) {
          totalCorrect += 1;
        }
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
    ? selectedUnit.questions.filter((q) => {
        const response = responses[q.id];
        return q.type === 'mcq'
          ? typeof response === 'number'
          : typeof response === 'string' && response.trim() !== '';
      }).length
    : 0;

  const flaggedInUnit = selectedUnit
    ? selectedUnit.questions.filter((q) => flaggedQuestions.includes(q.id)).length
    : 0;

  const unitProgress = useMemo(() => {
    return units.map((unit) => {
      const answered = unit.questions.filter((q) => {
        const response = responses[q.id];
        return q.type === 'mcq'
          ? typeof response === 'number'
          : typeof response === 'string' && response.trim() !== '';
      }).length;

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
        const response = responses[q.id];
        const answered =
          q.type === 'mcq'
            ? typeof response === 'number'
            : typeof response === 'string' && response.trim() !== '';

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
            <p className="save-status">
              {`${saveStatus}${builderSavedAt ? ` • ${builderSavedAt}` : ''}`}
            </p>
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
                </select>

                <div className="field-label">Prompt</div>
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
                {q.image && <img src={q.image} alt="" className="preview-img" />}

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

                {q.type === 'text' && (
                  <>
                    <div className="field-label">Expected / Sample Answer</div>
                    <textarea
                      value={q.sampleAnswer}
                      onChange={(e) =>
                        updateQuestionField(selectedUnitIndex, qIndex, 'sampleAnswer', e.target.value)
                      }
                    />
                  </>
                )}
              </div>
            ))}
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
                      const response = responses[q.id];
                      const isAnswered =
                        q.type === 'mcq'
                          ? typeof response === 'number'
                          : typeof response === 'string' && response.trim() !== '';
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
                      {currentQuestion.type === 'mcq' ? 'Multiple Choice' : 'Text Response'}
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
                    <h3>{currentQuestion.prompt}</h3>

                    {currentQuestion.image && (
                      <img src={currentQuestion.image} alt="" className="preview-img assessment-img" />
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
                        <strong>Type:</strong> {q.type === 'mcq' ? 'Multiple Choice' : 'Text Response'}
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