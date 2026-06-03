import { Routes, Route, Navigate } from "react-router-dom";
import BottomNav from "./components/BottomNav";
import Home from "./pages/Home";
import Courses from "./pages/Courses";
import Tests from "./pages/Tests";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CourseDetail from "./pages/CourseDetail";
import TopicDetail from "./pages/TopicDetail";
import TestScreen from "./pages/TestScreen";
import TestResult from "./pages/TestResult";
import Subscription from "./pages/Subscription";
import Payment from "./pages/Payment";
import PremiumGate from "./pages/PremiumGate";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/tests" element={<Tests />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/course/:courseId" element={<CourseDetail />} />
        <Route path="/course/:courseId/topic/:topicId" element={<TopicDetail />} />
        <Route path="/test/:testId" element={<TestScreen />} />
        <Route path="/test-result" element={<TestResult />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/premium-gate" element={<PremiumGate />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </>
  );
}
