import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SplitLayout from '@/pages/SplitLayout';
import './App.css';

/**
 * App — Root component.
 * Local-first mode: single split-screen layout at "/".
 * No auth pages needed.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SplitLayout />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
