import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronRight, ChevronDown, Filter, Search, Eye, Send } from "lucide-react";

// Demo questions from content library
const contentLibrary = [
  {
    id: "q-lib-1",
    content: "Solve for x: 3x + 12 = 36. Show all intermediate steps including the subtraction property.",
    difficulty: "easy",
    time: "3 mins",
    tags: ["Algebra", "Linear Equations"],
  },
  {
    id: "q-lib-2",
    content: "Determine the area of a right-angled triangle where the base is 5cm and the hypotenuse is 13cm.",
    difficulty: "medium",
    time: "5 mins",
    tags: ["Geometry", "Triangles"],
  },
  {
    id: "q-lib-3",
    content: "Compare and contrast the distributive property and the associative property using numerical examples.",
    difficulty: "medium",
    time: "6 mins",
    tags: ["Algebra", "Properties"],
  },
  {
    id: "q-lib-4",
    content: "An airplane flies 400 miles against a wind of 20 mph. Find the speed of the plane in still air.",
    difficulty: "hard",
    time: "10 mins",
    tags: ["Word Problems", "Logic"],
  },
  {
    id: "q-lib-5",
    content: "Simplify the following polynomial: (4x²- 3x + 5) - (2x²+ x - 8).",
    difficulty: "easy",
    time: "4 mins",
    tags: ["Algebra", "Polynomials"],
  },
];

const difficultyColors: Record<string, string> = {
  easy: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  hard: "bg-red-100 text-red-700",
};

// Content library tree
const libraryTree = [
  {
    id: "math-8",
    title: "Mathematics Grade 8",
    children: [
      {
        id: "alg-exp",
        title: "Algebraic Expressions",
        children: [
          { id: "simp-poly", title: "Simplifying Polynomials" },
          { id: "lin-eq", title: "Linear Equations" },
          { id: "word-prob", title: "Word Problems" },
        ],
      },
      { id: "geo-fund", title: "Geometry Fundamentals", children: [] },
    ],
  },
  { id: "sci-phys", title: "Science & Physics", children: [] },
];

export default function TestBuilder() {
  const { courseId } = useParams();
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>(["q-lib-1", "q-lib-2", "q-lib-5"]);
  const [activeTab, setActiveTab] = useState("All Topics");

  const tabs = ["All Topics", "Algebraic Expressions", "Polynomials", "Linear Eq."];

  const toggleQuestion = (id: string) => {
    setSelectedQuestions((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/courses" className="hover:text-primary-500">Courses</Link>
        <ChevronRight className="w-4 h-4" />
        <Link to={`/courses/${courseId}`} className="hover:text-primary-500">Mathematics Grade 8</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">Test Builder</span>
      </div>

      <div className="flex gap-6">
        {/* Left sidebar - Content library */}
        <div className="w-64 shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase">Content Library</h3>
              <button className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                </svg>
              </button>
            </div>
            <div className="space-y-1">
              {libraryTree.map((item) => (
                <div key={item.id}>
                  <button className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-sm font-medium text-gray-900 hover:bg-gray-50">
                    <ChevronDown className="w-3 h-3" />
                    <span>📚</span>
                    {item.title}
                  </button>
                  {item.children?.map((child) => (
                    <div key={child.id} className="ml-4">
                      <button className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-sm text-gray-600 hover:bg-gray-50">
                        <ChevronDown className="w-3 h-3" />
                        <span>📁</span>
                        {child.title}
                      </button>
                      {child.children?.map((sub) => (
                        <button
                          key={sub.id}
                          className="ml-6 flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-sm text-gray-500 hover:bg-gray-50"
                        >
                          <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                          {sub.title}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center - Question explorer */}
        <div className="flex-1">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Question Explorer</h2>
              <div className="flex items-center gap-2">
                <button className="btn-outline text-sm flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filters
                </button>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search within Mathematics..."
                    className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm w-64"
                  />
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 mb-6">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Questions list */}
            <div className="space-y-3">
              {contentLibrary.map((q) => (
                <div
                  key={q.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedQuestions.includes(q.id)
                      ? "border-primary-300 bg-primary-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => toggleQuestion(q.id)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedQuestions.includes(q.id)}
                      onChange={() => toggleQuestion(q.id)}
                      className="mt-1 w-4 h-4 text-primary-500 rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{q.content}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-500">⏱ {q.time}</span>
                        {q.tags.map((tag) => (
                          <span key={tag} className="text-xs text-gray-500">#{tag}</span>
                        ))}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyColors[q.difficulty]}`}>
                      {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center text-sm text-gray-400 mt-4">
              Showing 5 of 124 questions found
            </p>
          </div>
        </div>

        {/* Right sidebar - Assembled test */}
        <div className="w-72 shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Assembled Test</h3>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Draft v1</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">Items</p>
                <p className="text-2xl font-bold text-gray-900">{selectedQuestions.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Duration</p>
                <p className="text-2xl font-bold text-gray-900">12 min</p>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <button className="flex-1 btn-primary text-sm flex items-center justify-center gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button className="flex-1 btn-outline text-sm flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />
                Publish Test
              </button>
            </div>

            {/* Selected questions */}
            <div className="space-y-2">
              {selectedQuestions.map((qId, i) => {
                const q = contentLibrary.find((x) => x.id === qId);
                return q ? (
                  <div key={qId} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                    <span className="text-xs font-bold text-primary-500">Q{i + 1}</span>
                    <div>
                      <p className="text-xs text-gray-600 line-clamp-2">{q.content.slice(0, 50)}...</p>
                      <span className="text-xs text-gray-400">{q.time}</span>
                    </div>
                  </div>
                ) : null;
              })}
            </div>

            {/* Difficulty mix */}
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2">Difficulty Mix:</p>
              <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                <div className="bg-green-500" style={{ width: "40%" }}></div>
                <div className="bg-yellow-500" style={{ width: "40%" }}></div>
                <div className="bg-red-500" style={{ width: "20%" }}></div>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-3">* Test auto-saved at 10:45 AM</p>
          </div>
        </div>
      </div>
    </div>
  );
}
