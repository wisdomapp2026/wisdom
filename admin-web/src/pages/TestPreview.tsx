import { useParams, Link } from "react-router-dom";
import { ChevronRight, ArrowLeft } from "lucide-react";

const previewQuestions = [
  {
    id: 1,
    type: "multiple_choice",
    content: "Which of the following numbers is a prime number?",
    options: [
      { label: "A", text: "4" },
      { label: "B", text: "9" },
      { label: "C", text: "13" },
      { label: "D", text: "15" },
    ],
    points: 5,
    time: "2 Min",
    difficulty: "Easy",
  },
  {
    id: 2,
    type: "multiple_choice",
    content: "Solve for x: 3x + 12 = 36. What is the value of x?",
    options: [
      { label: "A", text: "6" },
      { label: "B", text: "8" },
      { label: "C", text: "12" },
      { label: "D", text: "24" },
    ],
    points: 10,
    time: "5 Min",
    difficulty: "Medium",
  },
  {
    id: 3,
    type: "short_answer",
    content: "Explain the Pythagorean theorem and provide a real-life example of how it can be used to calculate distances.",
    points: 15,
    time: "8 Min",
    difficulty: "Hard",
  },
  {
    id: 4,
    type: "true_false",
    content: "A scalene triangle has three sides of different lengths.",
    options: [
      { label: "A", text: "True" },
      { label: "B", text: "False" },
    ],
    points: 5,
    time: "1 Min",
    difficulty: "Easy",
  },
  {
    id: 5,
    type: "multiple_choice",
    content: "If a circle has a radius of 7cm, what is its approximate circumference? (Use π ≈ 3.14)",
    options: [
      { label: "A", text: "21.98 cm" },
      { label: "B", text: "43.96 cm" },
      { label: "C", text: "48 cm" },
      { label: "D", text: "153.86 cm" },
    ],
    points: 10,
    time: "4 Min",
    difficulty: "Medium",
  },
];

const difficultyColors: Record<string, string> = {
  Easy: "text-green-600",
  Medium: "text-yellow-600",
  Hard: "text-red-600",
};

const typeColors: Record<string, string> = {
  multiple_choice: "bg-blue-100 text-blue-700",
  true_false: "bg-purple-100 text-purple-700",
  short_answer: "bg-green-100 text-green-700",
};

const typeLabels: Record<string, string> = {
  multiple_choice: "multiple choice",
  true_false: "true false",
  short_answer: "short answer",
};

export default function TestPreview() {
  const { courseId, testId } = useParams();

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link to="/courses" className="hover:text-primary-500">Courses</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to={`/courses/${courseId}`} className="hover:text-primary-500">Mathematics</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">Preview</span>
        </div>

        {/* Test header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded font-mono">MAT-502</span>
            <span className="text-xs text-gray-500">Draft Version 1.4</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Mathematics Mid-Term Assessment</h1>
          <p className="text-gray-500 mt-1">
            A comprehensive review of mid-term topics including Prime Numbers, Algebra Basics, Geometry, and Pythagorean concepts for Grade 5 students.
          </p>
        </div>

        {/* Question list header */}
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Question List <span className="text-gray-500 font-normal ml-2">{previewQuestions.length} Total</span></h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Sort by:</span>
            <button className="font-medium text-gray-700">Order (1-5)</button>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {previewQuestions.map((q) => (
            <div key={q.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              {/* Question header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {q.id}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[q.type]}`}>
                    {typeLabels[q.type]}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>✏️ {q.points} Points</span>
                  <span>⏱ {q.time}</span>
                  <span className={difficultyColors[q.difficulty]}>{q.difficulty}</span>
                </div>
              </div>

              {/* Question content */}
              <p className="text-gray-900 font-medium mb-4">{q.content}</p>

              {/* Options */}
              {q.type === "multiple_choice" && q.options && (
                <div className="grid grid-cols-2 gap-3">
                  {q.options.map((opt) => (
                    <div key={opt.label} className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-xs font-bold text-gray-500">{opt.label.toLowerCase()}</span>
                      <span className="text-sm text-gray-700">{opt.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {q.type === "true_false" && q.options && (
                <div className="grid grid-cols-2 gap-3">
                  {q.options.map((opt) => (
                    <div key={opt.label} className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-xs font-bold text-gray-500">{opt.label.toLowerCase()}</span>
                      <span className="text-sm text-gray-700">{opt.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {q.type === "short_answer" && (
                <div className="px-4 py-6 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                  <p className="text-sm text-gray-400 italic text-center">Student response area (Text field)</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center py-4">
          <p className="text-sm text-gray-500 mb-2">End of Question List</p>
          <Link to={`/courses/${courseId}/tests/builder`} className="text-sm text-primary-500 hover:underline">
            Add more questions in Builder
          </Link>
        </div>
      </div>

      {/* Right sidebar - Test analytics */}
      <div className="w-72 shrink-0">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sticky top-6">
          <h3 className="font-semibold text-gray-900 mb-4">📊 Test Analytics</h3>

          {/* Difficulty pie chart placeholder */}
          <div className="mb-4">
            <p className="text-xs text-gray-500 uppercase mb-2">Difficulty Balance</p>
            <div className="w-32 h-32 mx-auto rounded-full border-8 border-green-400 relative">
              <div className="absolute inset-0 rounded-full border-8 border-yellow-400" style={{ clipPath: "polygon(0 0, 100% 0, 100% 60%, 0 60%)" }}></div>
            </div>
            <div className="flex items-center justify-center gap-4 mt-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full"></span>Easy</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-500 rounded-full"></span>Medium</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full"></span>Hard</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4 text-center">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Total Time</p>
              <p className="text-lg font-bold text-primary-500">20 Min</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Total Points</p>
              <p className="text-lg font-bold text-primary-500">45</p>
            </div>
          </div>

          {/* Configuration */}
          <div className="space-y-3 text-sm">
            <p className="text-xs text-gray-500 uppercase font-medium">Configuration</p>
            <div className="flex justify-between"><span className="text-gray-500">Grade Level</span><span className="font-medium">Primary 5</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Subject</span><span className="font-medium">Mathematics</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Passing Score</span><span className="font-medium">28 / 45</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Shuffle Questions</span><span className="font-medium">Enabled</span></div>
          </div>

          {/* Actions */}
          <div className="mt-6 space-y-2">
            <button className="w-full btn-primary text-sm">Publish Test</button>
            <Link
              to={`/courses/${courseId}/tests/builder`}
              className="w-full btn-outline text-sm flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Builder
            </Link>
          </div>

          {/* Quick tip */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>Quick Tip:</strong> You can preview how this looks on tablet or mobile by resizing your browser window.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
